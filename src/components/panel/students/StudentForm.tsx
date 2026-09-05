"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, query } from "@/lib/client";
import { useApi, useMutation } from "@/lib/use-api";
import type { CourseRow, StudentRow } from "@/types/api";
import { Card, Field, SectionHeading, inputClass } from "@/components/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner } from "@/components/site/icons";

type Mode = "create" | "edit";

type FormState = {
  student_name: string;
  registration_number: string;
  student_email: string;
  student_phone: string;
  student_father_name: string;
  student_mother_name: string;
  student_course_id: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  admission_date: string;
  relieving_date: string;
  aadhaar_number: string;
  total_fees: string;
  paid_fees: string;
  due_fees: string;
  is_student_active: boolean;
};

const EMPTY: FormState = {
  student_name: "",
  registration_number: "",
  student_email: "",
  student_phone: "",
  student_father_name: "",
  student_mother_name: "",
  student_course_id: "",
  dob: "",
  address: "",
  city: "",
  state: "Bihar",
  zip: "",
  admission_date: new Date().toISOString().slice(0, 10),
  relieving_date: "",
  aadhaar_number: "",
  total_fees: "",
  paid_fees: "",
  due_fees: "",
  is_student_active: true,
};

/**
 * Enrolment and editing share one form, because the fields are the same and
 * only the write differs. Two values are derived rather than typed:
 * the registration number (next in this branch's sequence) and the relieving
 * date (admission + course duration), both fetched from the server so the
 * client never invents them.
 */
