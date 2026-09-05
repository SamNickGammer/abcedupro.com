"use client";

/**
 * Documents are opened directly by URL, often from an email or a bookmark, so a
 * failure here has to read as a sentence rather than a stack trace.
 */
export default function PrintError({ error }: { error: Error }) {
  return (
    <div
      style={{
        maxWidth: 560,
        margin: "12vh auto",
        padding: 28,
        background: "#f1f1ec",
        borderRadius: 10,
        font: "400 15px/1.6 ui-sans-serif, system-ui, sans-serif",
        color: "#181a17",
      }}
    >
      <h1 style={{ font: "600 20px/1.3 ui-sans-serif, system-ui, sans-serif", margin: "0 0 10px" }}>
        This document can&apos;t be shown
      </h1>
      <p style={{ margin: "0 0 18px", color: "#4a4f48" }}>{error.message}</p>
      <a
        href="/branch/login"
        style={{
          display: "inline-block",
          padding: "9px 15px",
          background: "#1e4d3b",
          color: "#fff",
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        Sign in
      </a>
    </div>
  );
}
