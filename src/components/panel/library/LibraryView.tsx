"use client";

import { useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/use-api";
import { query } from "@/lib/client";
import { SearchIcon } from "@/components/panel/icons";
import { SeatMap } from "@/components/panel/library/SeatMap";
import { AdmitDialog } from "@/components/panel/library/AdmitDialog";
import { BookingCard } from "@/components/panel/library/BookingCard";
import { ConfigDialog } from "@/components/panel/library/ConfigDialog";
import {
  MONTHS,
  type Booking,
  type LibraryConfig,
  type LibraryMeta,
  type MonthSummary,
  type SlotDefinition,
} from "@/components/panel/library/types";
import "@/components/panel/library/library.css";

type DashboardPayload = {
  year: number;
  months: MonthSummary[];
  meta: LibraryMeta & { config: LibraryConfig };
};

const inr = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

/**
 * Library seat, slot and locker booking, month by month.
 *
 * A member's admission spans one or more months of a year, and each month is a
 * separate booking row sharing a group id — so a six-month admission can be
 * paid for, extended or cancelled a month at a time.
 *
 * Two things drive the layout. The first is that a seat is not booked, a
 * seat-slot is: the same chair is four separate things to sell across the day,
 * so both the year strip and the seat map are read per slot rather than in
 * aggregate. The second is that picking a month is not a decision worth
 * confirming — clicking a month shows it, with no second "open" step.
 */
export function LibraryView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [admitting, setAdmitting] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  /** `null` means every slot — a seat counts as taken if any slot holds it. */
  const [slotFilter, setSlotFilter] = useState<string | null>(null);

  const stripRef = useRef<HTMLDivElement>(null);

  const dashboard = useApi<DashboardPayload>(`/api/library/dashboard${query({ year })}`);
  const bookings = useApi<Booking[]>(`/api/library/bookings${query({ year, month, search })}`);

  const config = dashboard.data?.meta.config;
  // Stable identities: the `?? []` fallbacks are fresh arrays every render,
  // which would re-run every memo below them for nothing.
  const slots = useMemo(() => config?.slot_definitions ?? [], [config]);
  const months = useMemo(() => dashboard.data?.months ?? [], [dashboard.data]);
  const summary = months.find((entry) => entry.month === month);
  const seatsTotal = dashboard.data?.meta.total_seats ?? 0;

  // Seats taken this month, honouring the slot filter. Marking a seat red
  // because its 6AM slot is sold, while you are booking the evening, was the
  // single most misleading thing about reading this map in aggregate.
  const { occupied, labels, freeBySlot } = useMemo(() => {
    const taken = new Set<string>();
    const names = new Map<string, string>();
    const perSlot = new Map<string, Set<string>>();

    for (const booking of bookings.data ?? []) {
      for (const slot of booking.slots) {
        const set = perSlot.get(slot) ?? new Set<string>();
        set.add(booking.seat_id);
        perSlot.set(slot, set);
      }

      if (slotFilter && !booking.slots.includes(slotFilter)) continue;

      taken.add(booking.seat_id);
      const line = `${booking.seat_label} — ${booking.name} (${booking.slots.join(", ")})`;
      const existing = names.get(booking.seat_id);
      names.set(booking.seat_id, existing ? `${existing}\n${line}` : line);
    }

    const free = new Map<string, number>();
    for (const slot of slots) {
      free.set(slot.id, Math.max(0, seatsTotal - (perSlot.get(slot.id)?.size ?? 0)));
    }

    return { occupied: taken, labels: names, freeBySlot: free };
  }, [bookings.data, slotFilter, slots, seatsTotal]);

  // Whole-year figures, so the strip is not the only thing on the page that
  // knows more than one month exists.
  const yearTotals = useMemo(() => {
    let members = 0;
    let collected = 0;
    let pending = 0;
    let busiest: MonthSummary | null = null;

    for (const entry of months) {
      members += entry.total_bookings;
      collected += entry.collected_amount;
      pending += entry.pending_amount;
      if (!busiest || entry.total_bookings > busiest.total_bookings) busiest = entry;
    }

    return { members, collected, pending, busiest };
  }, [months]);

  const refreshAll = () => {
    dashboard.refresh();
    bookings.refresh();
  };

  // Arrow keys walk the year, wrapping into the next or previous one.
  const onStripKey = (event: React.KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();

    const next = month + step;
    if (next < 1) {
      setYear((value) => value - 1);
      setMonth(12);
    } else if (next > 12) {
      setYear((value) => value + 1);
      setMonth(1);
    } else {
      setMonth(next);
    }

    requestAnimationFrame(() => {
      stripRef.current
        ?.querySelector<HTMLButtonElement>(".lib-month.active")
        ?.focus({ preventScroll: true });
    });
  };

  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <div className="lib-shell">
      <div className="lib-card">
        <div className="lib-toolbar">
          <div>
            <h1 className="lib-title font-HellixB">Library Management</h1>
            <p className="lib-subtitle font-HellixR">
              Separate from students, fully database-backed, and configurable from one place.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="lib-btn lib-btn-light font-HellixB"
              onClick={() => setConfiguring(true)}
              disabled={!config}
            >
              <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Library Settings
            </button>
            <button
              type="button"
              className="lib-btn lib-btn-dark font-HellixB"
              onClick={() => setAdmitting(true)}
              disabled={!config}
            >
              <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
              </svg>
              Admit a member
            </button>
          </div>
        </div>
      </div>

      {dashboard.error ? (
        <div
          className="lib-card"
          style={{ padding: "14px 18px", borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}
        >
          {dashboard.error}
        </div>
      ) : null}

      {/* ------------------------------------------------------- year strip */}
      <div className="lib-card">
        <div className="lib-section">
          <div className="lib-year-head">
            <div>
              <div className="lib-mini-label font-HellixB">Library year</div>
              <div style={{ fontSize: 15, color: "#111827", marginTop: 3 }} className="font-HellixB">
                {monthLabel}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <SlotLegend slots={slots} />
              <div className="lib-year-nav">
                <button type="button" onClick={() => setYear((value) => value - 1)} aria-label="Previous year">
                  ‹
                </button>
                <span className="lib-year-value">{year}</span>
                <button type="button" onClick={() => setYear((value) => value + 1)} aria-label="Next year">
                  ›
                </button>
              </div>
            </div>
          </div>

          <div
            ref={stripRef}
            className="lib-year-strip"
            role="tablist"
            aria-label="Months"
            onKeyDown={onStripKey}
          >
            {MONTHS.map((label, index) => {
              const value = index + 1;
              const data = months.find((entry) => entry.month === value);

              return (
                <MonthTile
                  key={label}
                  label={label}
                  data={data}
                  slots={slots}
                  seatsTotal={seatsTotal}
                  selected={month === value}
                  isCurrent={year === now.getFullYear() && value === now.getMonth() + 1}
                  loading={dashboard.loading}
                  onSelect={() => setMonth(value)}
                />
              );
            })}
          </div>

          <div className="lib-year-totals">
            <div className="lib-total">
              <span className="lib-total-value font-HellixB">
                {dashboard.loading ? "—" : yearTotals.members.toLocaleString("en-IN")}
              </span>
              <span className="lib-total-label font-HellixB">Bookings in {year}</span>
            </div>
            <div className="lib-total">
              <span className="lib-total-value font-HellixB" style={{ color: "#16a34a" }}>
                {dashboard.loading ? "—" : inr(yearTotals.collected)}
              </span>
              <span className="lib-total-label font-HellixB">Collected</span>
            </div>
            <div className="lib-total">
              <span
                className="lib-total-value font-HellixB"
                style={{ color: yearTotals.pending ? "#dc2626" : "#111827" }}
              >
                {dashboard.loading ? "—" : inr(yearTotals.pending)}
              </span>
              <span className="lib-total-label font-HellixB">Outstanding</span>
            </div>
            {yearTotals.busiest && yearTotals.busiest.total_bookings > 0 ? (
              <div className="lib-total">
                <span className="lib-total-value font-HellixB">
                  {yearTotals.busiest.month_label} · {yearTotals.busiest.occupancy_percent}%
                </span>
                <span className="lib-total-label font-HellixB">Busiest month</span>
              </div>
            ) : null}
            <span className="lib-inline-note font-HellixR" style={{ marginLeft: "auto" }}>
              {seatsTotal} seats × {slots.length} slots · arrow keys move month
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- month figures */}
      <div className="lib-card">
        <div className="lib-section">
          <div className="lib-stat-grid" style={{ marginBottom: 14 }}>
            <StatCard
              value={summary?.total_bookings ?? 0}
              label="Total members"
              loading={dashboard.loading}
            />
            <StatCard
              value={summary?.confirmed_count ?? 0}
              label="Confirmed"
              color="#16a34a"
              loading={dashboard.loading}
            />
            <StatCard
              value={summary?.secured_count ?? 0}
              label="On hold"
              color="#d97706"
              loading={dashboard.loading}
            />
            <StatCard
              value={summary?.used_lockers ?? 0}
              label="Lockers used"
              color="#7c3aed"
              hint={dashboard.data ? `of ${dashboard.data.meta.total_lockers}` : undefined}
              loading={dashboard.loading}
            />
          </div>

          <div className="lib-revenue-row">
            <div className="lib-info-card">
              <div className="font-HellixB" style={{ fontSize: 20, color: "#111827" }}>
                {inr((summary?.collected_amount ?? 0) + (summary?.pending_amount ?? 0))}
              </div>
              <div className="lib-inline-note font-HellixR">Expected</div>
            </div>
            <div className="lib-info-card">
              <div className="font-HellixB" style={{ fontSize: 20, color: "#16a34a" }}>
                {inr(summary?.collected_amount ?? 0)}
              </div>
              <div className="lib-inline-note font-HellixR">Collected</div>
            </div>
            <div className="lib-info-card">
              <div className="font-HellixB" style={{ fontSize: 20, color: "#dc2626" }}>
                {inr(summary?.pending_amount ?? 0)}
              </div>
              <div className="lib-inline-note font-HellixR">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------- seat map + member list */}
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0, 1fr) 420px" }} className="lib-split">
        <div className="lib-shell">
          <div className="lib-card">
            <div className="lib-section" style={{ paddingBottom: 20 }}>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    pointerEvents: "none",
                    display: "flex",
                  }}
                >
                  <SearchIcon className="h-4 w-4" />
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by member name, phone or seat"
                  aria-label="Search bookings"
                  className="lib-search font-HellixR"
                />
              </div>
            </div>
          </div>

          {bookings.loading ? (
            <div className="lib-shell">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="lib-card" style={{ padding: 20 }}>
                  <div className="lib-skel" style={{ height: 15, width: "34%" }} />
                  <div className="lib-skel" style={{ height: 11, width: "62%", marginTop: 12 }} />
                  <div className="lib-skel" style={{ height: 11, width: "48%", marginTop: 8 }} />
                </div>
              ))}
            </div>
          ) : (bookings.data ?? []).length === 0 ? (
            <div className="lib-card">
              <div className="lib-empty font-HellixR">
                <div className="font-HellixB" style={{ fontSize: 15, color: "#374151", marginBottom: 6 }}>
                  No bookings in {monthLabel}
                </div>
                {search
                  ? "No member matches that search this month."
                  : "Admit a member to book a seat, slots and a locker."}
              </div>
            </div>
          ) : (
            <div className="lib-shell">
              {bookings.data?.map((booking) => (
                <BookingCard
                  key={booking.booking_id}
                  booking={booking}
                  slotDefinitions={slots}
                  year={year}
                  onChanged={refreshAll}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lib-card" style={{ alignSelf: "start", position: "sticky", top: 18 }}>
          <div className="lib-section">
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div className="lib-mini-label font-HellixB">Seat map — {monthLabel}</div>
              <span className="lib-inline-note font-HellixR">
                {occupied.size} of {seatsTotal} taken
              </span>
            </div>

            <div className="lib-slot-strip" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className={`lib-pill font-HellixB${slotFilter === null ? " active" : ""}`}
                onClick={() => setSlotFilter(null)}
              >
                All slots
              </button>
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  title={slot.time}
                  className={`lib-pill font-HellixB${slotFilter === slot.id ? " active" : ""}`}
                  style={
                    slotFilter === slot.id
                      ? { background: slot.color ?? "#111827", borderColor: slot.color ?? "#111827" }
                      : undefined
                  }
                  onClick={() => setSlotFilter(slot.id)}
                >
                  <span className="lib-pill-dot" style={{ background: slot.color ?? "#111827" }} />
                  {slot.id}
                  <span className="lib-pill-free">{freeBySlot.get(slot.id) ?? 0} free</span>
                </button>
              ))}
            </div>

            {config ? (
              <SeatMap
                layout={config.seat_layout}
                occupied={occupied}
                selected={null}
                bookedLabels={labels}
              />
            ) : (
              <p className="lib-inline-note font-HellixR">Loading layout…</p>
            )}
          </div>
        </div>
      </div>

      {configuring && config ? (
        <ConfigDialog
          config={config}
          onClose={() => setConfiguring(false)}
          onSaved={() => {
            setConfiguring(false);
            refreshAll();
          }}
        />
      ) : null}

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

      <style>{`@media (max-width: 1280px) { .lib-split { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

/** One month in the year strip: how many, how full per slot, and what is owed. */
function MonthTile({
  label,
  data,
  slots,
  seatsTotal,
  selected,
  isCurrent,
  loading,
  onSelect,
}: {
  label: string;
  data: MonthSummary | undefined;
  slots: SlotDefinition[];
  seatsTotal: number;
  selected: boolean;
  isCurrent: boolean;
  loading: boolean;
  onSelect: () => void;
}) {
  const count = data?.total_bookings ?? 0;

  const title = data
    ? [
        `${data.month_label} — ${count} booking${count === 1 ? "" : "s"}, ${data.occupancy_percent}% of capacity`,
        ...slots.map((slot) => {
          const used = data.slot_usage?.[slot.id] ?? 0;
          return `${slot.label} (${slot.time}): ${seatsTotal - used} of ${seatsTotal} seats free`;
        }),
        data.pending_amount ? `Outstanding: ₹${data.pending_amount.toLocaleString("en-IN")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : label;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      title={title}
      onClick={onSelect}
      className={[
        "lib-month",
        selected ? "active" : "",
        isCurrent ? "current" : "",
        count === 0 ? "empty" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="lib-month-name font-HellixB">{label}</div>
      <div className="lib-month-count font-HellixB">{loading ? "·" : count}</div>

      <div className="lib-slot-bars">
        {slots.map((slot) => {
          const used = data?.slot_usage?.[slot.id] ?? 0;
          const share = seatsTotal > 0 ? (used / seatsTotal) * 100 : 0;
          // A single booking is worth under 1% of the room; floor it at a
          // visible tick so "one seat sold" never reads as "none".
          const percent = used === 0 ? 0 : Math.min(100, Math.max(9, share));

          return (
            <div key={slot.id} className="lib-slot-bar">
              <span style={{ width: `${percent}%`, background: slot.color ?? "#111827" }} />
            </div>
          );
        })}
      </div>

      <div className="lib-month-foot font-HellixB">
        <span>{data?.occupancy_percent ?? 0}%</span>
        {data?.pending_amount ? <span className="lib-due-dot" title="Payment outstanding" /> : null}
      </div>
    </button>
  );
}

function SlotLegend({ slots }: { slots: SlotDefinition[] }) {
  if (slots.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {slots.map((slot) => (
        <span
          key={slot.id}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280" }}
          className="font-HellixR"
        >
          <span
            style={{ width: 9, height: 4, borderRadius: 999, background: slot.color ?? "#111827" }}
          />
          {slot.id} · {slot.time}
        </span>
      ))}
    </div>
  );
}

function StatCard({
  value,
  label,
  color = "#111827",
  hint,
  loading,
}: {
  value: number;
  label: string;
  color?: string;
  hint?: string;
  loading: boolean;
}) {
  return (
    <div className="lib-stat-card">
      <div className="lib-stat-value font-HellixB" style={{ color }}>
        {loading ? "—" : value.toLocaleString("en-IN")}
      </div>
      <div className="lib-stat-label font-HellixB">
        {label}
        {hint ? <span style={{ color: "#c3c8d0" }}> {hint}</span> : null}
      </div>
    </div>
  );
}
