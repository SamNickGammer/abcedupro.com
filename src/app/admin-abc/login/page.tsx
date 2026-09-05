import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/panel/LoginScreen";

export const metadata: Metadata = { title: "Admin Sign In", robots: { index: false } };

export default function SuperAdminLoginPage() {
  return (
    <Suspense>
      <LoginScreen
        portal="superadmin"
        title="Head office"
        subtitle="Administrator access to every branch, course and certificate."
        fallbackRedirect="/admin-abc"
      />
    </Suspense>
  );
}
