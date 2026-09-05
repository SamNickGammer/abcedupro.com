"use client";

import { useState } from "react";
import { useMutation } from "@/lib/use-api";
import { Badge, Card, Field, cx, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/site/icons";
import { MONTHS, type Booking, type SlotDefinition } from "@/components/panel/library/types";

/**
 * One month of one member's booking, with every action that applies to it:
 * confirm a provisional hold, reprice, take payment, extend into more months,
 * or delete this month (or the whole run).
 */
export function BookingCard({
  booking,
  slotDefinitions,
  year,
  onChanged,
}: {
  booking: Booking;
  slotDefinitions: SlotDefinition[];
  year: number;
  onChanged: () => void;
}) {
  const { run, pending, error } = useMutation();
  const [panel, setPanel] = useState<"payment" | "price" | "extend" | "delete" | null>(null);

  const slotLabel = (code: string) =>
    slotDefinitions.find((slot) => slot.id === code)?.time ?? code;

  const act = async (path: string, options: Parameters<typeof run>[1]) => {
    const result = await run(path, options);
    if (result.ok) {
      setPanel(null);
      onChanged();
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-neutral-900">{booking.name}</h3>
            {booking.status === "secured" ? (
              <Badge tone="violet">Provisional</Badge>
            ) : (
              <Badge tone="green">Confirmed</Badge>
            )}
            {booking.payment.status === "paid" ? (
              <Badge tone="green">Paid</Badge>
            ) : (
              <Badge tone="amber">Unpaid</Badge>
            )}
          </div>

          <p className="text-[13px] text-neutral-600">
            Seat <span className="font-semibold">{booking.seat_label}</span>
            <span className="text-neutral-400"> (block {booking.block})</span>
            {booking.phone ? <span className="text-neutral-400"> · {booking.phone}</span> : null}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {booking.slots.map((slot) => (
              <span
                key={slot}
                title={slotLabel(slot)}
                className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600"
              >
                {slot} · {slotLabel(slot)}
              </span>
            ))}
            {booking.lockers.map((locker) => (
              <span
                key={locker}
                className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
              >
                Locker {locker}
              </span>
            ))}
          </div>

          {booking.group_months.length > 1 ? (
            <p className="mt-2 text-xs text-neutral-500">
              Part of a {booking.group_months.length}-month admission:{" "}
              {booking.group_months.map((month) => MONTHS[month - 1]).join(", ")}
            </p>
          ) : null}

          {booking.note ? (
            <p className="mt-2 text-xs italic text-neutral-500">{booking.note}</p>
          ) : null}
        </div>

        <div className="text-right">
          <p className="text-xl font-bold tabular-nums text-neutral-900">
            ₹{booking.price.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-neutral-500">per month</p>
          {booking.payment.status === "paid" ? (
            <p className="mt-1 text-xs text-emerald-700">
              {booking.payment.method} · {booking.payment.paidAt}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3.5">
        {booking.status === "secured" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => act(`/api/library/bookings/${booking.booking_id}/confirm`, { method: "POST" })}
          >
            Confirm
          </Button>
        ) : null}

        {booking.payment.status === "pending" ? (
          <>
            <Button
              size="sm"
              variant={panel === "payment" ? "primary" : "secondary"}
              onClick={() => setPanel(panel === "payment" ? null : "payment")}
            >
              Record payment
            </Button>
            <Button
              size="sm"
              variant={panel === "price" ? "primary" : "ghost"}
              onClick={() => setPanel(panel === "price" ? null : "price")}
            >
              Change price
            </Button>
          </>
        ) : null}

        <Button
          size="sm"
          variant={panel === "extend" ? "primary" : "ghost"}
          onClick={() => setPanel(panel === "extend" ? null : "extend")}
        >
          Extend
        </Button>

        <Button
          size="sm"
          variant={panel === "delete" ? "danger" : "ghost"}
          className="ml-auto"
          onClick={() => setPanel(panel === "delete" ? null : "delete")}
        >
          Delete
        </Button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      {panel === "payment" ? (
        <PaymentPanel
          pending={pending}
          onSubmit={(body) =>
            act(`/api/library/bookings/${booking.booking_id}/payment`, { method: "POST", body })
          }
        />
      ) : null}

      {panel === "price" ? (
        <PricePanel
          current={booking.price}
          pending={pending}
          onSubmit={(monthlyPrice) =>
            act(`/api/library/bookings/${booking.booking_id}/price`, {
              method: "POST",
              body: { monthly_price: monthlyPrice },
            })
          }
        />
      ) : null}

      {panel === "extend" ? (
        <ExtendPanel
          taken={booking.group_months}
          pending={pending}
          onSubmit={(months) =>
            act(`/api/library/bookings/${booking.booking_id}/extend`, {
              method: "POST",
              body: { year, months },
            })
          }
        />
      ) : null}

      {panel === "delete" ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-[13px] font-semibold text-red-900">Delete this booking?</p>
          <p className="mt-0.5 text-[13px] text-red-800">
            Its slots, lockers and payment log go with it. This cannot be undone.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() =>
                act(`/api/library/bookings/${booking.booking_id}?scope=month`, { method: "DELETE" })
              }
            >
              {pending ? <Spinner className="h-3.5 w-3.5 animate-spin" /> : null}
              Just {MONTHS[booking.booking_month - 1]}
            </Button>
            {booking.group_months.length > 1 ? (
              <Button
                size="sm"
                variant="danger"
                disabled={pending}
                onClick={() =>
                  act(`/api/library/bookings/${booking.booking_id}?scope=all`, { method: "DELETE" })
                }
              >
                All {booking.group_months.length} months
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function PaymentPanel({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (body: Record<string, string>) => void;
}) {
  const [method, setMethod] = useState("cash");
  const [collectedBy, setCollectedBy] = useState("");
  const [note, setNote] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ payment_method: method, payment_collected_by: collectedBy, payment_note: note });
      }}
      className="mt-3 grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-4"
    >
      <Field label="Method" htmlFor="pay-method">
        <select
          id="pay-method"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          className={inputClass}
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="bank">Bank transfer</option>
        </select>
      </Field>
      <Field label="Collected by" htmlFor="pay-by" required>
        <input
          id="pay-by"
          required
          value={collectedBy}
          onChange={(event) => setCollectedBy(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Note" htmlFor="pay-note">
        <input
          id="pay-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="flex items-end">
        <Button type="submit" variant="success" disabled={pending} className="w-full">
          {pending ? <Spinner className="h-4 w-4 animate-spin" /> : null}
          Mark paid
        </Button>
      </div>
    </form>
  );
}

function PricePanel({
  current,
  pending,
  onSubmit,
}: {
  current: number;
  pending: boolean;
  onSubmit: (price: number) => void;
}) {
  const [price, setPrice] = useState(String(current));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(Number(price));
      }}
      className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-neutral-50 p-4"
    >
      <Field label="Price per month (₹)" htmlFor="new-price" className="min-w-[160px]">
        <input
          id="new-price"
          type="number"
          min={0}
          required
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner className="h-4 w-4 animate-spin" /> : null}
        Update price
      </Button>
      <p className="text-xs text-neutral-500">
        Only affects this month. A paid booking cannot be repriced.
      </p>
    </form>
  );
}

