"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { useMutation } from "@/lib/use-api";
import { useToast } from "@/components/toast/Toast";
import type { StudentView } from "@/lib/students";

/**
 * "Edit Certificate Data" — ported from the fragile-data modal in
 * resources/views/superadmin/pages/edit-student.blade.php, including the
 * warning, the live total/percentage/performance summary, and the second
 * modal that re-asks for the admin password before saving.
 *
 * The password step is the point: this rewrites a document already in
 * circulation, so it is deliberately harder to do by accident than an ordinary
 * edit.
 */

const DEFAULT_SUBJECTS = ["Written Marks", "Practical Marks", "Project Marks", "Viva Marks"];

export function SaCertificateModal({
  student,
  onClose,
  onSaved,
}: {
  student: StudentView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { run, pending, error } = useMutation();

  const subjects = student.course_subjects.length ? student.course_subjects : DEFAULT_SUBJECTS;

  const [certifiedDate, setCertifiedDate] = useState(student.certified_date ?? "");
  const [marksheetId, setMarksheetId] = useState(student.marksheet_id ?? "");
  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      subjects.map((subject) => [
        subject,
        student.marks_parsed[subject] === undefined ? "" : String(student.marks_parsed[subject]),
      ]),
    ),
  );

  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") (askPassword ? setAskPassword(false) : onClose());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [askPassword, onClose]);

  // Recomputed as you type, so the effect on the printed document is visible
  // before it is saved.
  const summary = useMemo(() => {
    const values = subjects.map((subject) => Number(marks[subject]));
    const filled = values.every((value) => Number.isFinite(value) && marks[subjects[values.indexOf(value)]] !== "");

    const obtained = values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
    const possible = subjects.length * 100;
    const percent = possible > 0 ? Math.round(((obtained / possible) * 100 + Number.EPSILON) * 100) / 100 : 0;

    const performance =
      percent >= 85 ? "Excellent" : percent >= 60 ? "Very Good" : percent >= 30 ? "Good" : "Failure";

    return { obtained, possible, percent, performance, filled };
  }, [marks, subjects]);

  async function useNextMarksheetId() {
    try {
      const { data } = await api<{ marksheet_id: string }>("/api/students/next-marksheet-id");
      setMarksheetId(data.marksheet_id);
    } catch {
      toast.error("Could not fetch the next marksheet number.");
    }
  }

  async function save() {
    if (!password) {
      toast.error("Please enter the admin password.");
      return;
    }

    const body: Record<string, unknown> = { password };

    if (certifiedDate !== (student.certified_date ?? "")) body.certified_date = certifiedDate;
    if (marksheetId !== (student.marksheet_id ?? "")) body.marksheet_id = marksheetId;

    if (summary.filled) {
      body.marks = Object.fromEntries(subjects.map((subject) => [subject, Number(marks[subject])]));
    }

    const result = await run(`/api/students/${student.student_id}/secure-certification`, {
      method: "POST",
      body,
    });

    if (result.ok) {
      toast.success("Certificate data updated.");
      setAskPassword(false);
      onSaved();
      onClose();
    }
  }

  return (
    <>
      <div
        className="sa-fragile-overlay"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="sa-fragile-modal" role="dialog" aria-modal="true">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
                Edit Fragile Certificate Data
              </h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                Use this only for sensitive superadmin corrections.
              </p>
            </div>
            <button type="button" className="sa-modal-close" onClick={onClose} aria-label="Close">
              &times;
            </button>
          </div>

          <div className="sa-fragile-note">
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9a3412", marginBottom: 4 }}>
              Warning
            </div>
            <div style={{ fontSize: 13, color: "#7c2d12", lineHeight: 1.5 }}>
              This section is too fragile to change. Don&apos;t use unless absolutely necessary.
              Saving here requires the admin password.
            </div>
          </div>

          <div className="sa-fragile-grid">
            <div>
              <label className="sa-edit-label" htmlFor="sa-cert-date">
                Certified Date
              </label>
              <input
                id="sa-cert-date"
                type="date"
                className="sa-edit-input"
                value={certifiedDate}
                onChange={(event) => setCertifiedDate(event.target.value)}
              />
            </div>
            <div>
              <label className="sa-edit-label" htmlFor="sa-cert-msid">
                Marksheet ID
              </label>
              <input
                id="sa-cert-msid"
                type="text"
                className="sa-edit-input"
                placeholder="Enter marksheet ID"
                value={marksheetId}
                onChange={(event) => setMarksheetId(event.target.value)}
              />
              <button type="button" className="sa-fragile-link-btn" onClick={useNextMarksheetId}>
                Use next available marksheet ID
              </button>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Marks</div>
            <div className="sa-fragile-marks-grid">
              {subjects.map((subject) => (
                <div key={subject}>
                  <label className="sa-edit-label" htmlFor={`sa-mark-${subject}`}>
                    {subject}
                  </label>
                  <input
                    id={`sa-mark-${subject}`}
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className="sa-edit-input"
                    value={marks[subject] ?? ""}
                    onChange={(event) =>
                      setMarks((current) => ({ ...current, [subject]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="sa-fragile-summary">
            <SummaryCard label="Total Marks" value={`${summary.obtained} / ${summary.possible}`} />
            <SummaryCard label="Overall %" value={`${summary.percent}%`} />
            <SummaryCard label="Performance" value={summary.performance} />
          </div>

          <div className="sa-fragile-actions">
            <button type="button" className="sa-fragile-secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="sa-fragile-primary-btn"
              onClick={() => setAskPassword(true)}
            >
              Save Fragile Changes
            </button>
          </div>
        </div>
      </div>

      {askPassword ? (
        <div
          className="sa-fragile-overlay"
          style={{ zIndex: 10000 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setAskPassword(false);
          }}
        >
          <div className="sa-fragile-password-modal" role="dialog" aria-modal="true">
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
              Confirm Admin Password
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 18px" }}>
              Enter the admin password to save these fragile changes.
            </p>

            <label className="sa-edit-label" htmlFor="sa-cert-password">
              Admin Password
            </label>
            <input
              id="sa-cert-password"
              type="password"
              className="sa-edit-input"
              placeholder="Enter admin password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
              }}
            />

            {error ? <div className="sa-fragile-password-error">{error}</div> : null}

            <div className="sa-fragile-actions" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="sa-fragile-secondary-btn"
                onClick={() => setAskPassword(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sa-fragile-primary-btn"
                disabled={pending || !password}
                onClick={save}
              >
                {pending ? "Saving..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="sa-fragile-summary-card">
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
