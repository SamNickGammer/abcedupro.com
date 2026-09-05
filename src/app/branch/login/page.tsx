import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/panel/LoginScreen";

export const metadata: Metadata = { title: "Branch Sign In", robots: { index: false } };

export default function BranchLoginPage() {
  return (
    <Suspense>
      <LoginScreen
        portal="branch"
        title="Branch portal"
        subtitle="Sign in with the branch code and password issued by head office."
        fallbackRedirect="/branch"
      />
    </Suspense>
  );
}
