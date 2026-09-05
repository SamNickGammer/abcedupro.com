"use client";

import type { ReactNode } from "react";
import { PanelShell, type PanelUser } from "@/components/panel/PanelShell";
import { CreditChip } from "@/components/panel/CreditChip";
import {
  CheckBadgeIcon,
  ClipboardIcon,
  HomeIcon,
  UserPlusIcon,
  UsersIcon,
} from "@/components/panel/icons";

const NAV = [
  { href: "/branch", label: "Dashboard", icon: <HomeIcon />, exact: true },
  { href: "/branch/students", label: "All Students", icon: <UsersIcon /> },
  { href: "/branch/students/new", label: "Enrol Student", icon: <UserPlusIcon /> },
  { href: "/branch/marksheets", label: "Marksheets", icon: <ClipboardIcon /> },
  { href: "/branch/approved", label: "Approved", icon: <CheckBadgeIcon /> },
];

export function BranchShell({ user, children }: { user: PanelUser; children: ReactNode }) {
  return (
    <PanelShell
      user={user}
      nav={NAV}
      portalLabel="Branch"
      headerExtra={<CreditChip initialCredit={user.credit} perCertificate={user.credit_per_certificate} />}
    >
      {children}
    </PanelShell>
  );
}
