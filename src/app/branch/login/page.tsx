import type { Metadata } from "next";
import { Suspense } from "react";
import { BranchLogin } from "./BranchLogin";
import "./login.css";

export const metadata: Metadata = {
  title: "Branch Login - Institute of ABC",
  robots: { index: false, follow: false },
};

export default function BranchLoginPage() {
  return (
    <Suspense>
      <BranchLogin />
    </Suspense>
  );
}
