"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { useToast } from "@/components/toast/Toast";

/**
 * Branch portal sign-in — the split-screen layout from
 * resources/views/admin/pages/login.blade.php, markup and copy unchanged.
 *
 * What is different is underneath: the old page put the branch record into
 * sessionStorage and trusted it, so anyone could type an id in and get a
 * working panel. The response now sets a signed, httpOnly cookie instead.
 */
export function BranchLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [branchId, setBranchId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  async function loginBranch() {
    if (!branchId.trim() || !password) {
      toast.error("Please fill in both fields.");
      return;
    }

    setPending(true);

    try {
      const { data, message } = await api<{ redirect_url: string }>("/api/auth/login", {
        method: "POST",
        body: { branchCode: branchId.trim(), password, portal: "branch" },
        noRedirect: true,
      });

      toast.success(message || "Login successful.");

      // `?next=` is set when the proxy bounces a deep link to the login screen.
      const next = searchParams.get("next");
      router.replace(next?.startsWith("/branch") ? next : (data.redirect_url ?? "/branch"));
      router.refresh();
    } catch (caught) {
      setPending(false);

      if (caught instanceof ApiError) {
        const redirect = caught.payload?.redirect_url;

        if (typeof redirect === "string") {
          toast.info(caught.message || "Redirecting...");
          setTimeout(() => router.push(redirect), 500);
          return;
        }

        toast.error(caught.message || "Login failed.");
        return;
      }

      toast.error("An error occurred. Please try again.");
    }
  }

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left">
        <div className="login-left-glow" />
        <div className="login-left-pattern" />
        <div className="login-left-content">
          <Image
            src="/assets/images/logo/abc_logo.svg"
            alt="ABC Logo"
            width={200}
            height={56}
            priority
            className="login-left-logo"
          />
          <h1 className="login-left-title">Branch Management Portal</h1>
          <p className="login-left-desc">
            Access your branch dashboard to manage students, marksheets, and certifications.
          </p>
          <div className="login-left-features">
            <div className="login-left-feature">
              <div className="login-left-feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"
                  />
                </svg>
              </div>
              <span className="login-left-feature-text">Manage student admissions &amp; records</span>
            </div>
            <div className="login-left-feature">
              <div className="login-left-feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="login-left-feature-text">
                Update marksheets &amp; request certifications
              </span>
            </div>
            <div className="login-left-feature">
              <div className="login-left-feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <span className="login-left-feature-text">Track performance &amp; branch analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <Link href="/" className="login-back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to website
        </Link>

        <div className="login-header-label">Branch Login</div>
        <h2 className="login-header-title">Welcome back</h2>
        <p className="login-header-desc">Enter your branch credentials to continue.</p>

        <div className="login-group">
          <label className="login-label" htmlFor="branchId">
            Branch Code
          </label>
          <div className="login-input-wrap">
            <svg className="login-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <input
              type="text"
              id="branchId"
              className="login-input"
              placeholder="Enter your branch code"
              autoComplete="off"
              autoFocus
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") passwordRef.current?.focus();
              }}
            />
          </div>
        </div>

        <div className="login-group">
          <label className="login-label" htmlFor="password">
            Password
          </label>
          <div className="login-input-wrap">
            <svg className="login-input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <input
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              id="password"
              className="login-input"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loginBranch();
              }}
            />
            <button
              type="button"
              className="login-toggle-pass"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button className="login-submit" disabled={pending} onClick={() => void loginBranch()}>
          {pending ? (
            "Signing in..."
          ) : (
            <>
              Sign In
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </>
          )}
        </button>

        <div className="login-footer">
          <Link href="/">Institute of ABC</Link> &middot; &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
