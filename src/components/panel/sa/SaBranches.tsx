"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/use-api";
import type { BranchRow } from "@/types/api";
import { Skeleton } from "@/components/panel/sa/Spinner";
import { AddCreditModal } from "@/components/panel/sa/SaBranchDetail";

/**
 * Branch list — the manager photograph, the credit balance, and an Add Credit
 * action on each row.
 *
 * Topping up was previously two navigations away: open the branch, then find
 * the button. It is the most frequent thing head office does here, so it is on
 * the row.
 */
export function SaBranches() {
  const router = useRouter();
  const { data, loading, error, refresh } = useApi<BranchRow[]>("/api/branches");

  const [search, setSearch] = useState("");
  const [crediting, setCrediting] = useState<BranchRow | null>(null);

  const term = search.trim().toLowerCase();

  // A handful of branches, so filtering in the browser beats a round trip.
  const rows = (data ?? [])
    .filter((branch) => branch.role.toLowerCase() !== "admin")
    .filter(
      (branch) =>
        !term ||
        branch.branchName.toLowerCase().includes(term) ||
        branch.branchCode.toLowerCase().includes(term) ||
        branch.city.toLowerCase().includes(term) ||
        `${branch.firstName} ${branch.lastName ?? ""}`.toLowerCase().includes(term),
    );

  return (
    <div className="sa-students-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Branches</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            type="search"
            className="sa-stu-input"
            placeholder="Search by name, code, city or manager"
            aria-label="Search branches"
            style={{ width: 280 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Link href="/admin-abc/branches/new" className="sa-primary-action">
            <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
            </svg>
            New Branch
          </Link>
        </div>
      </div>

      {error ? (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 13,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table className="bd-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Manager</th>
              <th>Location</th>
              <th>Students</th>
              <th style={{ textAlign: "right" }}>Credits</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 9 }, (_, row) => (
                  <tr key={row}>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Skeleton width={36} height={36} style={{ borderRadius: 10, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <Skeleton width="62%" height={11} style={{ marginBottom: 5 }} />
                          <Skeleton width="34%" height={9} />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 6 }, (_, cell) => (
                      <td key={cell}>
                        <Skeleton height={11} width={`${[80, 70, 40, 46, 60, 70][cell]}%`} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((branch) => (
                  <BranchRowView
                    key={branch.id}
                    branch={branch}
                    onAddCredit={() => setCrediting(branch)}
                  />
                ))}
          </tbody>
        </table>

        {!loading && rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
            <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              {term ? "No branches match that search" : "No branches yet"}
            </p>
          </div>
        ) : null}
      </div>

      {crediting ? (
        <AddCreditModal
          branchId={crediting.id}
          branchName={crediting.branchName}
          credit={crediting.credit}
          perCertificate={crediting.creditPerCertificate}
          onClose={() => setCrediting(null)}
          onDone={() => {
            setCrediting(null);
            refresh();
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function BranchRowView({
  branch,
  onAddCredit,
}: {
  branch: BranchRow;
  onAddCredit: () => void;
}) {
  const href = `/admin-abc/branches/${branch.id}`;
  const manager = `${branch.firstName} ${branch.lastName ?? ""}`.trim();

  // Red once a branch cannot afford a single certificate, amber when it is
  // close — the number matters more than the balance itself.
  const affordable = Math.floor(branch.credit / Math.max(1, branch.creditPerCertificate));
  const creditColor = affordable === 0 ? "#dc2626" : affordable <= 2 ? "#ca8a04" : "#16a34a";

  return (
    <tr>
      <td>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              overflow: "hidden",
              background: "#f3f4f6",
              flexShrink: 0,
              border: "1px solid #e5e7eb",
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
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#9ca3af",
                }}
              >
                {branch.branchName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <Link href={href} className="sa-stu-link">
              {branch.branchName}
            </Link>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{branch.branchCode}</div>
          </div>
        </div>
      </td>

      <td>
        <div>{manager || "-"}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{branch.phone}</div>
      </td>

      <td style={{ whiteSpace: "nowrap" }}>
        {branch.city}, {branch.state}
      </td>

      <td style={{ whiteSpace: "nowrap" }}>
        <Link href={href} style={{ color: "#111", textDecoration: "none", fontWeight: 700 }}>
          {branch.totalStudents.toLocaleString("en-IN")}
        </Link>
      </td>

      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: 700, color: creditColor }} title={`${affordable} certificates`}>
          {branch.credit.toLocaleString("en-IN")}
        </span>
      </td>

      <td>
        <span
          className="bd-badge"
          style={
            branch.active
              ? { background: "#dcfce7", color: "#15803d" }
              : { background: "#fee2e2", color: "#dc2626" }
          }
        >
          {branch.active ? "Active" : "Suspended"}
        </span>
      </td>

      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <button type="button" className="bd-inline-credit" onClick={onAddCredit}>
          <svg width={13} height={13} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Credit
        </button>
      </td>
    </tr>
  );
}
