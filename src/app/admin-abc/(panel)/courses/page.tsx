import type { Metadata } from "next";
import { SaCourses } from "@/components/panel/sa/SaCourses";

export const metadata: Metadata = { title: "Courses" };

export default function CoursesPage() {
  return <SaCourses />;
}
