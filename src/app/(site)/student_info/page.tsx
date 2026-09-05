import type { Metadata } from "next";
import { PageHero } from "@/components/site/PageHero";
import { VerifyForm } from "@/components/site/VerifyForm";

export const metadata: Metadata = {
  title: "Verify a Certificate",
  description:
    "Check an Institute of ABC certificate or marksheet using the registration number and date of birth printed on it.",
};

/**
 * The page every certificate points at, via its printed URL and QR code. The
 * URL shape `/student_info?rn=…&dob=…` is fixed by documents already issued and
 * must keep working, so those parameters pre-fill and auto-submit the form.
 */
export default async function StudentInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ rn?: string; dob?: string }>;
}) {
  const { rn, dob } = await searchParams;

  return (
    <>
      <PageHero
        eyebrow="Student portal"
        title="Verify a Certificate"
        description="Enter the registration number and date of birth printed on the certificate or marksheet. Both must match for the record to be shown."
      />
      <section className="bg-neutral-50 px-6 py-14">
        <VerifyForm initialRegistrationNumber={rn ?? ""} initialDob={dob ?? ""} />
      </section>
    </>
  );
}
