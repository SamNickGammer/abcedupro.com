"use client";

import { useEffect, useState } from "react";
import { useApi, useMutation } from "@/lib/use-api";
import { useToast } from "@/components/toast/Toast";
import type { CourseRow } from "@/types/api";
import { Skeleton } from "@/components/panel/sa/Spinner";
import { SaConfirm } from "@/components/panel/sa/SaConfirm";

/**
 * Courses — ported from resources/views/superadmin/pages/courses.blade.php:
 * the same columns, the same Add Course modal.
 *
 * Two things are done differently. Deactivate and Delete were bare text links;
 * they are now buttons the same size as every other row action in the panel,
 * icon first, with hover and pressed states. And confirming goes through a real
 * dialog rather than the browser's `confirm()`, which could not name the course
 * or explain why a delete might be refused.
 */

const COLUMNS = ["Course Name", "Short Form", "Duration", "Fees", "Subjects", "Status"];

type Pending =
  | { kind: "delete"; course: CourseRow }
  | { kind: "status"; course: CourseRow }
  | null;

export function SaCourses() {
  const toast = useToast();
  const { data, loading, error, refresh } = useApi<CourseRow[]>("/api/courses");

  const [adding, setAdding] = useState(false);
  const [pendingAction, setPendingAction] = useState<Pending>(null);

  const action = useMutation();

  const courses = data ?? [];

  async function confirmAction() {
    if (!pendingAction) return;

    const { kind, course } = pendingAction;

    const result =
      kind === "delete"
        ? await action.run(`/api/courses/${course.course_id}`, { method: "DELETE" })
        : await action.run(`/api/courses/${course.course_id}`, {
            method: "PATCH",
            body: {
              course_status: course.course_status === "active" ? "inactive" : "active",
            },
          });

    if (result.ok) {
      toast.success(
        kind === "delete"
          ? `"${course.course_name}" deleted.`
          : course.course_status === "active"
            ? `"${course.course_name}" deactivated.`
            : `"${course.course_name}" reactivated.`,
      );
      setPendingAction(null);
      refresh();
    }
    // On failure the dialog stays open and shows the reason.
  }

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
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Courses</h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Manage all available courses</p>
        </div>
        <button type="button" className="sa-primary-action" onClick={() => setAdding(true)}>
          <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
          </svg>
          Add Course
        </button>
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

      {!loading && courses.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>No courses found</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Add your first course to get started.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="sa-course-table">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }, (_, row) => (
                    <tr key={row}>
                      {COLUMNS.map((column, cell) => (
                        <td key={column}>
                          <Skeleton
                            height={cell === 5 ? 18 : 11}
                            width={cell === 5 ? 58 : `${[80, 44, 56, 50, 88][cell] ?? 60}%`}
                            style={cell === 5 ? { borderRadius: 20 } : undefined}
                          />
                        </td>
                      ))}
                      <td>
                        <div className="sa-row-actions">
                          <Skeleton width={92} height={26} style={{ borderRadius: 8 }} />
                          <Skeleton width={72} height={26} style={{ borderRadius: 8 }} />
                        </div>
                      </td>
                    </tr>
                  ))
                : courses.map((course) => (
                    <tr key={course.course_id}>
                      <td style={{ fontWeight: 700 }}>{course.course_name}</td>
                      <td>{course.short_form}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{course.course_duration} months</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        ₹{course.course_fees.toLocaleString("en-IN")}
                      </td>
                      <td
                        title={course.subjects}
                        style={{
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {course.subjects || "-"}
                      </td>
                      <td>
                        <span
                          className="bd-badge"
                          style={
                            course.course_status === "active"
                              ? { background: "#dcfce7", color: "#15803d" }
                              : { background: "#fee2e2", color: "#dc2626" }
                          }
                        >
                          {course.course_status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="sa-row-actions">
                          <button
                            type="button"
                            className={
                              course.course_status === "active"
                                ? "sa-row-action"
                                : "sa-row-action sa-row-action-go"
                            }
                            onClick={() => {
                              action.reset();
                              setPendingAction({ kind: "status", course });
                            }}
                          >
                            {course.course_status === "active" ? (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                            ) : (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                            {course.course_status === "active" ? "Deactivate" : "Reactivate"}
                          </button>

                          <button
                            type="button"
                            className="sa-row-action sa-row-action-danger"
                            onClick={() => {
                              action.reset();
                              setPendingAction({ kind: "delete", course });
                            }}
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {adding ? (
        <AddCourseModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            refresh();
          }}
        />
      ) : null}

      {pendingAction ? (
        <SaConfirm
          title={
            pendingAction.kind === "delete"
              ? "Delete this course?"
              : pendingAction.course.course_status === "active"
                ? "Deactivate this course?"
                : "Reactivate this course?"
          }
          message={
            pendingAction.kind === "delete"
              ? `"${pendingAction.course.course_name}" will be removed permanently. This cannot be undone.`
              : pendingAction.course.course_status === "active"
                ? `"${pendingAction.course.course_name}" will stop appearing when branches enrol a student. Students already on it keep their records.`
                : `"${pendingAction.course.course_name}" will appear again when branches enrol a student.`
          }
          detail={
            pendingAction.kind === "delete"
              ? "A course with students enrolled cannot be deleted — deactivate it instead."
              : undefined
          }
          confirmLabel={
            pendingAction.kind === "delete"
              ? "Delete course"
              : pendingAction.course.course_status === "active"
                ? "Deactivate"
                : "Reactivate"
          }
          tone={
            pendingAction.kind === "delete"
              ? "danger"
              : pendingAction.course.course_status === "active"
                ? "warning"
                : "success"
          }
          pending={action.pending}
          error={action.error}
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}
    </div>
  );
}

const DEFAULT_SUBJECTS = "Written Marks, Practical Marks, Project Marks, Viva Marks";

function AddCourseModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const toast = useToast();
  const { run, pending, error, fieldErrors } = useMutation();

  const [form, setForm] = useState({
    course_name: "",
    short_form: "",
    course_duration: "",
    course_fees: "",
    subjects: DEFAULT_SUBJECTS,
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  async function submit() {
    if (!form.course_name.trim() || !form.short_form.trim() || !form.course_duration || !form.course_fees) {
      toast.error("Please fill all required fields.");
      return;
    }

    const result = await run("/api/courses", { method: "POST", body: form });

    if (result.ok) {
      toast.success("Course added successfully!");
      onAdded();
    }
  }

  return (
    <div
      className="bd-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <form
        className="sa-course-modal"
        role="dialog"
        aria-modal="true"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>Add New Course</h2>

        <div className="sa-course-row">
          <div>
            <label className="sa-course-label" htmlFor="ac-name">
              Course Name *
            </label>
            <input
              id="ac-name"
              className="sa-course-input"
              placeholder="e.g. Computer Science"
              autoFocus
              value={form.course_name}
              onChange={(event) => set("course_name", event.target.value)}
            />
          </div>
          <div>
            <label className="sa-course-label" htmlFor="ac-short">
              Short Form *
            </label>
            <input
              id="ac-short"
              className="sa-course-input"
              placeholder="e.g. CS"
              maxLength={10}
              value={form.short_form}
              onChange={(event) => set("short_form", event.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="sa-course-row">
          <div>
            <label className="sa-course-label" htmlFor="ac-duration">
              Duration (months) *
            </label>
            <input
              id="ac-duration"
              type="number"
              min={1}
              className="sa-course-input"
              placeholder="12"
              value={form.course_duration}
              onChange={(event) => set("course_duration", event.target.value)}
            />
          </div>
          <div>
            <label className="sa-course-label" htmlFor="ac-fees">
              Fees *
            </label>
            <input
              id="ac-fees"
              type="number"
              min={0}
              className="sa-course-input"
              placeholder="10000"
              value={form.course_fees}
              onChange={(event) => set("course_fees", event.target.value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="sa-course-label" htmlFor="ac-subjects">
            Subjects (comma separated)
          </label>
          <input
            id="ac-subjects"
            className="sa-course-input"
            placeholder="e.g. Math, Physics, Chemistry"
            value={form.subjects}
            onChange={(event) => set("subjects", event.target.value)}
          />
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0" }}>
            These become the marksheet columns. The printed template has four.
          </p>
        </div>

        {error ? (
          <p
            style={{
              margin: "0 0 16px",
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: 12.5,
            }}
          >
            {Object.values(fieldErrors)[0] ?? error}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="bd-modal-btn bd-modal-btn-cancel"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bd-modal-btn"
            style={{ background: "#111", color: "#fff" }}
            disabled={pending}
          >
            {pending ? "Adding..." : "Add Course"}
          </button>
        </div>
      </form>
    </div>
  );
}
