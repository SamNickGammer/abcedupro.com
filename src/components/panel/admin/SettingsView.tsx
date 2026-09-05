"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@/lib/use-api";
import { Card, Field, SectionHeading, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/site/icons";

/**
 * The admin's own credentials. Changing them ends the session, because the
 * password that signed it is no longer the password on the account.
 */
export function SettingsView({ username }: { username: string }) {
  const router = useRouter();
  const { run, pending, error, fieldErrors } = useMutation();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const result = await run("/api/auth/change-password", {
      method: "POST",
      body: { currentPassword: current, newPassword: next },
    });

    if (result.ok) {
      setDone(true);
      setTimeout(() => {
        router.replace("/admin-abc/login");
        router.refresh();
      }, 1600);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <SectionHeading
        eyebrow="Head office"
        title="Settings"
        description="Your administrator sign-in details."
      />

      <Card>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Account
        </h2>
        <dl className="rounded-xl bg-neutral-50 px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[13px] text-neutral-500">Username</dt>
            <dd className="font-mono text-sm font-semibold text-neutral-900">{username}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Change password
        </h2>
        <p className="mb-5 text-sm text-neutral-500">
          You will be signed out and asked to sign in again with the new password.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Current password"
            htmlFor="current"
            error={fieldErrors.currentPassword}
            required
          >
            <input
              id="current"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="New password" htmlFor="next" error={fieldErrors.newPassword} required>
            <input
              id="next"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Confirm new password"
            htmlFor="confirm"
            error={confirm && confirm !== next ? "Passwords do not match." : undefined}
            required
          >
            <input
              id="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={inputClass}
            />
          </Field>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {error}
            </p>
          ) : null}

          {done ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-800">
              Password changed. Redirecting you to sign in…
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={pending || done || (confirm !== "" && confirm !== next)}
          >
            {pending ? (
              <>
                <Spinner className="h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              "Change password"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
