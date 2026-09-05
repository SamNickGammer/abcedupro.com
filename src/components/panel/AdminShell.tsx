"use client";

import type { ReactNode } from "react";
import { PanelShell, type PanelUser } from "@/components/panel/PanelShell";
import {
  BookIcon,
  BuildingIcon,
  CheckBadgeIcon,
  CogIcon,
  HomeIcon,
  LibraryIcon,
  UsersIcon,
} from "@/components/panel/icons";

const NAV = [
  { href: "/admin-abc", label: "Dashboard", icon: <HomeIcon />, exact: true },
  { href: "/admin-abc/students", label: "All Students", icon: <UsersIcon /> },
  { href: "/admin-abc/approvals", label: "Certificate Approvals", icon: <CheckBadgeIcon /> },
  { href: "/admin-abc/branches", label: "Branches", icon: <BuildingIcon /> },
  { href: "/admin-abc/courses", label: "Courses", icon: <BookIcon /> },
  { href: "/admin-abc/library", label: "Library", icon: <LibraryIcon /> },
  { href: "/admin-abc/settings", label: "Settings", icon: <CogIcon /> },
];

export function AdminShell({ user, children }: { user: PanelUser; children: ReactNode }) {
  return (
    <PanelShell user={user} nav={NAV} portalLabel="Head Office">
      {children}
    </PanelShell>
  );
}
