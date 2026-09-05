import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getMarksheetData } from "@/lib/documents/data";
import {
  MARKSHEET_FIELDS,
  MARKSHEET_IMAGES,
  MARKSHEET_TEMPLATE,
  type MarksheetFieldKey,
} from "@/lib/document-layout";
import { PrintSheet } from "@/components/print/PrintSheet";
import { PrintField } from "@/components/print/PrintField";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { authoriseDocumentAccess } from "@/lib/documents/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MarksheetPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ calibrate?: string; bare?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const studentId = Number(id);
  if (!Number.isInteger(studentId) || studentId <= 0) notFound();

  await authoriseDocumentAccess(studentId);

  const marksheet = await getMarksheetData(studentId);
  const calibrate = query.calibrate === "1";
  const bare = query.bare === "1";
  const showGuides = calibrate && !bare;

  // Generated locally rather than fetched from api.qrserver.com, so printing a
  // marksheet no longer depends on a third-party service being reachable — and
  // no student's verification URL leaves the server.
  const qrDataUri = marksheet.verificationUrl
    ? await QRCode.toDataURL(marksheet.verificationUrl, {
        margin: 0,
        width: 320,
        errorCorrectionLevel: "M",
      })
    : null;

  return (
    <>
      {bare ? null : (
        <PrintToolbar
          calibrate={calibrate}
          downloadHref={`/api/documents/marksheet/${studentId}`}
        />
      )}

      <PrintSheet
        templateSrc={MARKSHEET_TEMPLATE}
        alt="Marksheet"
        calibrate={showGuides}
      >
        {(Object.keys(MARKSHEET_FIELDS) as MarksheetFieldKey[]).map((key) => (
          <PrintField
            key={key}
            name={key}
            field={MARKSHEET_FIELDS[key]}
            value={marksheet.fields[key] ?? ""}
            calibrate={showGuides}
          />
        ))}

        {qrDataUri ? (
          /* eslint-disable-next-line @next/next/no-img-element -- fixed-size print asset */
          <img
            src={qrDataUri}
            alt="Verification QR code"
            style={{
              position: "absolute",
              top: `${MARKSHEET_IMAGES.verificationQr.top}%`,
              left: `${MARKSHEET_IMAGES.verificationQr.left}%`,
              width: MARKSHEET_IMAGES.verificationQr.width,
              height: MARKSHEET_IMAGES.verificationQr.height,
              background: "#fff",
              padding: 2,
              zIndex: 1,
            }}
          />
        ) : null}

        {marksheet.studentPhotoSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element -- fixed-size print asset */
          <img
            src={marksheet.studentPhotoSrc}
            alt="Student"
            style={{
              position: "absolute",
              top: `${MARKSHEET_IMAGES.studentPhoto.top}%`,
              left: `${MARKSHEET_IMAGES.studentPhoto.left}%`,
              width: MARKSHEET_IMAGES.studentPhoto.width,
              height: MARKSHEET_IMAGES.studentPhoto.height,
              objectFit: "cover",
              zIndex: 1,
            }}
          />
        ) : null}
      </PrintSheet>
    </>
  );
}
