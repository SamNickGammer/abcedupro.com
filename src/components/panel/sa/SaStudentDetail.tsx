import Link from "next/link";
import type { StudentView } from "@/lib/students";

/**
 * Student detail — ported from
 * resources/views/superadmin/pages/student-detail.blade.php.
 *
 * A server component: the record is already loaded by the page, so everything
 * is in the first HTML with no client fetch and no spinner.
 */

const MARK_ORDER = ["Written Marks", "Practical Marks", "Project Marks", "Viva Marks"];

export function SaStudentDetail({ student }: { student: StudentView }) {
  const status = statusFor(student);

  const marks = Object.entries(student.marks_parsed).sort(
    (a, b) => orderOf(a[0]) - orderOf(b[0]),
  );

  const total = Number(student.total_fees ?? 0);
  const paid = Number(student.paid_fees ?? 0);
  const paidPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const address =
    [student.address, student.city, student.state, student.zip].filter(Boolean).join(", ") || "-";

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: "0 20px" }}>
        {/* Hero */}
        <div className="sa-detail-card" style={{ marginBottom: 20 }}>
          <div style={{ padding: "28px 32px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              <Link href="/admin-abc/students" className="sa-back-link">
                <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                All Students
              </Link>

              <Link
                href={`/admin-abc/students/${student.student_id}/edit`}
                className="sa-primary-action"
              >
                <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Student
              </Link>
            </div>

            <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 130,
                  height: 160,
                  borderRadius: 14,
                  overflow: "hidden",
                  background: "#f3f4f6",
                  flexShrink: 0,
                  border: "2px solid #e5e7eb",
                }}
              >
                {student.student_photo_src ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- remote object-store URL */
                  <img
                    src={student.student_photo_src}
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
                      fontSize: 48,
                      fontWeight: 700,
                      color: "#d1d5db",
                      background: "#f9fafb",
                    }}
                  >
                    {(student.student_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                    {student.student_name}
                  </h1>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "5px 14px",
                      borderRadius: 20,
                      background: status.bg,
                      color: status.color,
                    }}
                  >
                    {status.text}
                  </span>
                </div>

                <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 6px" }}>
                  {student.registration_number}
                </p>

                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 20px" }}>
                  <svg
                    width={12}
                    height={12}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ display: "inline", verticalAlign: -2, marginRight: 4 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
                    />
                  </svg>
                  <Link
                    href={`/admin-abc/branches/${student.branch_id}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {student.branch_name} ({student.branch_code})
                  </Link>
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  <Pill label="Admission" value={student.admission_date} />
                  <Pill label="Relieving" value={student.relieving_date} />
                  <Pill label="Course" value={student.short_form || student.course_name} />
                  <Pill label="Marksheet ID" value={student.marksheet_id || "-"} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Personal */}
          <div className="sa-detail-card">
            <div className="sa-detail-inner">
              <h2 className="sa-detail-title">Personal Information</h2>
              <Row label="Father's Name" value={student.student_father_name} />
              <Row label="Mother's Name" value={student.student_mother_name} />
              <Row label="Date of Birth" value={student.dob} />
              <Row label="Phone" value={student.student_phone} />
              <Row label="Email" value={student.student_email} />
              <Row label="Aadhaar" value={student.aadhaar_number} />

              <div style={{ paddingTop: 16, marginTop: 4, borderTop: "1px solid #f3f4f6" }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  Address
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.6 }}>{address}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Fees */}
            <div className="sa-detail-card">
              <div className="sa-detail-inner">
                <h2 className="sa-detail-title">Fee Details</h2>
                <Row label="Total Fees" value={money(student.total_fees)} valueStyle={{ fontSize: 15 }} />
                <Row label="Paid Fees" value={money(student.paid_fees)} valueStyle={{ color: "#16a34a" }} />
                <Row
                  label="Due Fees"
                  value={money(student.due_fees)}
                  valueStyle={{ color: "#ef4444" }}
                  last
                />
                <div
                  style={{
                    width: "100%",
                    background: "#f3f4f6",
                    borderRadius: 6,
                    height: 8,
                    marginTop: 16,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#22c55e",
                      height: "100%",
                      borderRadius: 6,
                      width: `${paidPercent}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Academic */}
            <div className="sa-detail-card" style={{ flex: 1 }}>
              <div className="sa-detail-inner">
                <h2 className="sa-detail-title">Academic Details</h2>
                <Row label="Marksheet Stage" value={titleCase(student.marksheet_stage)} />
                <Row
                  label="Overall Percentage"
                  value={student.overall_percent === null ? "-" : `${student.overall_percent}%`}
                />
                <Row label="Performance" value={student.performance} />
                <Row
                  label="Certificate Approved"
                  value={student.is_certificate_approve ? "Yes" : "No"}
                />
                <Row label="Certified Date" value={student.certified_date} />
              </div>
            </div>
          </div>

          {/* Marks */}
          {marks.length > 0 ? (
            <div className="sa-detail-card" style={{ gridColumn: "1/-1" }}>
              <div className="sa-detail-inner">
                <h2 className="sa-detail-title">Marks Breakdown</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {marks.map(([subject, value]) => (
                    <div key={subject} className="sa-mark-card">
                      <div className="sa-mark-card-label">{subject}</div>
                      <div className="sa-mark-card-score">
                        {value}
                        <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 400 }}>/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Documents */}
          {student.is_certificate_approve || student.marksheet_stage === "verified" ? (
            <div className="sa-detail-card" style={{ gridColumn: "1/-1" }}>
              <div className="sa-detail-inner">
                <h2 className="sa-detail-title">Documents</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {student.is_certificate_approve ? (
                    <>
                      <a
                        href={`/print/certificate/${student.student_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="sa-cert-btn sa-cert-btn-primary"
                      >
                        View Certificate
                      </a>
                      <a
                        href={`/api/documents/certificate/${student.student_id}`}
                        className="sa-cert-btn sa-cert-btn-outline"
                      >
                        Download PDF
                      </a>
                    </>
                  ) : null}
                  {student.marksheet_stage === "verified" ? (
                    <>
                      <a
                        href={`/print/marksheet/${student.student_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="sa-cert-btn sa-cert-btn-secondary"
                      >
                        View Marksheet
                      </a>
                      <a
                        href={`/api/documents/marksheet/${student.student_id}`}
                        className="sa-cert-btn sa-cert-btn-outline"
                      >
                        Download PDF
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- pieces

function Pill({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="sa-info-pill">
      <div className="sa-info-pill-label">{label}</div>
      <div className="sa-info-pill-value">{value || "-"}</div>
    </div>
  );
}

function Row({
  label,
  value,
  valueStyle,
  last,
}: {
  label: string;
  value: string | number | null;
  valueStyle?: React.CSSProperties;
  last?: boolean;
}) {
  return (
    <div className="sa-detail-row" style={last ? { borderBottom: "none" } : undefined}>
      <span className="sa-detail-row-label">{label}</span>
      <span className="sa-detail-row-value" style={valueStyle}>
        {value === null || value === "" ? "-" : value}
      </span>
    </div>
  );
}

export function statusFor(student: {
  is_certificate_approve: boolean;
  marksheet_stage: string;
  is_student_active: boolean;
}) {
  if (student.is_certificate_approve) return { text: "Certified", bg: "#dbeafe", color: "#1d4ed8" };
  if (student.marksheet_stage === "verified")
    return { text: "Verified", bg: "#f3e8ff", color: "#7c3aed" };
  if (student.marksheet_stage === "pending")
    return { text: "Pending", bg: "#fef9c3", color: "#a16207" };
  if (student.is_student_active) return { text: "Active", bg: "#dcfce7", color: "#15803d" };
  return { text: "Inactive", bg: "#fee2e2", color: "#dc2626" };
}

function money(value: number | null) {
  if (value === null) return "-";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function orderOf(subject: string) {
  const index = MARK_ORDER.indexOf(subject);
  return index === -1 ? MARK_ORDER.length : index;
}
