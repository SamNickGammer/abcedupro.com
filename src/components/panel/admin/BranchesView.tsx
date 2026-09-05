"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/use-api";
import type { BranchRow } from "@/types/api";
import { Badge, Card, EmptyState, SectionHeading, cx, inputClass } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/panel/DataTable";
import { PlusIcon, SearchIcon } from "@/components/panel/icons";

export function BranchesView() {
  const { data, loading, error } = useApi<BranchRow[]>("/api/branches");
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();

  // Filtering happens in the browser: there are a handful of branches, so an
  // extra round trip per keystroke would be slower than the list itself.
  const rows = (data ?? [])
    .filter((branch) => branch.role.toLowerCase() !== "admin")
    .filter(
      (branch) =>
        !term ||
        branch.branchName.toLowerCase().includes(term) ||
        branch.branchCode.toLowerCase().includes(term) ||
        branch.city.toLowerCase().includes(term) ||
        `${branch.firstName} ${branch.lastName ?? ""}`.toLowerCase().includes(term),
    );

  const columns: Column<BranchRow>[] = [
    {
      key: "branch",
      header: "Branch",
      render: (row) => (
        <div className="min-w-0">
          <Link
            href={`/admin-abc/branches/${row.id}`}
            className="block truncate font-semibold text-neutral-900 hover:underline"
          >
            {row.branchName}
          </Link>
          <p className="truncate font-mono text-xs uppercase text-neutral-500">{row.branchCode}</p>
        </div>
      ),
    },
    {
      key: "manager",
      header: "Manager",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px]">
            {row.firstName} {row.lastName ?? ""}
          </p>
          <p className="truncate text-xs text-neutral-500">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (row) => (
        <span className="whitespace-nowrap text-[13px]">
          {row.city}, {row.state}
        </span>
      ),
    },
    {
      key: "credit",
      header: "Credits",
      align: "right",
      render: (row) => (
        <span
          className={cx(
            "font-semibold tabular-nums",
            row.credit < row.creditPerCertificate
              ? "text-red-600"
              : row.credit < row.creditPerCertificate * 3
                ? "text-amber-600"
                : "text-neutral-900",
          )}
          title={`${row.creditPerCertificate} per certificate`}
        >
          {row.credit.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) =>
        row.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>,
    },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Head office"
        title="Branches"
        description="Franchise centres, their credit balances and who runs them."
        actions={
          <ButtonLink href="/admin-abc/branches/new">
            <PlusIcon className="h-4 w-4" />
            New branch
          </ButtonLink>
        }
      />

      <Card padded={false} className="p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, code, city or manager"
            aria-label="Search branches"
            className={`${inputClass} pl-9`}
          />
        </div>
      </Card>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        empty={
          <EmptyState
            title={term ? "No branches match that search" : "No branches yet"}
            description={term ? undefined : "Create the first franchise centre to get started."}
            action={
              term ? undefined : (
                <ButtonLink href="/admin-abc/branches/new">
                  <PlusIcon className="h-4 w-4" />
                  New branch
                </ButtonLink>
              )
            }
          />
        }
      />
    </div>
  );
}
