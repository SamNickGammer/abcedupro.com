import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./print.css";

export const metadata: Metadata = {
  title: "ABC Edu Pro — Document",
  robots: { index: false, follow: false },
};

/**
 * Deliberately outside the site shell: no header, no navigation, nothing that
 * would appear on the printed sheet or in the PDF.
 */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return <div className="print-root">{children}</div>;
}
