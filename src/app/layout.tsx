import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Institute of ABC — Computer Education & Skill Development",
    template: "%s · Institute of ABC",
  },
  description:
    "An ISO 9001:2015 certified computer training institute with centres across Bihar. Verify a certificate, browse courses, or find your nearest study centre.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    siteName: "Institute of ABC",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#121212",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
