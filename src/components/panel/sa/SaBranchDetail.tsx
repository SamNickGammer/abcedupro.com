"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi, useMutation } from "@/lib/use-api";
import { query } from "@/lib/client";
import { useToast } from "@/components/toast/Toast";
import type { StudentRow } from "@/types/api";
import type { Pagination } from "@/components/panel/DataTable";
import { Skeleton } from "@/components/panel/sa/Spinner";

/**
 * Branch detail — ported from
 * resources/views/superadmin/pages/branch-detail.blade.php: the dark hero with
 * the manager photograph, the contact strip, four stat cards, Quick Actions,
 * Branch Details and Credit & Billing, and the branch's student list.
 *
 * The student list is paginated. The Blade page loaded every student the branch
 * had in one request — 1,409 rows for the largest branch — which is what made
 * it slow to open.
 */

export type BranchDetailData = {
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
  image: string | null;
  imageUrl: string | null;
  role: string;
  active: boolean;
  credit: number;
  creditPerCertificate: number;
  centerCreationDate: string;
  createdAt: string;
  totalStudents: number;
  certifiedStudents: number;
  pendingStudents: number;
};

export function SaBranchDetail({ branch: initial }: { branch: BranchDetailData }) {
  const router = useRouter();
  const toast = useToast();

  const [branch, setBranch] = useState(initial);
  const [modal, setModal] = useState<"credit" | "password" | null>(null);

  const manager = `${branch.firstName} ${branch.lastName ?? ""}`.trim();

  return (
    <div style={{ padding: "0 12px 40px" }}>
      {/* Hero */}
      <div className="bd-card" style={{ marginBottom: 20 }}>
        <div
          style={{
            background: "linear-gradient(135deg,#111 0%,#1f2937 100%)",
            padding: "32px 36px",
            color: "#fff",
            position: "relative",
            borderRadius: "16px 16px 0 0",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{ position: "absolute", top: 0, right: 0, width: 200, height: "100%", opacity: 0.05 }}
          >
            <svg viewBox="0 0 200 200" fill="white">
              <circle cx="150" cy="50" r="120" />
            </svg>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              position: "relative",
              zIndex: 1,
              gap: 16,
            }}
          >
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.2)",
                  flexShrink: 0,
                  background: "rgba(255,255,255,0.1)",
                }}
              >
                {branch.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- remote object-store URL */
                  <img
                    src={branch.imageUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {branch.branchName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{branch.branchName}</h1>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: branch.active ? "#dcfce7" : "#fee2e2",
                      color: branch.active ? "#15803d" : "#dc2626",
                    }}
                  >
                    {branch.active ? "Active" : "Suspended"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>
                  {branch.branchCode}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  Manager: {manager || "-"}
                </div>
              </div>
            </div>

            <Link
              href="/admin-abc/branches"
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.55)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
              }}
            >
              <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Branches
            </Link>
          </div>
        </div>

        <div style={{ padding: "20px 36px", display: "flex", gap: 28, flexWrap: "wrap" }}>
          <Contact icon="mail" value={branch.emailId} href={`mailto:${branch.emailId}`} />
          <Contact icon="phone" value={branch.phone} href={`tel:${branch.phone}`} />
          <Contact
            icon="pin"
            value={[branch.addressLine1, branch.city, branch.state].filter(Boolean).join(", ")}
          />
        </div>
      </div>

      {/* Stats */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}
      >
        <Stat
          value={branch.totalStudents}
          label="Students"
          bg="#eff6ff"
          fg="#2563eb"
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <Stat
          value={branch.certifiedStudents}
          label="Certified"
          bg="#f0fdf4"
          fg="#16a34a"
          valueColor="#16a34a"
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <Stat
          value={branch.pendingStudents}
          label="Pending"
          bg="#fef9c3"
          fg="#ca8a04"
          valueColor="#ca8a04"
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <Stat
          value={branch.credit}
          label="Credits"
          bg="#f0fdf4"
          fg="#16a34a"
          valueColor="#16a34a"
          icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </div>

      {/* Quick actions */}
      <div className="bd-card" style={{ marginBottom: 20 }}>
        <div className="bd-inner">
          <h2 className="bd-title">Quick Actions</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="bd-action-btn"
              style={{ background: "#eff6ff", color: "#2563eb" }}
              onClick={() => setModal("credit")}
            >
              <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Credit
            </button>

            <button
              type="button"
              className="bd-action-btn"
              style={{ background: "#fef9c3", color: "#a16207" }}
              onClick={() => setModal("password")}
            >
              <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              Reset Password
            </button>

            <ToggleStatusButton
              branch={branch}
              onDone={(active, ended) => {
                setBranch((current) => ({ ...current, active }));
                toast.success(
                  active
                    ? "Branch reactivated."
                    : `Branch deactivated.${ended ? ` ${ended} session(s) ended.` : ""}`,
                );
                router.refresh();
              }}
            />
          </div>
        </div>
      </div>

      {/* Details + billing */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}
      >
        <div className="bd-card">
          <div className="bd-inner">
            <h2 className="bd-title">Branch Details</h2>
            <Row label="Branch Code" value={branch.branchCode} />
            <Row label="Branch Name" value={branch.branchName} />
            <Row label="Manager" value={manager || "-"} />
            <Row label="Phone" value={branch.phone} />
            <Row label="Email" value={branch.emailId} />
            <Row
              label="Address"
              value={[branch.addressLine1, branch.addressLine2].filter(Boolean).join(", ")}
            />
            <Row label="City / State / ZIP" value={`${branch.city}, ${branch.state}, ${branch.zip}`} />
          </div>
        </div>

        <div className="bd-card">
          <div className="bd-inner">
            <h2 className="bd-title">Credit &amp; Billing</h2>
            <Row
              label="Current Credit"
              value={branch.credit.toLocaleString("en-IN")}
              valueStyle={{ fontSize: 18, color: "#16a34a" }}
            />
            <Row label="Per Certificate Cost" value={`${branch.creditPerCertificate} credits`} />
            <Row label="Status" value={branch.active ? "Active" : "Suspended"} />
            <Row label="Created" value={branch.centerCreationDate} />
            <Row
              label="Certificates Affordable"
              value={Math.floor(branch.credit / Math.max(1, branch.creditPerCertificate))}
            />
          </div>
        </div>
      </div>

      <BranchStudents branchId={branch.id} total={branch.totalStudents} />

      {modal === "credit" ? (
        <AddCreditModal
          branchId={branch.id}
          branchName={branch.branchName}
          credit={branch.credit}
          perCertificate={branch.creditPerCertificate}
          onClose={() => setModal(null)}
          onDone={(newCredit) => {
            setBranch((current) => ({ ...current, credit: newCredit }));
            setModal(null);
            toast.success("Credit added.");
            router.refresh();
          }}
        />
      ) : null}

      {modal === "password" ? (
        <ResetPasswordModal
          branchId={branch.id}
          branchName={branch.branchName}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------- pieces

function Contact({ icon, value, href }: { icon: "mail" | "phone" | "pin"; value: string; href?: string }) {
  const paths = {
    mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    phone:
      "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
    pin: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
  };

  const content = (
    <>
      <svg
        width={12}
        height={12}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{ display: "inline", verticalAlign: -2, marginRight: 4 }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[icon]} />
      </svg>
      {value}
    </>
  );

  return href ? (
    <a href={href} style={{ fontSize: 12, color: "#6b7280", textDecoration: "none" }}>
      {content}
    </a>
  ) : (
    <span style={{ fontSize: 12, color: "#6b7280" }}>{content}</span>
  );
}

function Stat({
  value,
  label,
  bg,
  fg,
  valueColor,
  icon,
}: {
  value: number;
  label: string;
  bg: string;
  fg: string;
  valueColor?: string;
  icon: string;
}) {
  return (
    <div className="bd-stat">
      <div className="bd-stat-icon" style={{ background: bg, color: fg }}>
        <svg width={20} height={20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div>
        <div className="bd-stat-val" style={valueColor ? { color: valueColor } : undefined}>
          {value.toLocaleString("en-IN")}
        </div>
        <div className="bd-stat-label">{label}</div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string | number;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="bd-row">
      <span className="bd-row-label">{label}</span>
      <span className="bd-row-value" style={valueStyle}>
        {value === "" ? "-" : value}
      </span>
    </div>
  );
}

function ToggleStatusButton({
  branch,
  onDone,
}: {
  branch: BranchDetailData;
  onDone: (active: boolean, sessionsEnded: number) => void;
}) {
  const { run, pending } = useMutation();
  const [confirming, setConfirming] = useState(false);

  async function toggle() {
    const result = await run<unknown>(`/api/branches/${branch.id}/status`, {
      method: "POST",
      body: { active: !branch.active },
    });

    if (result.ok) {
      const data = result.data as { active: boolean; sessions_ended?: number };
      onDone(data.active, data.sessions_ended ?? 0);
      setConfirming(false);
    }
  }

  return (
    <button
      type="button"
      className="bd-action-btn"
      disabled={pending}
      style={
        branch.active
          ? { background: "#fee2e2", color: "#dc2626" }
          : { background: "#dcfce7", color: "#15803d" }
      }
      onClick={() => (branch.active && !confirming ? setConfirming(true) : toggle())}
      onBlur={() => setConfirming(false)}
    >
      <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
      {pending
        ? "Working..."
        : branch.active
          ? confirming
            ? "Confirm — sign this branch out"
            : "Deactivate"
          : "Activate"}
    </button>
  );
}

export function AddCreditModal({
  branchId,
  branchName,
  credit,
  perCertificate,
  onClose,
  onDone,
}: {
  branchId: number;
  branchName: string;
  credit: number;
  perCertificate: number;
  onClose: () => void;
  onDone: (newCredit: number) => void;
}) {
  const { run, pending, error } = useMutation();
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const result = await run<{ new_credit: number }>(`/api/branches/${branchId}/credit`, {
      method: "POST",
      body: { credit_to_add: Number(amount) },
    });

    if (result.ok) onDone(result.data.new_credit);
  }

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;

  return (
    <div
      className="bd-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bd-modal" role="dialog" aria-modal="true">
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Add Credit</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 8px" }}>{branchName}</p>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Current Credit
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>
            {credit.toLocaleString("en-IN")}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="bd-credit-amount"
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Amount to Add
          </label>
          <input
            id="bd-credit-amount"
            type="number"
            min={1}
            autoFocus
            className="bd-modal-input"
            placeholder="Enter amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && valid) void submit();
            }}
          />

          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {[1000, 2000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#4b5563",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                +{preset.toLocaleString("en-IN")}
              </button>
            ))}
          </div>

          {valid ? (
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>
              New balance {(credit + value).toLocaleString("en-IN")} —{" "}
              {Math.floor((credit + value) / Math.max(1, perCertificate))} certificates.
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            style={{
              margin: "0 0 12px",
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: 12,
            }}
          >
            {error}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="button" className="bd-modal-btn bd-modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="bd-modal-btn bd-modal-btn-go"
            disabled={pending || !valid}
            onClick={submit}
          >
            {pending ? "Adding..." : "Add Credit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({
  branchId,
  branchName,
  onClose,
}: {
  branchId: number;
  branchName: string;
  onClose: () => void;
}) {
  const { run, pending, error } = useMutation();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const result = await run<unknown>(`/api/branches/${branchId}/password`, {
      method: "POST",
      body: { new_password: password },
    });

    if (result.ok) {
      setSaved(true);
      toast.success("Password updated. That branch has been signed out.");
    }
  }

  function generate() {
    const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    setPassword(Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(""));
    setSaved(false);
  }

  return (
    <div
      className="bd-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bd-modal" role="dialog" aria-modal="true">
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Reset Password</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>{branchName}</p>

        <label
          htmlFor="bd-new-password"
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          New Password
        </label>
        <input
          id="bd-new-password"
          type="text"
          minLength={6}
          autoFocus
          className="bd-modal-input"
          placeholder="Enter a new password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setSaved(false);
          }}
        />

        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button
            type="button"
            onClick={generate}
            style={{
              background: "#f3f4f6",
              border: "none",
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
              color: "#4b5563",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Generate
          </button>
          {password ? (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(password)}
              style={{
                background: "#f3f4f6",
                border: "none",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#4b5563",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Copy
            </button>
          ) : null}
        </div>

        <p style={{ fontSize: 11, color: "#9ca3af", margin: "10px 0 0" }}>
          Tell the manager directly — it is stored only as a hash and cannot be read back.
          Saving signs that branch out everywhere.
        </p>

        {error ? (
          <p
            style={{
              margin: "12px 0 0",
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: 12,
            }}
          >
            {error}
          </p>
        ) : null}

        {saved ? (
          <p style={{ margin: "12px 0 0", fontSize: 12, fontWeight: 700, color: "#15803d" }}>
            Password updated.
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" className="bd-modal-btn bd-modal-btn-cancel" onClick={onClose}>
            {saved ? "Done" : "Cancel"}
          </button>
          <button
            type="button"
            className="bd-modal-btn bd-modal-btn-go"
            disabled={pending || password.length < 6}
            onClick={submit}
          >
            {pending ? "Saving..." : "Set Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- students

const STUDENT_COLUMNS = ["Reg No", "Name", "Course", "Phone", "Admission", "Status"];

function BranchStudents({ branchId, total }: { branchId: number; total: number }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debounced]);

  const { data, extra, loading } = useApi<StudentRow[]>(
    `/api/students${query({ branch_id: branchId, search: debounced, page, per_page: 20 })}`,
  );

  const pagination = extra.pagination as Pagination | undefined;

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [everLoaded, setEverLoaded] = useState(false);

  useEffect(() => {
    if (data) {
      setRows(data);
      setEverLoaded(true);
    }
  }, [data]);

  const showSkeleton = loading && !everLoaded;
  const refreshing = loading && everLoaded;

  return (
    <div className="bd-card">
      <div className="bd-inner">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            Students ({(pagination?.total ?? total).toLocaleString("en-IN")})
          </h2>
          <input
            type="search"
            className="bd-modal-input"
            placeholder="Search students..."
            aria-label="Search this branch's students"
            style={{ width: 240 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {!showSkeleton && rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
            <p style={{ fontSize: 13, margin: 0 }}>
              {debounced ? "No students match that search." : "No students in this branch."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="bd-table">
              <thead>
                <tr>
                  {STUDENT_COLUMNS.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ opacity: refreshing ? 0.45 : 1, transition: "opacity 0.15s" }}>
                {showSkeleton
                  ? Array.from({ length: 8 }, (_, row) => (
                      <tr key={row}>
                        {STUDENT_COLUMNS.map((column, cell) => (
                          <td key={column}>
                            <Skeleton
                              height={cell === 5 ? 18 : 11}
                              width={cell === 5 ? 62 : `${[72, 88, 46, 78, 70][cell] ?? 70}%`}
                              style={cell === 5 ? { borderRadius: 20 } : undefined}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  : rows.map((student) => <StudentRowView key={student.student_id} student={student} />)}
              </tbody>
            </table>

            {pagination && pagination.last_page > 1 && !showSkeleton ? (
              <div className="sa-stu-pagination">
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Showing {pagination.from ?? 0}&ndash;{pagination.to ?? 0} of{" "}
                  {pagination.total.toLocaleString("en-IN")} &middot; page {pagination.current_page}{" "}
                  of {pagination.last_page}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="sa-stu-page-btn"
                    disabled={pagination.current_page <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="sa-stu-page-btn"
                    disabled={pagination.current_page >= pagination.last_page || loading}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentRowView({ student }: { student: StudentRow }) {
  const href = `/admin-abc/students/${student.student_id}`;

  const status = student.is_certificate_approve
    ? { text: "Certified", bg: "#dbeafe", color: "#1d4ed8" }
    : student.marksheet_stage === "verified"
      ? { text: "Verified", bg: "#f3e8ff", color: "#7c3aed" }
      : student.marksheet_stage === "pending"
        ? { text: "Pending", bg: "#fef9c3", color: "#a16207" }
        : student.is_student_active
          ? { text: "Active", bg: "#dcfce7", color: "#15803d" }
          : { text: "Inactive", bg: "#fee2e2", color: "#dc2626" };

  return (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>
        <Link href={href} className="sa-stu-link">
          {student.registration_number}
        </Link>
      </td>
      <td>
        <Link href={href} className="sa-stu-link">
          {student.student_name}
        </Link>
      </td>
      <td>{student.short_form || student.course_name}</td>
      <td style={{ whiteSpace: "nowrap" }}>{student.student_phone}</td>
      <td style={{ whiteSpace: "nowrap" }}>{student.admission_date}</td>
      <td>
        <span className="bd-badge" style={{ background: status.bg, color: status.color }}>
          {status.text}
        </span>
      </td>
    </tr>
  );
}
