import type { Metadata } from "next";
import { StudentsBrowser } from "@/components/panel/students/StudentsBrowser";

export const metadata: Metadata = { title: "Marksheets" };

export default function BranchMarksheetsPage() {
  return (
    <StudentsBrowser
      basePath="/branch/students"
      title="Marksheets"
      description="Enter marks for students who have finished their course, then send the marksheet to head office for approval."
    />
  );
}
