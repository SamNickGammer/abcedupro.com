"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { useToast } from "@/components/toast/Toast";

/**
 * Head-office sign-in — the glass card from
 * resources/views/superadmin/pages/login.blade.php, markup and copy unchanged.
 *
 * The old page checked `data.role !== 'admin'` in the browser, which is a
 * check the browser could simply skip. The API now refuses a non-admin at this
 * portal before any session is issued.
 */
export function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function loginAdmin() {
    if (!adminId.trim() || !password) {
      toast.error("Please fill in both fields.");
      return;
    }

    setPending(true);

    try {
      const { data } = await api<{ redirect_url: string }>("/api/auth/login", {
        method: "POST",
        body: { branchCode: adminId.trim(), password, portal: "superadmin" },
        noRedirect: true,
      });

      toast.success("Welcome, Admin.");

      const next = searchParams.get("next");
      const destination = next?.startsWith("/admin-abc")
        ? next
        : (data.redirect_url ?? "/admin-abc");

      setTimeout(() => {
        router.replace(destination);
        router.refresh();
      }, 500);
    } catch (caught) {
      setPending(false);
      toast.error(
        caught instanceof ApiError
          ? caught.message || "Invalid credentials."
          : "Connection error. Please try again.",
      );
    }
  }

  return (
    <div className="sa-login-bg">
      <div className="sa-login-card">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Image
            src="/assets/images/logo/abc_logo.svg"
            alt="Institute of ABC"
            width={140}
            height={40}
            priority
            style={{
              height: 40,
              width: "auto",
              filter: "brightness(0) invert(1)",
              marginBottom: 16,
              display: "inline-block",
            }}
          />
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>
            Admin Portal
          </h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>
            Authorized access only
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loginAdmin();
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <label className="sa-login-label" htmlFor="adminId">
              Admin ID
            </label>
            <input
              type="text"
              id="adminId"
              className="sa-login-input"
              placeholder="Enter admin ID"
              autoComplete="off"
              autoFocus
              value={adminId}
              onChange={(event) => setAdminId(event.target.value)}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label className="sa-login-label" htmlFor="adminPassword">
              Password
            </label>
            <input
              type="password"
              id="adminPassword"
              className="sa-login-input"
              placeholder="Enter password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button type="submit" className="sa-login-btn" disabled={pending}>
            {pending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link
            href="/branch/login"
            style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, textDecoration: "none" }}
          >
            Branch Login &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
