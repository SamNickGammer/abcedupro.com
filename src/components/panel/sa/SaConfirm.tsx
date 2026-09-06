"use client";

import { useEffect } from "react";

/**
 * A confirmation dialog for destructive row actions.
 *
 * The Blade pages used the browser's `confirm()`, which cannot be styled,
 * cannot say which record is affected in more than one line, and cannot show
 * the consequence — deleting a course with students enrolled is refused by the
 * API, and it is better to say so here than to let the click fail.
 */

const TONES = {
  danger: { bg: "#fef2f2", fg: "#dc2626", button: "#dc2626", hover: "#b91c1c" },
  warning: { bg: "#fef9c3", fg: "#a16207", button: "#ca8a04", hover: "#a16207" },
  success: { bg: "#dcfce7", fg: "#15803d", button: "#16a34a", hover: "#15803d" },
} as const;

export function SaConfirm({
  title,
  message,
  detail,
  confirmLabel,
  tone = "danger",
  pending = false,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  tone?: keyof typeof TONES;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const colours = TONES[tone];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div
      className="bd-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div className="sa-confirm-modal" role="alertdialog" aria-modal="true" aria-label={title}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div className="sa-confirm-icon" style={{ background: colours.bg, color: colours.fg }}>
            <svg width={22} height={22} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.71-3.03l-6.93-11.6a2 2 0 00-3.42 0l-6.93 11.6A2 2 0 005.07 19z"
              />
            </svg>
          </div>

          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px" }}>{title}</h2>
            <p style={{ fontSize: 13.5, color: "#4b5563", margin: 0, lineHeight: 1.6 }}>{message}</p>
            {detail ? (
              <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "8px 0 0", lineHeight: 1.6 }}>
                {detail}
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p
            style={{
              margin: "16px 0 0",
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <button
            type="button"
            className="bd-modal-btn bd-modal-btn-cancel"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bd-modal-btn"
            style={{ background: colours.button, color: "#fff", opacity: pending ? 0.6 : 1 }}
            onClick={onConfirm}
            disabled={pending}
            autoFocus
          >
            {pending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