function ExtendPanel({
  taken,
  pending,
  onSubmit,
}: {
  taken: number[];
  pending: boolean;
  onSubmit: (months: number[]) => void;
}) {
  const [months, setMonths] = useState<number[]>([]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(months);
      }}
      className="mt-3 rounded-xl bg-neutral-50 p-4"
    >
      <p className="mb-2 text-[13px] font-semibold text-neutral-700">
        Carry this seat, slots and lockers into further months
      </p>
      <div className="flex flex-wrap gap-1.5">
        {MONTHS.map((label, index) => {
          const value = index + 1;
          const already = taken.includes(value);
          const active = months.includes(value);

          return (
            <button
              key={label}
              type="button"
              disabled={already}
              onClick={() =>
                setMonths((current) =>
                  current.includes(value)
                    ? current.filter((month) => month !== value)
                    : [...current, value].sort((a, b) => a - b),
                )
              }
              className={cx(
                "rounded-lg px-3 py-1.5 text-[13px] font-semibold transition",
                already
                  ? "cursor-not-allowed bg-neutral-200 text-neutral-400"
                  : active
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-600 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-100",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Months already booked are greyed out. Any month where the seat or a locker has since been
        taken is reported back and skipped rather than failing the whole request.
      </p>
      <Button type="submit" disabled={pending || months.length === 0} className="mt-3">
        {pending ? <Spinner className="h-4 w-4 animate-spin" /> : null}
        Extend into {months.length || "…"} month{months.length === 1 ? "" : "s"}
      </Button>
    </form>
  );
}
