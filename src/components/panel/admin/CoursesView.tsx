"use client";

import { useState } from "react";
import { useApi, useMutation } from "@/lib/use-api";
import type { CourseRow } from "@/types/api";
import { Badge, Card, EmptyState, Field, SectionHeading, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/panel/DataTable";
import { PlusIcon, TrashIcon } from "@/components/panel/icons";
import { Spinner } from "@/components/site/icons";

const DEFAULT_SUBJECTS = "Written Marks, Practical Marks, Project Marks, Viva Marks";

export function CoursesView() {
  const { data, loading, error, refresh } = useApi<CourseRow[]>("/api/courses");
  const [showForm, setShowForm] = useState(false);

  const columns: Column<CourseRow>[] = [
    {
      key: "course",
      header: "Course",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900">{row.course_name}</p>
          <p className="truncate font-mono text-xs uppercase text-neutral-500">{row.short_form}</p>
        </div>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      render: (row) => `${row.course_duration} mo`,
    },
    {
      key: "fees",
      header: "Fees",
      align: "right",
      render: (row) => `₹${row.course_fees.toLocaleString("en-IN")}`,
    },
    {
      key: "subjects",
      header: "Assessed on",
      render: (row) => (
        <span className="text-[13px] text-neutral-600">{row.subject_list.join(", ")}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.course_status === "active" ? (
          <Badge tone="green">Active</Badge>
        ) : (
          <Badge tone="neutral">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => <CourseActions course={row} onDone={refresh} />,
    },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Head office"
        title="Courses"
        description="The catalogue every branch enrols against. Subjects here become the marksheet columns."
        actions={
          <Button onClick={() => setShowForm((value) => !value)}>
            <PlusIcon className="h-4 w-4" />
            {showForm ? "Close" : "Add a course"}
          </Button>
        }
      />

      {showForm ? (
        <NewCourseForm
          onDone={() => {
            setShowForm(false);
            refresh();
          }}
        />
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(row) => row.course_id}
        loading={loading}
        empty={
          <EmptyState
            title="No courses yet"
            description="Add the first course so branches can start enrolling students."
            action={
              <Button onClick={() => setShowForm(true)}>
                <PlusIcon className="h-4 w-4" />
                Add a course
              </Button>
            }
          />
        }
      />
    </div>
  );
}

function NewCourseForm({ onDone }: { onDone: () => void }) {
  const { run, pending, error, fieldErrors } = useMutation();
  const [form, setForm] = useState({
    course_name: "",
    short_form: "",
    course_duration: "12",
    course_fees: "",
    subjects: DEFAULT_SUBJECTS,
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await run("/api/courses", { method: "POST", body: form });
    if (result.ok) onDone();
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Course name" htmlFor="course_name" error={fieldErrors.course_name} required className="lg:col-span-2">
            <input
              id="course_name"
              required
              value={form.course_name}
              onChange={(event) => set("course_name", event.target.value)}
              className={inputClass}
              placeholder="Diploma in Computer Applications"
            />
          </Field>
          <Field
            label="Short form"
            htmlFor="short_form"
            error={fieldErrors.short_form}
            hint="Printed on the marksheet"
            required
          >
            <input
              id="short_form"
              required
              maxLength={10}
              value={form.short_form}
              onChange={(event) => set("short_form", event.target.value.toUpperCase())}
              className={`${inputClass} font-mono uppercase`}
              placeholder="DCA"
            />
          </Field>
          <Field label="Duration (months)" htmlFor="course_duration" error={fieldErrors.course_duration} required>
            <input
              id="course_duration"
              type="number"
              min={1}
              max={50}
              required
              value={form.course_duration}
              onChange={(event) => set("course_duration", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Fees (₹)" htmlFor="course_fees" error={fieldErrors.course_fees} required>
            <input
              id="course_fees"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.course_fees}
              onChange={(event) => set("course_fees", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Assessed subjects"
            htmlFor="subjects"
            hint="Comma-separated. The marksheet template has four columns."
            className="lg:col-span-3"
          >
            <input
              id="subjects"
              value={form.subjects}
              onChange={(event) => set("subjects", event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? <Spinner className="h-4 w-4 animate-spin" /> : null}
          Add course
        </Button>
      </form>
    </Card>
  );
}

function CourseActions({ course, onDone }: { course: CourseRow; onDone: () => void }) {
  const { run, pending, error } = useMutation();
  const [confirm, setConfirm] = useState(false);

  async function toggleStatus() {
    const result = await run(`/api/courses/${course.course_id}`, {
      method: "PATCH",
      body: { course_status: course.course_status === "active" ? "inactive" : "active" },
    });
    if (result.ok) onDone();
  }

  async function remove() {
    const result = await run(`/api/courses/${course.course_id}`, { method: "DELETE" });
    if (result.ok) onDone();
    else setConfirm(false);
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {error ? (
        <span title={error} className="text-xs font-medium text-red-600">
          !
        </span>
      ) : null}

      <Button size="sm" variant="ghost" onClick={toggleStatus} disabled={pending}>
        {course.course_status === "active" ? "Deactivate" : "Activate"}
      </Button>

      <Button
        size="sm"
        variant={confirm ? "danger" : "ghost"}
        onClick={() => (confirm ? remove() : setConfirm(true))}
        onBlur={() => setConfirm(false)}
        disabled={pending}
        aria-label={`Delete ${course.short_form}`}
      >
        {pending ? (
          <Spinner className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <TrashIcon className="h-3.5 w-3.5" />
        )}
        {confirm ? "Confirm" : null}
      </Button>
    </div>
  );
}
