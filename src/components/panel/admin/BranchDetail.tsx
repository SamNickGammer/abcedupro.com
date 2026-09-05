"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@/lib/use-api";
import { Badge, Card, DataRow, Field, SectionHeading, StatTile, inputClass } from "@/components/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CoinIcon } from "@/components/panel/icons";
import { Spinner } from "@/components/site/icons";

type Branch = {
  id: number;
  branchCode: string;
  branchName: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  emailId: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: number;
  role: string;
  active: boolean;
  credit: number;
  creditPerCertificate: number;
  centerCreationDate: string;
};

type Charge = { id: number; amount: number; reason: string | null; createdAt: string };

export function BranchDetail({
  branch,
  stats,
  charges,
}: {
  branch: Branch;
  stats: { total: number; pending: number; certified: number };
  charges: Charge[];
}) {
  const router = useRouter();
  const affordable = Math.floor(branch.credit / Math.max(1, branch.creditPerCertificate));

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow={branch.branchCode}
        title={branch.branchName}
        description={`${branch.city}, ${branch.state} · opened ${branch.centerCreationDate}`}
        actions={
          <>
            {branch.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>}
            <ButtonLink
              href={`/admin-abc/students?branch=${branch.id}`}
              variant="secondary"
            >
              View students
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Students" value={stats.total} />
        <StatTile
          label="Awaiting approval"
          value={stats.pending}
          tone={stats.pending ? "amber" : "neutral"}
        />
        <StatTile label="Certified" value={stats.certified} tone="green" />
        <StatTile
          label="Credits"
          value={branch.credit.toLocaleString("en-IN")}
          tone={affordable === 0 ? "red" : affordable <= 2 ? "amber" : "green"}
          hint={`${affordable} more certificate${affordable === 1 ? "" : "s"} at ${branch.creditPerCertificate} each`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Contact
          </h2>
          <dl>
            <DataRow
              label="Manager"
              value={`${branch.firstName} ${branch.lastName ?? ""}`.trim()}
            />
            <DataRow
              label="Phone"
              value={
                <a href={`tel:${branch.phone}`} className="hover:underline">
                  {branch.phone}
                </a>
              }
            />
            <DataRow
              label="Email"
              value={
                <a href={`mailto:${branch.emailId}`} className="hover:underline">
                  {branch.emailId}
                </a>
              }
            />
            <DataRow
              label="Address"
              value={[branch.addressLine1, branch.addressLine2, branch.city, branch.state, branch.zip]
                .filter(Boolean)
                .join(", ")}
            />
          </dl>
        </Card>

        <AddCreditCard branch={branch} onDone={() => router.refresh()} />
        <AccessCard branch={branch} onDone={() => router.refresh()} />
      </div>

      <Card>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Recent credit deductions
        </h2>
        {charges.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No credits have been spent yet. A deduction is recorded each time a branch creates a
            student&apos;s first marksheet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {charges.map((charge) => (
              <li key={charge.id} className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-neutral-800">
                    {charge.reason ?? "Certificate charge"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(charge.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-red-600">
                  −{charge.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AddCreditCard({ branch, onDone }: { branch: Branch; onDone: () => void }) {
  const { run, pending, error } = useMutation();
  const [amount, setAmount] = useState("");
  const [done, setDone] = useState<number | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();

    const result = await run<{ new_credit: number }>(`/api/branches/${branch.id}/credit`, {
      method: "POST",
      body: { credit_to_add: Number(amount) },
    });

    if (result.ok) {
      setDone(result.data.new_credit);
      setAmount("");
      onDone();
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        Add credits
      </h2>

      <form onSubmit={add} className="space-y-3">
        <Field label="Amount" htmlFor="credit_to_add">
          <input
            id="credit_to_add"
            type="number"
            min={1}
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
            placeholder="e.g. 1000"
          />
        </Field>

        <div className="flex flex-wrap gap-1.5">
          {[1000, 2000, 5000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-200"
            >
              +{preset.toLocaleString("en-IN")}
            </button>
          ))}
        </div>

        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
        {done !== null ? (
          <p className="text-[13px] font-medium text-emerald-700">
            Balance is now {done.toLocaleString("en-IN")} credits.
          </p>
        ) : null}

        <Button type="submit" variant="brand" disabled={pending} className="w-full">
          {pending ? <Spinner className="h-4 w-4 animate-spin" /> : <CoinIcon className="h-4 w-4" />}
          Add credits
        </Button>
      </form>
    </Card>
  );
}

function AccessCard({ branch, onDone }: { branch: Branch; onDone: () => void }) {
  const { run, pending, error } = useMutation();
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  async function setNewPassword(event: React.FormEvent) {
    event.preventDefault();
    const result = await run(`/api/branches/${branch.id}/password`, {
      method: "POST",
      body: { new_password: password },
    });

    if (result.ok) {
      setSaved(true);
      setPassword("");
    }
  }

  async function toggleActive() {
    const result = await run(`/api/branches/${branch.id}/status`, {
      method: "POST",
      body: { active: !branch.active },
    });

    if (result.ok) {
      setConfirmSuspend(false);
      onDone();
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        Access
      </h2>

      <form onSubmit={setNewPassword} className="space-y-3">
        <Field
          label="Set a new password"
          htmlFor="new_password"
          hint="Tell the manager directly — it is stored only as a hash."
        >
          <input
            id="new_password"
            type="text"
            minLength={6}
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setSaved(false);
            }}
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setPassword(randomPassword());
              setSaved(false);
            }}
            className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-200"
          >
            Generate
          </button>
          {password ? (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(password)}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-200"
            >
              Copy
            </button>
          ) : null}
        </div>

        {saved ? (
          <p className="text-[13px] font-medium text-emerald-700">
            Password updated. The branch must sign in again.
          </p>
        ) : null}

        <Button type="submit" variant="secondary" disabled={pending} className="w-full">
          Update password
        </Button>
      </form>

      <div className="mt-5 border-t border-neutral-100 pt-4">
        {error ? <p className="mb-2 text-[13px] text-red-600">{error}</p> : null}

        <Button
          variant={branch.active ? (confirmSuspend ? "danger" : "secondary") : "success"}
          disabled={pending}
          onClick={() => (branch.active && !confirmSuspend ? setConfirmSuspend(true) : toggleActive())}
          className="w-full"
        >
          {pending ? (
            <Spinner className="h-4 w-4 animate-spin" />
          ) : branch.active ? (
            confirmSuspend ? (
              "Confirm — suspend this branch"
            ) : (
              "Suspend branch"
            )
          ) : (
            "Reactivate branch"
          )}
        </Button>
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
          {branch.active
            ? "A suspended branch cannot sign in, and any open session stops working immediately. Its student records are kept."
            : "This branch cannot currently sign in."}
        </p>
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        Need to correct a student&apos;s record?{" "}
        <Link href="/admin-abc/students" className="underline hover:text-neutral-600">
          Find them here
        </Link>
        .
      </p>
    </Card>
  );
}

function randomPassword() {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}
