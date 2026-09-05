"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast/Toast";

/**
 * Student verification — ported from resources/views/pages/studentInfo.blade.php.
 *
 * Markup, class names, copy and behaviour are unchanged: the hero, the search
 * card overlapping it, the loading state, and a result with the four tabs
 * (Student Info / Academic / Branch / Fees). `?rn=` and `?dob=` still pre-fill
 * and auto-search, and the URL is still rewritten as you search and reset —
 * that URL is printed and QR-coded onto every certificate in circulation.
 */

type VerifiedStudent = {
  student_name: string | null;
  registration_number: string | null;
  student_father_name: string | null;
  student_mother_name: string | null;
  dob: string | null;
  student_phone: string | null;
  student_email: string | null;
  aadhaar_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  student_photo: string | null;
  total_fees: number | null;
  paid_fees: number | null;
  due_fees: number | null;
  marksheet_id: string | null;
  marks: string | null;
  marksheet_stage: "started" | "pending" | "verified";
  overall_percent: number | null;
  performance: string | null;
  course_name: string | null;
  short_form: string | null;
  course_duration: number | null;
  branch_name: string | null;
  branch_code: string | null;
  branch_address_line1: string | null;
  branch_city: string | null;
  branch_state: string | null;
  branch_zip: number | null;
  branch_phone: string | null;
};

const DEFAULT_AVATAR = "/assets/images/default_avatar.jpg";

const TABS = [
  { id: "info", label: "Student Info" },
  { id: "academic", label: "Academic" },
  { id: "branch", label: "Branch" },
  { id: "fees", label: "Fees" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function StudentVerification({
  initialRegNo,
  initialDob,
}: {
  initialRegNo: string;
  initialDob: string;
}) {
  const toast = useToast();

  const [regNo, setRegNo] = useState(initialRegNo);
  const [dob, setDob] = useState(initialDob);
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<VerifiedStudent | null>(null);
  const [tab, setTab] = useState<TabId>("info");

  const search = useCallback(
    async (searchRegNo: string, searchDob: string) => {
      const trimmed = searchRegNo.trim();

      if (!trimmed || !searchDob) {
        toast.error("Please enter both Registration Number and Date of Birth.");
        return;
      }

      // Keep the URL shareable, exactly as the original did.
      history.replaceState(
        null,
        "",
        `/student_info?rn=${encodeURIComponent(trimmed)}&dob=${encodeURIComponent(searchDob)}`,
      );

      setLoading(true);
      setStudent(null);

      try {
        const response = await fetch("/api/public/student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registration_number: trimmed, dob: searchDob }),
        });

        const result = (await response.json()) as
          | { error: false; data: VerifiedStudent }
          | { error: true; message: string };

        if (result.error) {
          toast.error(result.message || "Student not found.");
          reset();
          return;
        }

        setStudent(result.data);
        setTab("info");
      } catch {
        toast.error("Network error. Please try again.");
        reset();
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  function reset() {
    setStudent(null);
    setLoading(false);
    history.replaceState(null, "", "/student_info");
  }

  // A certificate's printed link arrives with both values, so the visitor sees
  // the record rather than a form they have to submit again.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    if (initialRegNo && initialDob) {
      autoRan.current = true;
      void search(initialRegNo, initialDob);
    }
  }, [initialRegNo, initialDob, search]);

  const showSearch = !loading && !student;

  return (
    <>
      {/* ===== HERO ===== */}
      <div className="sv-hero">
        <div className="sv-hero-glow" />
        <div className="sv-hero-label font-HellixSB">Verify Your Records</div>
        <h1 className="sv-hero-title font-HellixB">Student Verification</h1>
        <p className="sv-hero-desc font-HellixR">
          Search and verify student information using your registration number and date of birth.
        </p>
      </div>

      {/* ===== SEARCH ===== */}
      <div className="sv-search-wrap" style={{ display: showSearch ? "block" : "none" }}>
        <div className="sv-search-card">
          <div className="sv-search-title font-HellixB">Find Your Record</div>
          <div className="sv-search-desc font-HellixR">
            Enter your registration number and date of birth to view details.
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void search(regNo, dob);
            }}
          >
            <div className="sv-input-row">
              <div className="sv-input-group">
                <label className="sv-input-label font-HellixSB" htmlFor="svRegNo">
                  Registration No *
                </label>
                <input
                  type="text"
                  id="svRegNo"
                  className="sv-input"
                  placeholder="e.g. C/0101XXXX"
                  value={regNo}
                  onChange={(event) => setRegNo(event.target.value)}
                />
              </div>
              <div className="sv-input-group">
                <label className="sv-input-label font-HellixSB" htmlFor="svDob">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  id="svDob"
                  className="sv-input"
                  value={dob}
                  onChange={(event) => setDob(event.target.value)}
                />
              </div>
            </div>
            <button className="sv-search-btn font-HellixSB" type="submit">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search Student
            </button>
          </form>
        </div>
      </div>

      {/* ===== LOADING ===== */}
      <div className="sv-loading" style={{ display: loading ? "block" : "none" }}>
        <div className="sv-spinner" />
        <div className="font-HellixR" style={{ color: "#9ca3af", fontSize: 14 }}>
          Searching student records...
        </div>
      </div>

      {/* ===== RESULT ===== */}
      {student ? (
        <Result student={student} tab={tab} onTab={setTab} onReset={reset} />
      ) : null}

      {/* Spacer when only search is shown */}
      <div style={{ height: 60, display: showSearch ? "block" : "none" }} />
    </>
  );
}

