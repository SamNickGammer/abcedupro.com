"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/lib/use-api";
import { query } from "@/lib/client";
import { Badge, Card, EmptyState, SectionHeading, StatTile, cx, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { PlusIcon, SearchIcon } from "@/components/panel/icons";
import { SeatMap } from "@/components/panel/library/SeatMap";
import { AdmitDialog } from "@/components/panel/library/AdmitDialog";
import { BookingCard } from "@/components/panel/library/BookingCard";
import {
  MONTHS,
  type Booking,
  type LibraryConfig,
  type LibraryMeta,
  type MonthSummary,
} from "@/components/panel/library/types";

type DashboardPayload = {
  year: number;
  months: MonthSummary[];
  meta: LibraryMeta & { config: LibraryConfig };
};

/**
 * Library seat, slot and locker booking, month by month.
 *
 * A member's admission spans one or more months of a year, and each month is a
 * separate booking row sharing a group id — so a six-month admission can be
 * paid for, extended or cancelled a month at a time.
 */
export function LibraryView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [admitting, setAdmitting] = useState(false);

  const dashboard = useApi<DashboardPayload>(`/api/library/dashboard${query({ year })}`);
  const bookings = useApi<Booking[]>(`/api/library/bookings${query({ year, month, search })}`);

  const config = dashboard.data?.meta.config;
  const summary = dashboard.data?.months.find((entry) => entry.month === month);

  // Seats already taken this month, for the read-only map.
  const { occupied, labels } = useMemo(() => {
    const taken = new Set<string>();
    const names = new Map<string, string>();

    for (const booking of bookings.data ?? []) {
      taken.add(booking.seat_id);
      const existing = names.get(booking.seat_id);
      const line = `${booking.seat_label} — ${booking.name} (${booking.slots.join(", ")})`;
      names.set(booking.seat_id, existing ? `${existing}\n${line}` : line);
    }

    return { occupied: taken, labels: names };
  }, [bookings.data]);

  const refreshAll = () => {
    dashboard.refresh();
    bookings.refresh();
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Head office"
        title="Library"
        description="Seat, slot and locker bookings. A seat can be held by different members in different time slots."
        actions={
          <Button onClick={() => setAdmitting(true)} disabled={!config}>
            <PlusIcon className="h-4 w-4" />
            Admit a member
          </Button>
        }
      />

      {/* Year + month picker */}
      <Card padded={false} className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setYear((value) => value - 1)}
              aria-label="Previous year"
            >
              ‹
            </Button>
            <span className="w-14 text-center text-sm font-bold tabular-nums">{year}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setYear((value) => value + 1)}
              aria-label="Next year"
            >
              ›
            </Button>
          </div>

          <div className="flex flex-wrap gap-1">
            {MONTHS.map((label, index) => {
              const value = index + 1;
              const monthData = dashboard.data?.months[index];

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMonth(value)}
                  className={cx(
                    "relative rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition",
                    month === value
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100",
                  )}
                >
                  {label}
                  {monthData && monthData.total_bookings > 0 ? (
                    <span
                      className={cx(
                        "ml-1 text-[10px] tabular-nums",
                        month === value ? "text-white/70" : "text-neutral-400",
                      )}
                    >
                      {monthData.total_bookings}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {dashboard.error ? (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{dashboard.error}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label={`${MONTHS[month - 1]} bookings`}
          value={dashboard.loading ? "—" : (summary?.total_bookings ?? 0)}
          hint={summary ? `${summary.secured_count} provisional` : undefined}
        />
        <StatTile
          label="Collected"
          value={dashboard.loading ? "—" : `₹${(summary?.collected_amount ?? 0).toLocaleString("en-IN")}`}
          tone="green"
        />
        <StatTile
          label="Outstanding"
          value={dashboard.loading ? "—" : `₹${(summary?.pending_amount ?? 0).toLocaleString("en-IN")}`}
          tone={summary?.pending_amount ? "amber" : "neutral"}
        />
        <StatTile
          label="Occupancy"
          value={dashboard.loading ? "—" : `${summary?.occupancy_percent ?? 0}%`}
          hint={
            dashboard.data
              ? `${summary?.occupied_slot_seats ?? 0} of ${dashboard.data.meta.total_seats * dashboard.data.meta.total_slots} seat-slots`
              : undefined
          }
        />
        <StatTile
          label="Lockers in use"
          value={dashboard.loading ? "—" : (summary?.used_lockers ?? 0)}
          hint={dashboard.data ? `of ${dashboard.data.meta.total_lockers}` : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card padded={false} className="p-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by member name, phone or seat"
                aria-label="Search bookings"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Card>

          {bookings.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Card key={index}>
                  <span className="block h-4 w-1/3 animate-pulse rounded bg-neutral-200/80" />
                  <span className="mt-3 block h-3 w-2/3 animate-pulse rounded bg-neutral-200/60" />
                </Card>
              ))}
            </div>
          ) : (bookings.data ?? []).length === 0 ? (
            <EmptyState
              title={`No bookings in ${MONTHS[month - 1]} ${year}`}
              description={
                search
                  ? "No member matches that search this month."
                  : "Admit a member to book a seat, slots and a locker."
              }
              action={
                search ? undefined : (
                  <Button onClick={() => setAdmitting(true)} disabled={!config}>
                    <PlusIcon className="h-4 w-4" />
                    Admit a member
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {bookings.data?.map((booking) => (
                <BookingCard
                  key={booking.booking_id}
                  booking={booking}
                  slotDefinitions={config?.slot_definitions ?? []}
                  year={year}
                  onChanged={refreshAll}
                />
              ))}
            </div>
          )}
        </div>

        <Card>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Seat map — {MONTHS[month - 1]} {year}
            </h2>
            <Badge tone="neutral">{occupied.size} seats in use</Badge>
          </div>

          {config ? (
            <SeatMap
              layout={config.seat_layout}
              occupied={occupied}
              selected={null}
              bookedLabels={labels}
            />
          ) : (
            <p className="text-sm text-neutral-500">Loading layout…</p>
          )}
        </Card>
      </div>

      {admitting && config ? (
        <AdmitDialog
          config={config}
          year={year}
          defaultMonth={month}
          onClose={() => setAdmitting(false)}
          onDone={() => {
            setAdmitting(false);
            refreshAll();
          }}
        />
      ) : null}
    </div>
  );
}
