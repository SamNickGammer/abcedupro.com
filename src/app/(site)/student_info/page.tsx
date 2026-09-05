import type { Metadata } from "next";
import { StudentVerification } from "./StudentVerification";
import "./student-info.css";

export const metadata: Metadata = {
  title: "Student Verification",
  description:
    "Search and verify student information using your registration number and date of birth.",
};

/**
 * The page every certificate points at, via its printed URL and QR code. The
 * `?rn=` / `?dob=` shape is fixed by documents already issued and must keep
 * working, so those parameters pre-fill and auto-search.
 */
export default async function StudentInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ rn?: string; dob?: string }>;
}) {
  const { rn, dob } = await searchParams;

  return <StudentVerification initialRegNo={rn ?? ""} initialDob={dob ?? ""} />;
}
