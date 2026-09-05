import type { Metadata } from "next";
import { LibraryView } from "@/components/panel/library/LibraryView";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return <LibraryView />;
}
