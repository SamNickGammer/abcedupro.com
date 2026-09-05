import { fieldStyle, type FieldStyle } from "@/lib/document-layout";

/**
 * One placed value. In calibration mode it also draws its own box and prints
 * the coordinates to copy back into `document-layout.ts`.
 */
export function PrintField({
  name,
  field,
  value,
  calibrate = false,
}: {
  name: string;
  field: FieldStyle;
  value: string;
  calibrate?: boolean;
}) {
  const style = fieldStyle(field);

  if (!calibrate) {
    return <div style={style}>{value}</div>;
  }

  return (
    <div
      style={{
        ...style,
        outline: "1px dashed rgba(16,185,129,.9)",
        outlineOffset: 1,
        background: "rgba(16,185,129,.10)",
        minHeight: 10,
        minWidth: field.width === undefined ? 24 : undefined,
        zIndex: 6,
      }}
    >
      {value}
      <span
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          font: "600 6.5px/1.25 ui-monospace, monospace",
          color: "#047857",
          background: "rgba(255,255,255,.92)",
          padding: "1px 3px",
          whiteSpace: "nowrap",
          letterSpacing: 0,
        }}
      >
        {name} · top {field.top} · left {field.left}
        {field.width === undefined ? "" : ` · w ${field.width}`}
      </span>
    </div>
  );
}
