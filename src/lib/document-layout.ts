/**
 * Field positions for the printed certificate and marksheet.
 *
 * Both documents are a scanned background image with text laid on top, so every
 * field is placed as a percentage of the page — that keeps the mapping
 * resolution-independent and identical between the on-screen preview, the print
 * dialog and the server-rendered PDF.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TO ADJUST A POSITION
 *   1. Open /print/certificate/<studentId>?calibrate=1 (or /print/marksheet/…).
 *      A ruled grid appears and every field is outlined and labelled with the
 *      numbers below; hovering a point on the page reads out its coordinates.
 *   2. Edit the `top` / `left` / `width` values here and reload.
 *   3. When it lines up, drop `?calibrate=1` and print.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Values carried over verbatim from the Blade/dompdf templates, which is the
 * output currently in circulation — start from these rather than from scratch.
 */

export type FieldStyle = {
  /** Distance from the top of the artwork, as a percentage of its height. */
  top: number;
  /** Distance from the left edge, as a percentage of the page width. */
  left: number;
  /** Box width as a percentage. Omit to let the text run its natural length. */
  width?: number;
  fontSize?: number;
  align?: "left" | "center" | "right";
  weight?: number;
  /** Set false for long values that should wrap instead of overflowing. */
  nowrap?: boolean;
  letterSpacing?: number;
};

export type ImageField = {
  top: number;
  left: number;
  /** Rendered size in px at 96 DPI, matching the original templates. */
  width: number;
  height: number;
};

/**
 * The artwork does not fill the sheet: dompdf inset it 9.96mm from the top of a
 * 297×210mm landscape page and gave it a height of 190.08mm. Reproducing that
 * inset is what keeps ported coordinates valid.
 */
export const PAGE = {
  widthMm: 297,
  heightMm: 210,
  artworkTopMm: 9.96,
  artworkHeightMm: 190.08,
} as const;

export const CERTIFICATE_TEMPLATE = "/assets/certificates/certi_sample.jpg";
export const MARKSHEET_TEMPLATE = "/assets/certificates/marks_sample.jpg";

/** Shared defaults; a field only names what it overrides. */
const base: Partial<FieldStyle> = {
  fontSize: 12,
  align: "center",
  weight: 700,
  letterSpacing: 0.5,
};

export const CERTIFICATE_FIELDS = {
  studentName: { ...base, top: 28.5, left: 32, width: 63 },
  fatherName: { ...base, top: 33, left: 33, width: 62 },
  registrationNumber: { ...base, top: 37.2, left: 37, width: 49 },
  courseName: { ...base, top: 41.4, left: 32, width: 59 },
  duration: { ...base, top: 45.8, left: 30, width: 24 },
  performance: { ...base, top: 45.8, left: 58, width: 29 },
  overallPercent: { ...base, top: 50.25, left: 33, width: 55 },
  studyCentre: { ...base, top: 54.6, left: 33, width: 58 },
  centreCode: { ...base, top: 58.8, left: 31, width: 62 },
  srNo: { ...base, top: 53.5, left: 14, width: 9 },
  dateOfIssue: { ...base, top: 61, left: 14, align: "left" },
  dateCertified: { ...base, top: 69.2, left: 62, width: 34 },
  /** Present in the original template but commented out — enable if wanted. */
  branchDirector: { ...base, top: 76, left: 6, width: 26, fontSize: 11 },
} satisfies Record<string, FieldStyle>;

export type CertificateFieldKey = keyof typeof CERTIFICATE_FIELDS;

/** Fields the certificate renders. `branchDirector` is off, as it was before. */
export const CERTIFICATE_VISIBLE: CertificateFieldKey[] = [
  "studentName",
  "fatherName",
  "registrationNumber",
  "courseName",
  "duration",
  "performance",
  "overallPercent",
  "studyCentre",
  "centreCode",
  "srNo",
  "dateOfIssue",
  "dateCertified",
];

/** The marksheet uses a lighter, unbolded face and does not wrap. */
const markBase: Partial<FieldStyle> = {
  fontSize: 12,
  align: "left",
  weight: 400,
  letterSpacing: 0.2,
  nowrap: true,
};

export const MARKSHEET_FIELDS = {
  registrationNumber: { ...markBase, top: 29, left: 34 },
  studentName: { ...markBase, top: 38.8, left: 34 },
  dob: { ...markBase, top: 42.2, left: 34 },
  motherName: { ...markBase, top: 45.5, left: 34 },
  fatherName: { ...markBase, top: 48.8, left: 34 },
  courseName: { ...markBase, top: 52.2, left: 34 },
  duration: { ...markBase, top: 55.5, left: 34 },
  studyCentre: { ...markBase, top: 58.8, left: 34 },
  centreCode: { ...markBase, top: 62, left: 34 },
  srNo: { ...markBase, top: 51.8, left: 12 },
  dateOfIssue: { ...markBase, top: 59.2, left: 9 },

  writtenMarks: { ...markBase, top: 31.8, left: 86, width: 8, fontSize: 14, align: "center" },
  practicalMarks: { ...markBase, top: 35.3, left: 86, width: 8, fontSize: 14, align: "center" },
  projectMarks: { ...markBase, top: 39, left: 86, width: 8, fontSize: 14, align: "center" },
  vivaMarks: { ...markBase, top: 42.5, left: 86, width: 8, fontSize: 14, align: "center" },

  overallPercent: { ...markBase, top: 46.5, left: 77, align: "center" },
  performance: { ...markBase, top: 49.9, left: 72, align: "center" },
  dateCertified: { ...markBase, top: 69.2, left: 75, align: "center" },
} satisfies Record<string, FieldStyle>;

export type MarksheetFieldKey = keyof typeof MARKSHEET_FIELDS;

export const MARKSHEET_IMAGES = {
  /** Links back to /student_info so a printed marksheet can be verified. */
  verificationQr: { top: 28.4, left: 47.4, width: 76, height: 76 },
  studentPhoto: { top: 28.8, left: 54.4, width: 69, height: 73 },
} satisfies Record<string, ImageField>;

/**
 * The four marks columns are fixed on the artwork, so the marksheet can only
 * print these subjects. A course scoring anything else still stores its marks —
 * they just have nowhere to go on this particular sheet.
 */
export const MARKSHEET_SUBJECTS = [
  { key: "writtenMarks", subject: "Written Marks" },
  { key: "practicalMarks", subject: "Practical Marks" },
  { key: "projectMarks", subject: "Project Marks" },
  { key: "vivaMarks", subject: "Viva Marks" },
] as const;

/** Turns a field spec into inline CSS for absolute placement over the artwork. */
export function fieldStyle(field: FieldStyle): React.CSSProperties {
  return {
    position: "absolute",
    top: `${field.top}%`,
    left: `${field.left}%`,
    width: field.width === undefined ? undefined : `${field.width}%`,
    fontSize: `${field.fontSize ?? 12}px`,
    fontWeight: field.weight ?? 400,
    letterSpacing: `${field.letterSpacing ?? 0}px`,
    textAlign: field.align ?? "left",
    whiteSpace: field.nowrap ? "nowrap" : "normal",
    color: "#000",
    lineHeight: 1.1,
  };
}
