"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi, useMutation } from "@/lib/use-api";
import { useToast } from "@/components/toast/Toast";
import type { CourseRow } from "@/types/api";
import type { StudentView } from "@/lib/students";
import { statusFor } from "@/components/panel/sa/SaStudentDetail";
import { SaAadhaarModal } from "@/components/panel/sa/SaAadhaarModal";
import { SaCertificateModal } from "@/components/panel/sa/SaCertificateModal";

/**
 * Edit student — ported from
 * resources/views/superadmin/pages/edit-student.blade.php: the "Editing as
 * Admin" badge, the Edit Certificate Data button, the four field cards, and
 * both Update and Delete actions.
 *
 * Registration number and Aadhaar stay read-only in the form, exactly as
 * before: the first is immutable, and the second goes through its own modal
 * because it is the de-duplication key.
 */
export function SaEditStudent({ student: initial }: { student: StudentView }) {
  const router = useRouter();
  const toast = useToast();

  const { run, pending, error, fieldErrors } = useMutation();
  const deletion = useMutation();

  const { data: courses } = useApi<CourseRow[]>("/api/courses");

  const [student, setStudent] = useState(initial);
  const [aadhaarOpen, setAadhaarOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  const [form, setForm] = useState({
    student_name: initial.student_name,
    student_phone: initial.student_phone.replace(/^\+91/, ""),
    student_email: initial.student_email ?? "",
    dob: initial.dob,
    student_father_name: initial.student_father_name ?? "",
    student_mother_name: initial.student_mother_name ?? "",
    address: initial.address ?? "",
    city: initial.city ?? "",
    state: initial.state ?? "",
    zip: initial.zip ?? "",
    student_course_id: String(initial.student_course_id),
    admission_date: initial.admission_date,
    relieving_date: initial.relieving_date,
    total_fees: initial.total_fees === null ? "" : String(initial.total_fees),
    paid_fees: initial.paid_fees === null ? "" : String(initial.paid_fees),
    due_fees: initial.due_fees === null ? "" : String(initial.due_fees),
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Balance follows total minus paid, so the two can never contradict.
  useEffect(() => {
    const total = Number(form.total_fees);
    const paid = Number(form.paid_fees);
    if (form.total_fees !== "" && Number.isFinite(total)) {
      set("due_fees", String(Math.max(0, total - (form.paid_fees === "" ? 0 : paid))));
    }
  }, [form.total_fees, form.paid_fees]);

  const status = statusFor(student);
  const detailHref = `/admin-abc/students/${student.student_id}`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const body = new FormData();
    for (const [key, value] of Object.entries(form)) {
      if (value !== "") body.set(key, value);
    }
    if (photo) body.set("student_photo", photo);

    const result = await run<StudentView>(`/api/students/${student.student_id}`, {
      method: "PATCH",
      formData: body,
    });

    if (result.ok) {
      toast.success("Student updated!");
      setStudent(result.data);
      router.refresh();
    }
  }

  async function remove() {
    const result = await deletion.run(`/api/students/${student.student_id}`, { method: "DELETE" });

    if (result.ok) {
      toast.success("Student deleted!");
      router.push("/admin-abc/students");
      router.refresh();
    } else {
      setConfirmingDelete(false);
      toast.error(result.error.message);
    }
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: "0 20px" }}>
        {/* Hero */}
        <div className="sa-edit-card" style={{ marginBottom: 20 }}>
          <div style={{ padding: "28px 32px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <Link href={detailHref} className="sa-back-link">
                <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Student
              </Link>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <span style={{ fontSize: 13, color: "#9ca3af" }}>Editing as</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 20,
                    background: "#1e1b4b",
                    color: "#c7d2fe",
                  }}
                >
                  Admin
                </span>
                <button type="button" className="sa-fragile-btn" onClick={() => setCertOpen(true)}>
                  Edit Certificate Data
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
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
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{student.student_name}</h1>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: 20,
                      background: status.bg,
                      color: status.color,
                    }}
                  >
                    {status.text}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                  {student.registration_number}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div
            className="sa-edit-card"
            style={{ marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2" }}
          >
            <div style={{ padding: "16px 24px" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>{error}</p>
              {Object.entries(fieldErrors).length > 0 ? (
                <ul style={{ margin: "6px 0 0 18px", fontSize: 13, color: "#dc2626" }}>
                  {Object.entries(fieldErrors).map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card title="Basic Information">
                <div className="sa-edit-row">
                  <Field label="Student Name">
                    <input
                      className="sa-edit-input"
                      value={form.student_name}
                      onChange={(event) => set("student_name", event.target.value)}
                    />
                  </Field>
                  <Field label="Registration No">
                    <input
                      readOnly
                      className="sa-edit-input sa-edit-input-ro"
                      value={student.registration_number}
                    />
                  </Field>
                  <Field label="Aadhaar">
                    <div className="sa-aadhaar-wrap">
                      <input
                        readOnly
                        className="sa-edit-input sa-edit-input-ro"
                        value={student.aadhaar_number ?? ""}
                      />
                      <button
                        type="button"
                        className="sa-aadhaar-update-btn"
                        onClick={() => setAadhaarOpen(true)}
                      >
                        Update
                      </button>
                    </div>
                    <p className="sa-aadhaar-hint">
                      {student.aadhaar_number
                        ? "Locked. Use the Update button to change the Aadhaar."
                        : "No Aadhaar set. Use the Update button to add one."}
                    </p>
                  </Field>
                  <Field label="Phone">
                    <div style={{ display: "flex" }}>
                      <span className="sa-phone-prefix">+91</span>
                      <input
                        className="sa-edit-input"
                        maxLength={10}
                        inputMode="numeric"
                        value={form.student_phone}
                        onChange={(event) =>
                          set("student_phone", event.target.value.replace(/\D/g, ""))
                        }
                      />
                    </div>
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      className="sa-edit-input"
                      value={form.student_email}
                      onChange={(event) => set("student_email", event.target.value)}
                    />
                  </Field>
                  <Field label="Date of Birth">
                    <input
                      type="date"
                      className="sa-edit-input"
                      value={form.dob}
                      onChange={(event) => set("dob", event.target.value)}
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Family Details">
                <div className="sa-edit-row">
                  <Field label="Father's Name">
                    <input
                      className="sa-edit-input"
                      value={form.student_father_name}
                      onChange={(event) => set("student_father_name", event.target.value)}
                    />
                  </Field>
                  <Field label="Mother's Name">
                    <input
                      className="sa-edit-input"
                      value={form.student_mother_name}
                      onChange={(event) => set("student_mother_name", event.target.value)}
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Address">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Address">
                    <input
                      className="sa-edit-input"
                      value={form.address}
                      onChange={(event) => set("address", event.target.value)}
                    />
                  </Field>
                  <div className="sa-edit-row-3">
                    <Field label="City">
                      <input
                        className="sa-edit-input"
                        value={form.city}
                        onChange={(event) => set("city", event.target.value)}
                      />
                    </Field>
                    <Field label="State">
                      <input
                        className="sa-edit-input"
                        value={form.state}
                        onChange={(event) => set("state", event.target.value)}
                      />
                    </Field>
                    <Field label="ZIP">
                      <input
                        className="sa-edit-input"
                        maxLength={10}
                        value={form.zip}
                        onChange={(event) => set("zip", event.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card title="Course & Dates">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Course">
                    <select
                      className="sa-edit-select"
                      value={form.student_course_id}
                      onChange={(event) => set("student_course_id", event.target.value)}
                    >
                      {courses?.map((course) => (
                        <option key={course.course_id} value={course.course_id}>
                          {course.short_form} — {course.course_name}
                        </option>
                      )) ?? <option value={form.student_course_id}>Loading...</option>}
                    </select>
                  </Field>
                  <div className="sa-edit-row">
                    <Field label="Admission Date">
                      <input
                        type="date"
                        className="sa-edit-input"
                        value={form.admission_date}
                        onChange={(event) => set("admission_date", event.target.value)}
                      />
                    </Field>
                    <Field label="Relieving Date">
                      <input
                        type="date"
                        className="sa-edit-input"
                        value={form.relieving_date}
                        onChange={(event) => set("relieving_date", event.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </Card>

              <Card title="Fee Details">
                <div className="sa-edit-row-3">
                  <Field label="Total Fees">
                    <div style={{ display: "flex" }}>
                      <span className="sa-fee-prefix">&#8377;</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="sa-edit-input"
                        value={form.total_fees}
                        onChange={(event) => set("total_fees", event.target.value)}
                      />
                    </div>
                  </Field>
                  <Field label="Paid Fees">
                    <div style={{ display: "flex" }}>
                      <span className="sa-fee-prefix">&#8377;</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="sa-edit-input"
                        value={form.paid_fees}
                        onChange={(event) => set("paid_fees", event.target.value)}
                      />
                    </div>
                  </Field>
                  <Field label="Due Fees">
                    <div style={{ display: "flex" }}>
                      <span className="sa-fee-prefix">&#8377;</span>
                      <input
                        readOnly
                        className="sa-edit-input sa-edit-input-ro"
                        value={form.due_fees}
                      />
                    </div>
                  </Field>
                </div>
              </Card>

              <Card title="Student Photo">
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div
                    style={{
                      width: 80,
                      height: 96,
                      borderRadius: 12,
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
                    ) : null}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      className="sa-edit-file"
                      onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                    />
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "5px 0 0" }}>
                      JPG, PNG or WebP. Max 2MB.
                    </p>
                  </div>
                </div>
              </Card>

              <Card title="Actions">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button type="submit" className="sa-edit-btn" disabled={pending}>
                    {pending ? "Updating..." : "Update Student"}
                  </button>

                  <button
                    type="button"
                    className="sa-edit-btn-danger"
                    disabled={deletion.pending}
                    onClick={() => (confirmingDelete ? remove() : setConfirmingDelete(true))}
                    onBlur={() => setConfirmingDelete(false)}
                  >
                    {deletion.pending
                      ? "Deleting..."
                      : confirmingDelete
                        ? "Click again to confirm — this cannot be undone"
                        : "Delete Student"}
                  </button>

                  {student.is_certificate_approve || student.certified_date ? (
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, textAlign: "center" }}>
                      A certified student cannot be deleted.
                    </p>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>
        </form>
      </div>

      {aadhaarOpen ? (
        <SaAadhaarModal
          studentId={student.student_id}
          current={student.aadhaar_number}
          onClose={() => setAadhaarOpen(false)}
          onSaved={(aadhaar) => {
            setStudent((current) => ({ ...current, aadhaar_number: aadhaar }));
            router.refresh();
          }}
        />
      ) : null}

      {certOpen ? (
        <SaCertificateModal
          student={student}
          onClose={() => setCertOpen(false)}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sa-edit-card">
      <div className="sa-edit-inner">
        <h2 className="sa-edit-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="sa-edit-label">{label}</label>
      {children}
    </div>
  );
}
