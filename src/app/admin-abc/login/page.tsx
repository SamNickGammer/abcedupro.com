import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLogin } from "./AdminLogin";
import "./login.css";

export const metadata: Metadata = {
  title: "Admin Login - Institute of ABC",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
