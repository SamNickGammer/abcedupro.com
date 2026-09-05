import { notFound } from "next/navigation";
import { getCertificateData } from "@/lib/documents/data";
import { authoriseDocumentAccess } from "@/lib/documents/access";
import {
  CERTIFICATE_FIELDS,
  CERTIFICATE_TEMPLATE,
  CERTIFICATE_VISIBLE,
} from "@/lib/document-layout";
import { PrintSheet } from "@/components/print/PrintSheet";
import { PrintField } from "@/components/print/PrintField";
import { PrintToolbar } from "@/components/print/PrintToolbar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CertificatePrintPage({
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

  const certificate = await getCertificateData(studentId);
  const calibrate = query.calibrate === "1";
  // `?bare=1` is what the PDF renderer loads — no toolbar, no grid.
  const bare = query.bare === "1";

  return (
    <>
      {bare ? null : (
        <PrintToolbar
          calibrate={calibrate}
          downloadHref={`/api/documents/certificate/${studentId}`}
        />
      )}

      <PrintSheet
        templateSrc={CERTIFICATE_TEMPLATE}
        alt="Certificate"
        calibrate={calibrate && !bare}
      >
        {CERTIFICATE_VISIBLE.map((key) => (
          <PrintField
            key={key}
            name={key}
            field={CERTIFICATE_FIELDS[key]}
            value={certificate.fields[key] ?? ""}
            calibrate={calibrate && !bare}
          />
        ))}
      </PrintSheet>
    </>
  );
}
