"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { Field, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/site/icons";
import { SITE } from "@/lib/site-config";

/**
 * Shared by both portals. `portal` decides which accounts may sign in here:
 * the API refuses an admin at the branch door and a branch at the admin door,
 * and hands back the right place to go instead.
 */
export function LoginScreen({
  portal,
  title,
  subtitle,
  fallbackRedirect,
}: {
  portal: "branch" | "superadmin";
  title: string;
  subtitle: string;
  fallbackRedirect: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [branchCode, setBranchCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const { data } = await api<{ redirect_url: string }>("/api/auth/login", {
        method: "POST",
        body: { branchCode, password, portal },
        noRedirect: true,
      });

      // `?next=` is set by the proxy when it bounces a deep link to login.
      const next = searchParams.get("next");
      const destination = next?.startsWith("/") ? next : (data.redirect_url ?? fallbackRedirect);

      router.replace(destination);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);

        // Signing in at the wrong door: send them to the right one.
        const redirect = caught.payload?.redirect_url;
        if (typeof redirect === "string") {
          setTimeout(() => router.push(redirect), 1400);
        }
      } else {
        setError("Could not reach the server. Please check your connection.");
      }
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center" aria-label={SITE.name}>
          <Image
            src="/assets/images/logo/abc_logo.svg"
            alt={SITE.name}
            width={180}
            height={56}
            priority
            className="h-14 w-auto"
          />
        </Link>

        <div className="rounded-2xl border border-black/[0.07] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_48px_-24px_rgba(0,0,0,0.25)]">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-neutral-500">{subtitle}</p>

          <form onSubmit={submit} className="space-y-4">
            <Field label={portal === "superadmin" ? "Username" : "Branch code"} htmlFor="branchCode" required>
              <input
                id="branchCode"
                name="branchCode"
                required
                autoFocus
                autoCapitalize="characters"
                autoComplete="username"
                spellCheck={false}
                value={branchCode}
                onChange={(event) => setBranchCode(event.target.value)}
                className={inputClass}
                placeholder={portal === "superadmin" ? "admin" : "e.g. PAT"}
              />
            </Field>

            <Field label="Password" htmlFor="password" required>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClass} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-neutral-500 hover:text-neutral-800"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] font-medium text-red-700"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" disabled={pending} className="w-full">
              {pending ? (
                <>
                  <Spinner className="h-4 w-4 animate-spin" />
                  Signing in
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-neutral-500">
          {portal === "branch" ? (
            <>
              Head office?{" "}
              <Link href="/admin-abc/login" className="font-semibold text-neutral-800 hover:underline">
                Admin sign in
              </Link>
            </>
          ) : (
            <>
              Running a centre?{" "}
              <Link href="/branch/login" className="font-semibold text-neutral-800 hover:underline">
                Branch sign in
              </Link>
            </>
          )}
        </p>
        <p className="mt-2 text-center text-[13px] text-neutral-400">
          <Link href="/" className="hover:text-neutral-600 hover:underline">
            ← Back to the website
          </Link>
        </p>
      </div>
    </main>
  );
}
