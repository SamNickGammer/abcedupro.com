import type { CSSProperties, ReactNode } from "react";
import { PAGE } from "@/lib/document-layout";

/**
 * One A4 landscape sheet with the scanned artwork inset exactly where dompdf
 * placed it. Everything positioned inside is a percentage of this box, so the
 * screen preview, the browser print dialog and the headless-Chromium PDF all
 * agree.
 */
export function PrintSheet({
  templateSrc,
  alt,
  children,
  calibrate = false,
}: {
  templateSrc: string;
  alt: string;
  children: ReactNode;
  calibrate?: boolean;
}) {
  const page: CSSProperties = {
    position: "relative",
    width: `${PAGE.widthMm}mm`,
    height: `${PAGE.heightMm}mm`,
    overflow: "hidden",
    background: "#fff",
    margin: "0 auto",
  };

  const artwork: CSSProperties = {
    position: "absolute",
    top: `${PAGE.artworkTopMm}mm`,
    left: 0,
    width: `${PAGE.widthMm}mm`,
    height: `${PAGE.artworkHeightMm}mm`,
    overflow: "hidden",
  };

  return (
    <div className="print-sheet" style={page}>
      <div style={artwork}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size print artwork; Next/Image adds a wrapper that breaks absolute layout */}
        <img
          src={templateSrc}
          alt={alt}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
        {calibrate ? <CalibrationGrid /> : null}
        {children}
      </div>
    </div>
  );
}

/**
 * A 5%-step ruled grid with 10% labels, shown only with `?calibrate=1`. Read a
 * field's position off the grid, then set it in `src/lib/document-layout.ts`.
 */
function CalibrationGrid() {
  const lines = Array.from({ length: 19 }, (_, index) => (index + 1) * 5);

  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}
    >
      {lines.map((percent) => (
        <div
          key={`v-${percent}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${percent}%`,
            width: percent % 10 === 0 ? 1 : 0.5,
            background: percent % 10 === 0 ? "rgba(220,38,38,.55)" : "rgba(37,99,235,.28)",
          }}
        />
      ))}
      {lines.map((percent) => (
        <div
          key={`h-${percent}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${percent}%`,
            height: percent % 10 === 0 ? 1 : 0.5,
            background: percent % 10 === 0 ? "rgba(220,38,38,.55)" : "rgba(37,99,235,.28)",
          }}
        />
      ))}
      {lines
        .filter((percent) => percent % 10 === 0)
        .map((percent) => (
          <span
            key={`lx-${percent}`}
            style={{
              position: "absolute",
              top: 2,
              left: `calc(${percent}% + 2px)`,
              font: "600 8px/1 ui-monospace, monospace",
              color: "#dc2626",
              background: "rgba(255,255,255,.8)",
              padding: "1px 2px",
            }}
          >
            {percent}
          </span>
        ))}
      {lines
        .filter((percent) => percent % 10 === 0)
        .map((percent) => (
          <span
            key={`ly-${percent}`}
            style={{
              position: "absolute",
              left: 2,
              top: `calc(${percent}% + 2px)`,
              font: "600 8px/1 ui-monospace, monospace",
              color: "#dc2626",
              background: "rgba(255,255,255,.8)",
              padding: "1px 2px",
            }}
          >
            {percent}
          </span>
        ))}
    </div>
  );
}
