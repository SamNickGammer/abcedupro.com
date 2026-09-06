"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/use-api";
import { query } from "@/lib/client";
import type { BranchRow, StudentRow } from "@/types/api";
import type { Pagination } from "@/components/panel/DataTable";
import { Skeleton } from "@/components/panel/sa/Spinner";

/**
 * All students — ported from
 * resources/views/superadmin/pages/all-students.blade.php: same columns, same
 * filters on one row, same Previous/Next pagination.
 *
 * The Blade version blanked the table and showed a single centred spinner on
 * every keystroke, so the page appeared to empty out while you typed. Here the
 * table keeps its shape: skeleton rows on the first load, and on later
 * requests the current rows stay put and dim slightly until the new page
 * arrives.
 */

const STATUSES = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Marksheet Pending" },
  { value: "verified", label: "Verified" },
  { value: "certified", label: "Certified" },
] as const;

const COLUMNS = [
  "Reg No",
  "Student Name",
  "Father Name",
  "Branch",
  "Course",
  "Phone",
  "Admission",
  "Status",
];

export function SaStudents() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debounced, branchId, status]);

  const path = `/api/students${query({
    search: debounced,
    status,
    branch_id: branchId === "all" ? "" : branchId,
    page,
    per_page: 20,
  })}`;

  const { data, extra, loading, error } = useApi<StudentRow[]>(path);
  const { data: branches } = useApi<BranchRow[]>("/api/branches");

  const pagination = extra.pagination as Pagination | undefined;

  // Keep the previous page visible while the next one loads, so the table does
  // not collapse to nothing between requests.
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
    <div className="sa-students-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>All Students</h1>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          {showSkeleton ? (
            <Skeleton width={90} height={13} />
          ) : (
            <>
              <span style={{ fontWeight: 700 }}>
                {(pagination?.total ?? rows.length).toLocaleString("en-IN")}
              </span>{" "}
              students
            </>
          )}
        </div>
      </div>

      {/* Search and both filters on one line, as in the original. */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", width: 300 }}>
          <input
            type="text"
            className="sa-stu-input"
            placeholder="Search by name, parents, reg no, phone..."
            aria-label="Search students"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: "100%", paddingRight: 34 }}
          />
          {refreshing ? (
            <span
              aria-hidden
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 13,
                height: 13,
                border: "2px solid #e5e7eb",
                borderTopColor: "#6b7280",
                borderRadius: "50%",
                animation: "sa-spin 0.7s linear infinite",
              }}
            />
          ) : null}
        </div>

        <select
          className="sa-stu-select"
          aria-label="Filter by branch"
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
        >
          <option value="all">All Branches</option>
          {branches
            ?.filter((branch) => branch.role !== "admin")
            .map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.branchName} ({branch.branchCode})
              </option>
            ))}
        </select>

        <select
          className="sa-stu-select"
          aria-label="Filter by status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

      {!showSkeleton && rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>No students found</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Try changing your filters.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="sa-stu-table">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody
              style={{
                opacity: refreshing ? 0.45 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {showSkeleton
                ? Array.from({ length: 12 }, (_, index) => (
                    <tr key={`skeleton-${index}`}>
                      {COLUMNS.map((column, cell) => (
                        <td key={column}>
                          <Skeleton
                            width={cell === 7 ? 62 : `${[70, 88, 80, 92, 46, 84, 70][cell] ?? 70}%`}
                            height={cell === 7 ? 18 : 11}
                            style={cell === 7 ? { borderRadius: 20 } : undefined}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((student) => <StudentRowView key={student.student_id} student={student} />)}
            </tbody>
          </table>

          {pagination && pagination.total > 0 && !showSkeleton ? (
            <div className="sa-stu-pagination">
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Showing {pagination.from ?? 0}&ndash;{pagination.to ?? 0} of{" "}
                {pagination.total.toLocaleString("en-IN")} &middot; page {pagination.current_page} of{" "}
                {pagination.last_page}
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
  );
}

function StudentRowView({ student }: { student: StudentRow }) {
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
      <td style={{ whiteSpace: "nowrap" }}>{student.registration_number}</td>
      <td>
        <Link
          href={`/admin-abc/students/${student.student_id}`}
          style={{ fontWeight: 700, color: "#111", textDecoration: "none" }}
        >
          {student.student_name || "-"}
        </Link>
      </td>
      <td>{student.student_father_name || "-"}</td>
      <td>{student.branch_name || "-"}</td>
      <td>{student.short_form || student.course_name || "-"}</td>
      <td style={{ whiteSpace: "nowrap" }}>{student.student_phone || "-"}</td>
      <td style={{ whiteSpace: "nowrap" }}>{student.admission_date || "-"}</td>
      <td>
        <span className="sa-stu-badge" style={{ background: status.bg, color: status.color }}>
          {status.text}
        </span>
      </td>
    </tr>
  );
}
