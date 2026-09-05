"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@/lib/use-api";
import { Card, Field, SectionHeading, inputClass } from "@/components/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/site/icons";

/**
 * Creating a franchise centre. The password is shown once on success and never
 * stored in clear — the legacy code hard-coded "123456789" for every new branch
 * and kept it in a `pass` column beside the hash.
 */
export function BranchForm() {
  const router = useRouter();
  const { run, pending, error, fieldErrors } = useMutation();
  const [issued, setIssued] = useState<{ code: string; password: string; id: number } | null>(null);

  const [form, setForm] = useState({
    branch_code: "",
    branch_name: "",
    first_name: "",
    last_name: "",
    phone: "",
    email_id: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "Bihar",
    zip: "",
    credit: "0",
    credit_per_certificate: "200",
    initial_password: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const result = await run<{ id: number; branchCode: string }>("/api/branches", {
      method: "POST",
      body: {
        ...form,
        branch_code: form.branch_code.toUpperCase(),
        initial_password: form.initial_password || undefined,
      },
    });

    if (result.ok) {
      setIssued({
        id: result.data.id,
        code: result.data.branchCode,
        password: String(result.extra.initial_password ?? ""),
      });
    }
  }

  if (issued) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-emerald-200 bg-emerald-50/60">
          <h1 className="text-lg font-bold tracking-tight text-emerald-900">Branch created</h1>
          <p className="mt-1 text-sm text-emerald-800">
            Hand these credentials to the branch manager now — the password is shown once and cannot
            be retrieved later. You can always set a new one from the branch page.
          </p>

          <dl className="mt-5 space-y-2 rounded-xl bg-white p-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-neutral-500">Branch code</dt>
              <dd className="font-mono text-base font-bold uppercase text-neutral-900">
                {issued.code}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-neutral-500">Password</dt>
              <dd className="font-mono text-base font-bold text-neutral-900">{issued.password}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                navigator.clipboard?.writeText(`Branch code: ${issued.code}\nPassword: ${issued.password}`)
              }
            >
              Copy credentials
            </Button>
            <ButtonLink href={`/admin-abc/branches/${issued.id}`}>Open branch</ButtonLink>
            <ButtonLink href="/admin-abc/branches" variant="ghost">
              All branches
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <SectionHeading
        eyebrow="Head office"
        title="New branch"
        description="Create a franchise centre and issue its first set of credentials."
        actions={
          <ButtonLink href="/admin-abc/branches" variant="secondary">
            Cancel
          </ButtonLink>
        }
      />

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-semibold text-red-800">{error}</p>
          {Object.keys(fieldErrors).length > 0 ? (
            <ul className="mt-1.5 list-inside list-disc text-sm text-red-700">
              {Object.entries(fieldErrors).map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Centre
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Branch code"
            htmlFor="branch_code"
            error={fieldErrors.branch_code}
            hint="Prefixes every registration number, e.g. PAT0001"
            required
          >
            <input
              id="branch_code"
              required
              maxLength={10}
              value={form.branch_code}
              onChange={(event) => set("branch_code", event.target.value.toUpperCase())}
              className={`${inputClass} font-mono uppercase`}
            />
          </Field>
          <Field label="Branch name" htmlFor="branch_name" error={fieldErrors.branch_name} required>
            <input
              id="branch_name"
              required
              value={form.branch_name}
              onChange={(event) => set("branch_name", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Phone" htmlFor="phone" error={fieldErrors.phone} required>
            <input
              id="phone"
              required
              inputMode="tel"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Manager first name" htmlFor="first_name" error={fieldErrors.first_name} required>
            <input
              id="first_name"
              required
              value={form.first_name}
              onChange={(event) => set("first_name", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Manager last name" htmlFor="last_name">
            <input
              id="last_name"
              value={form.last_name}
              onChange={(event) => set("last_name", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email" htmlFor="email_id" error={fieldErrors.email_id} required>
            <input
              id="email_id"
              type="email"
              required
              value={form.email_id}
              onChange={(event) => set("email_id", event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Address
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Address line 1" htmlFor="address_line1" error={fieldErrors.address_line1} required className="sm:col-span-2">
            <input
              id="address_line1"
              required
              value={form.address_line1}
              onChange={(event) => set("address_line1", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Address line 2" htmlFor="address_line2" className="sm:col-span-2">
            <input
              id="address_line2"
              value={form.address_line2}
              onChange={(event) => set("address_line2", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="City" htmlFor="city" error={fieldErrors.city} required>
            <input
              id="city"
              required
              value={form.city}
              onChange={(event) => set("city", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="State" htmlFor="state" error={fieldErrors.state} required>
            <input
              id="state"
              required
              value={form.state}
              onChange={(event) => set("state", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="PIN code" htmlFor="zip" error={fieldErrors.zip} required>
            <input
              id="zip"
              required
              inputMode="numeric"
              value={form.zip}
              onChange={(event) => set("zip", event.target.value.replace(/\D/g, ""))}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Credits & access
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Opening credit balance" htmlFor="credit" error={fieldErrors.credit}>
            <input
              id="credit"
              type="number"
              min={0}
              value={form.credit}
              onChange={(event) => set("credit", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Credits per certificate"
            htmlFor="credit_per_certificate"
            hint="Charged once per marksheet"
          >
            <input
              id="credit_per_certificate"
              type="number"
              min={0}
              value={form.credit_per_certificate}
              onChange={(event) => set("credit_per_certificate", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Initial password"
            htmlFor="initial_password"
            error={fieldErrors.initial_password}
            hint="Leave blank to generate a random one"
          >
            <input
              id="initial_password"
              minLength={6}
              value={form.initial_password}
              onChange={(event) => set("initial_password", event.target.value)}
              placeholder="Auto-generate"
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Spinner className="h-4 w-4 animate-spin" />
              Creating
            </>
          ) : (
            "Create branch"
          )}
        </Button>
        <ButtonLink href="/admin-abc/branches" variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
