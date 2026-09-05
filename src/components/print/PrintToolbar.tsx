"use client";

/** On-screen only — hidden by `@media print` and never in the PDF. */
export function PrintToolbar({
  calibrate,
  downloadHref,
}: {
  calibrate: boolean;
  downloadHref: string;
}) {
  const toggleHref = calibrate ? "?" : "?calibrate=1";

  return (
    <div className="print-toolbar">
      <button type="button" onClick={() => window.print()}>
        Print / Save as PDF
      </button>
      <a href={downloadHref}>Download PDF</a>
      <a href={toggleHref}>{calibrate ? "Hide alignment grid" : "Align fields"}</a>
      {calibrate ? (
        <span className="hint">
          Read a field&apos;s position off the grid, then edit{" "}
          <code>src/lib/document-layout.ts</code> and reload.
        </span>
      ) : null}
    </div>
  );
}