export function StudentForm({
  mode,
  student,
  scope = "branch",
}: {
  mode: Mode;
  student?: StudentRow;
  scope?: "branch" | "admin";
}) {
  const router = useRouter();
  const { run, pending, error, fieldErrors } = useMutation();
  const basePath = scope === "admin" ? "/admin-abc/students" : "/branch/students";

  const [form, setForm] = useState<FormState>(() =>
    student
      ? {
          student_name: student.student_name,
          registration_number: student.registration_number,
          student_email: student.student_email ?? "",
          // Stored as +91XXXXXXXXXX; the field edits the ten digits.
          student_phone: student.student_phone.replace(/^\+91/, ""),
          student_father_name: student.student_father_name ?? "",
          student_mother_name: student.student_mother_name ?? "",
          student_course_id: String(student.student_course_id),
          dob: student.dob,
          address: student.address ?? "",
          city: student.city ?? "",
          state: student.state ?? "",
          zip: student.zip ?? "",
          admission_date: student.admission_date,
          relieving_date: student.relieving_date,
          aadhaar_number: student.aadhaar_number ?? "",
          total_fees: student.total_fees === null ? "" : String(student.total_fees),
          paid_fees: student.paid_fees === null ? "" : String(student.paid_fees),
          due_fees: student.due_fees === null ? "" : String(student.due_fees),
          is_student_active: student.is_student_active,
        }
      : EMPTY,
  );

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student?.student_photo_src ?? null);

  const { data: courses } = useApi<CourseRow[]>("/api/courses?showActiveOnly=1");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Suggest the next registration number for a new enrolment only — an existing
  // student's number is immutable.
  const suggestedOnce = useRef(false);
  useEffect(() => {
    if (mode !== "create" || suggestedOnce.current) return;
    suggestedOnce.current = true;

    api<{ registration_number: string }>("/api/students/next-registration-number")
      .then(({ data }) => {
        setForm((current) =>
          current.registration_number ? current : { ...current, registration_number: data.registration_number },
        );
      })
      .catch(() => {
        /* the field stays editable; the unique index is the real guard */
      });
  }, [mode]);

  // Re-derive the relieving date whenever the admission date or course changes.
  useEffect(() => {
    if (!form.admission_date || !form.student_course_id) return;

    const controller = new AbortController();

    api<{ relieving_date: string }>(
      `/api/students/relieving-date${query({
        admission_date: form.admission_date,
        course_id: form.student_course_id,
      })}`,
      { signal: controller.signal },
    )
      .then(({ data }) => set("relieving_date", data.relieving_date))
      .catch(() => {
        /* leave whatever is there; the server recomputes on save anyway */
      });

    return () => controller.abort();
  }, [form.admission_date, form.student_course_id]);

  // Selecting a course sets the total fee to that course's price.
  const selectedCourse = useMemo(
    () => courses?.find((course) => String(course.course_id) === form.student_course_id),
    [courses, form.student_course_id],
  );

  useEffect(() => {
    if (mode === "create" && selectedCourse) {
      set("total_fees", String(selectedCourse.course_fees));
    }
  }, [mode, selectedCourse]);

  // Balance follows from what has been paid, so it can never contradict it.
  useEffect(() => {
    const total = Number(form.total_fees);
    const paid = Number(form.paid_fees);
    if (Number.isFinite(total) && Number.isFinite(paid) && form.total_fees !== "") {
      set("due_fees", String(Math.max(0, total - (form.paid_fees === "" ? 0 : paid))));
    }
  }, [form.total_fees, form.paid_fees]);

  function pickPhoto(file: File | null) {
    setPhoto(file);
    setPhotoPreview((previous) => {
      if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : (student?.student_photo_src ?? null);
    });
  }

  const cancelHref = mode === "create" ? basePath : `${basePath}/${student!.student_id}`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const body = new FormData();

    const fields: Array<keyof FormState> =
      mode === "create"
        ? [
            "student_name",
            "registration_number",
            "student_email",
            "student_phone",
            "student_father_name",
            "student_mother_name",
            "student_course_id",
            "dob",
            "address",
            "city",
            "state",
            "zip",
            "admission_date",
            "relieving_date",
            "aadhaar_number",
          ]
        : [
            "student_name",
            "student_email",
            "student_phone",
            "student_father_name",
            "student_mother_name",
            "student_course_id",
            "dob",
            "address",
            "city",
            "state",
            "zip",
            "admission_date",
            "relieving_date",
            "total_fees",
            "paid_fees",
            "due_fees",
          ];

    for (const key of fields) {
      const value = form[key];
      if (value !== "" && value !== null) body.set(key, String(value));
    }

    if (mode === "edit") body.set("is_student_active", String(form.is_student_active));
    if (photo) body.set("student_photo", photo);

    const result = await run<StudentRow>(
      mode === "create" ? "/api/students" : `/api/students/${student!.student_id}`,
      { method: mode === "create" ? "POST" : "PATCH", formData: body },
    );

    if (result.ok) {
      router.push(`${basePath}/${result.data.student_id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <SectionHeading
        eyebrow={mode === "create" ? "New enrolment" : student?.registration_number}
        title={mode === "create" ? "Enrol a student" : `Edit ${student?.student_name}`}
        description={
          mode === "create"
            ? "The registration number and relieving date are worked out for you."
            : "Registration number, branch and Aadhaar cannot be changed here."
        }
        actions={
          <ButtonLink href={cancelHref} variant="secondary">
            Cancel
          </ButtonLink>
        }
      />

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-semibold text-red-800">{error}</p>
          {Object.keys(fieldErrors).length > 0 ? (
            <ul className="mt-1.5 list-inside list-disc text-sm text-red-700">
              {Object.entries(fieldErrors).map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Identity
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Student name" htmlFor="student_name" error={fieldErrors.student_name} required>
            <input
              id="student_name"
              required
              value={form.student_name}
              onChange={(event) => set("student_name", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Registration number"
            htmlFor="registration_number"
            error={fieldErrors.registration_number}
            hint={mode === "create" ? "Next in this branch's sequence" : "Cannot be changed"}
            required
          >
            <input
              id="registration_number"
              required
              readOnly={mode === "edit"}
              value={form.registration_number}
              onChange={(event) => set("registration_number", event.target.value.toUpperCase())}
              className={`${inputClass} font-mono uppercase ${mode === "edit" ? "bg-neutral-100" : ""}`}
            />
          </Field>

          <Field
            label="Aadhaar number"
            htmlFor="aadhaar_number"
            error={fieldErrors.aadhaar_number}
            hint={mode === "edit" ? "Only head office can change this" : "12 digits, used to prevent duplicates"}
            required={mode === "create"}
          >
            <input
              id="aadhaar_number"
              inputMode="numeric"
              maxLength={12}
              readOnly={mode === "edit"}
              required={mode === "create"}
              value={form.aadhaar_number}
              onChange={(event) => set("aadhaar_number", event.target.value.replace(/\D/g, ""))}
              className={`${inputClass} font-mono ${mode === "edit" ? "bg-neutral-100" : ""}`}
            />
          </Field>

          <Field label="Father's name" htmlFor="father" error={fieldErrors.student_father_name}>
            <input
              id="father"
              value={form.student_father_name}
              onChange={(event) => set("student_father_name", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Mother's name" htmlFor="mother" error={fieldErrors.student_mother_name}>
            <input
              id="mother"
              value={form.student_mother_name}
              onChange={(event) => set("student_mother_name", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Date of birth" htmlFor="dob" error={fieldErrors.dob} required>
            <input
              id="dob"
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={form.dob}
              onChange={(event) => set("dob", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Phone"
            htmlFor="phone"
            error={fieldErrors.student_phone}
            hint="10 digits, stored with +91"
            required={mode === "create"}
          >
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-sm text-neutral-500">
                +91
              </span>
              <input
                id="phone"
                inputMode="numeric"
                maxLength={10}
                required={mode === "create"}
                value={form.student_phone}
                onChange={(event) => set("student_phone", event.target.value.replace(/\D/g, ""))}
                className={`${inputClass} rounded-l-none`}
              />
            </div>
          </Field>

          <Field label="Email" htmlFor="email" error={fieldErrors.student_email}>
            <input
              id="email"
              type="email"
              value={form.student_email}
              onChange={(event) => set("student_email", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Photograph" htmlFor="photo" hint="JPEG or PNG, up to 2 MB">
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt=""
                  width={44}
                  height={52}
                  unoptimized
                  className="h-[52px] w-11 shrink-0 rounded-md object-cover ring-1 ring-black/10"
                />
              ) : null}
              <input
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => pickPhoto(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-neutral-800"
              />
            </div>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Course
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Course" htmlFor="course" error={fieldErrors.student_course_id} required>
            <select
              id="course"
              required
              value={form.student_course_id}
              onChange={(event) => set("student_course_id", event.target.value)}
              className={inputClass}
            >
              <option value="">Select a course…</option>
              {courses?.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {course.short_form} — {course.course_name} ({course.course_duration} mo)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Admission date" htmlFor="admission" error={fieldErrors.admission_date} required>
            <input
              id="admission"
              type="date"
              required
              value={form.admission_date}
              onChange={(event) => set("admission_date", event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Relieving date"
            htmlFor="relieving"
            hint="Admission date plus the course duration"
          >
            <input
              id="relieving"
              type="date"
              readOnly
              value={form.relieving_date}
              className={`${inputClass} bg-neutral-100`}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Address
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Address" htmlFor="address" className="sm:col-span-2">
            <input
              id="address"
              value={form.address}
              onChange={(event) => set("address", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="City" htmlFor="city">
            <input
              id="city"
              value={form.city}
              onChange={(event) => set("city", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="State" htmlFor="state">
            <input
              id="state"
              value={form.state}
              onChange={(event) => set("state", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="PIN code" htmlFor="zip">
            <input
              id="zip"
              inputMode="numeric"
              maxLength={10}
              value={form.zip}
              onChange={(event) => set("zip", event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      {mode === "edit" ? (
        <Card>
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Fees
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Total fees" htmlFor="total_fees">
              <input
                id="total_fees"
                type="number"
                min={0}
                step="0.01"
                value={form.total_fees}
                onChange={(event) => set("total_fees", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Paid" htmlFor="paid_fees">
              <input
                id="paid_fees"
                type="number"
                min={0}
                step="0.01"
                value={form.paid_fees}
                onChange={(event) => set("paid_fees", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Balance" htmlFor="due_fees" hint="Total minus paid">
              <input
                id="due_fees"
                readOnly
                value={form.due_fees}
                className={`${inputClass} bg-neutral-100`}
              />
            </Field>
            <Field label="Status" htmlFor="active">
              <select
                id="active"
                value={form.is_student_active ? "1" : "0"}
                onChange={(event) => set("is_student_active", event.target.value === "1")}
                className={inputClass}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </Field>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Spinner className="h-4 w-4 animate-spin" />
              Saving
            </>
          ) : mode === "create" ? (
            "Enrol student"
          ) : (
            "Save changes"
          )}
        </Button>
        <ButtonLink href={cancelHref} variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
