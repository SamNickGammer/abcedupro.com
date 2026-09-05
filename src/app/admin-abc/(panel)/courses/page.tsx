import type { Metadata } from "next";
import { CoursesView } from "@/components/panel/admin/CoursesView";

export const metadata: Metadata = { title: "Courses" };

export default function CoursesPage() {
  return <CoursesView />;
}