function Result({
  student,
  tab,
  onTab,
  onReset,
}: {
  student: VerifiedStudent;
  tab: TabId;
  onTab: (tab: TabId) => void;
  onReset: () => void;
}) {
  const verified = student.marksheet_stage === "verified";
  const marks = parseMarks(student.marks);

  return (
    <div className="sv-result" style={{ display: "block" }}>
      <button className="sv-back-btn font-HellixR" onClick={onReset}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Search Again
      </button>

      {/* Profile Header */}
      <div className="sv-profile">
        <div className="sv-profile-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote object-store URL, sized by CSS */}
          <img
            className="sv-profile-photo"
            src={student.student_photo || DEFAULT_AVATAR}
            alt="Student"
            onError={(event) => {
              event.currentTarget.src = DEFAULT_AVATAR;
            }}
          />
          {student.marksheet_id ? (
            <div className="sv-profile-marksheet font-HellixB">
              # {student.marksheet_id}
            </div>
          ) : null}
        </div>
        <div className="sv-profile-info">
          <div className="sv-profile-name font-HellixB">{student.student_name || "-"}</div>
          <div className="sv-profile-reg font-HellixR">{student.registration_number || "-"}</div>
          <div className="sv-profile-badges">
            {verified ? (
              <>
                <span className="sv-badge sv-badge-green font-HellixSB">
                  <Tick />
                  Certificate Verified
                </span>
                <span className="sv-badge sv-badge-blue font-HellixSB">
                  <Tick />
                  Marksheet Verified
                </span>
              </>
            ) : (
              <span className="sv-badge sv-badge-red font-HellixSB">
                Certificate Not Provided
              </span>
            )}
            {student.short_form ? (
              <span className="sv-badge sv-badge-gray font-HellixSB">{student.short_form}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sv-tabs-bar">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            className={`sv-tab font-HellixSB${tab === entry.id ? " active" : ""}`}
            onClick={() => onTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/* Student Info */}
      <div className={`sv-tab-content${tab === "info" ? " active" : ""}`}>
        <div className="sv-info-grid">
          <div className="sv-info-card">
            <div className="sv-info-card-title font-HellixSB">Personal Information</div>
            <InfoRow label="Name" value={student.student_name} bold />
            <InfoRow label="Registration No" value={student.registration_number} bold />
            <InfoRow label="Email" value={student.student_email} />
            <InfoRow label="Phone" value={student.student_phone} />
            <InfoRow label="Date of Birth" value={student.dob} />
          </div>
          <div className="sv-info-card">
            <div className="sv-info-card-title font-HellixSB">Family &amp; Address</div>
            <InfoRow label="Father's Name" value={student.student_father_name} bold />
            <InfoRow label="Mother's Name" value={student.student_mother_name} bold />
            <InfoRow label="Address" value={student.address} />
            <InfoRow label="City" value={student.city} />
            <InfoRow
              label="State"
              value={`${student.state || "-"}${student.zip ? ` - ${student.zip}` : ""}`}
            />
          </div>
        </div>

        {student.aadhaar_number ? (
          <div className="sv-aadhaar" style={{ display: "flex" }}>
            <svg className="sv-aadhaar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"
              />
            </svg>
            <div>
              <div className="sv-aadhaar-label font-HellixSB">Aadhaar Number</div>
              <div className="sv-aadhaar-num font-HellixB">{student.aadhaar_number}</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Academic */}
      <div className={`sv-tab-content${tab === "academic" ? " active" : ""}`}>
        {verified && marks ? (
          <div>
            <div className="sv-marks-course font-HellixSB">
              {student.course_name || ""} ({student.short_form || ""}) -{" "}
              {student.course_duration || ""} Months
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <table className="sv-marks-table">
                <thead>
                  <tr>
                    <th className="font-HellixB">Subject</th>
                    <th className="font-HellixB">Marks</th>
                    <th className="font-HellixB">Percentage</th>
                    <th className="font-HellixB">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(marks).map(([subject, value]) => {
                    const score = Number(value);
                    const pass = score >= 40;

                    return (
                      <tr key={subject}>
                        <td className="font-HellixR">{subject}</td>
                        <td className="font-HellixSB">{score}</td>
                        <td className="font-HellixR">{score}%</td>
                        <td>
                          <span
                            className={`sv-marks-status ${pass ? "sv-marks-pass" : "sv-marks-fail"} font-HellixSB`}
                          >
                            {pass ? "Pass" : "Fail"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="sv-marks-summary">
              <div className="sv-marks-summary-item">
                <div className="sv-marks-summary-val font-HellixB">
                  {student.overall_percent ?? "-"}%
                </div>
                <div className="sv-marks-summary-label font-HellixR">Overall</div>
              </div>
              <div className="sv-marks-summary-item">
                <div className="sv-marks-summary-val font-HellixB">
                  {student.performance || "-"}
                </div>
                <div className="sv-marks-summary-label font-HellixR">Performance</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="sv-marks-empty" style={{ display: "block" }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div className="font-HellixB" style={{ fontSize: 16, color: "#6b7280" }}>
              Marksheet Not Available
            </div>
            <div className="font-HellixR" style={{ fontSize: 13 }}>
              The marksheet has not been verified yet for this student.
            </div>
          </div>
        )}
      </div>

      {/* Branch */}
      <div className={`sv-tab-content${tab === "branch" ? " active" : ""}`}>
        <div className="sv-info-card">
          <div className="sv-info-card-title font-HellixSB">Branch Information</div>
          <div>
            {(
              [
                ["Branch Name", student.branch_name],
                ["Branch Code", student.branch_code],
                ["Address", student.branch_address_line1],
                ["City", student.branch_city],
                ["State", student.branch_state],
                ["ZIP", student.branch_zip],
                ["Phone", student.branch_phone],
              ] as Array<[string, string | number | null]>
            ).map(([label, value]) => (
              <div className="sv-branch-row" key={label}>
                <span className="sv-branch-label font-HellixR">{label}</span>
                <span className="sv-branch-value font-HellixSB">{value || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fees */}
      <div className={`sv-tab-content${tab === "fees" ? " active" : ""}`}>
        <div className="sv-fee-grid">
          <div className="sv-fee-card sv-fee-card-green">
            <div className="sv-fee-label font-HellixSB">Total Fees</div>
            <div className="sv-fee-amount font-HellixB">&#8377;{student.total_fees ?? 0}</div>
          </div>
          <div className="sv-fee-card sv-fee-card-blue">
            <div className="sv-fee-label font-HellixSB">Paid Fees</div>
            <div className="sv-fee-amount font-HellixB">&#8377;{student.paid_fees ?? 0}</div>
          </div>
          <div className="sv-fee-card sv-fee-card-orange">
            <div className="sv-fee-label font-HellixSB">Due Fees</div>
            <div className="sv-fee-amount font-HellixB">
              &#8377;{student.due_fees ?? student.total_fees ?? 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string | number | null;
  bold?: boolean;
}) {
  return (
    <div className="sv-info-row">
      <span className="sv-info-label font-HellixR">{label}</span>
      <span className={`sv-info-value ${bold ? "font-HellixSB" : "font-HellixR"}`}>
        {value || "-"}
      </span>
    </div>
  );
}

function Tick() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
    </svg>
  );
}

function parseMarks(raw: string | null): Record<string, number> | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const entries = Object.entries(parsed as Record<string, unknown>);
    return entries.length === 0 ? null : Object.fromEntries(entries.map(([k, v]) => [k, Number(v)]));
  } catch {
    return null;
  }
}
