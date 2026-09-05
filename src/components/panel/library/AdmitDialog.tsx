"use client";

import { useEffect, useMemo, useState } from "react";
import { api, query } from "@/lib/client";
import { useMutation } from "@/lib/use-api";
import { Field, cx, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/site/icons";
import { SeatMap } from "@/components/panel/library/SeatMap";
import { MONTHS, type LibraryConfig } from "@/components/panel/library/types";

/**
 * Admitting a member: pick the months, the time slots, then a seat.
 *
 * Availability is re-fetched whenever the months or slots change, because a
 * seat is only "taken" for the specific combination being booked — the same
 * seat can hold a morning member and an evening member in the same month.
 */
export function AdmitDialog({
  config,
  year,
  defaultMonth,
  onClose,
  onDone,
}: {
  config: LibraryConfig;
  year: number;
  defaultMonth: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { run, pending, error, fieldErrors } = useMutation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [months, setMonths] = useState<number[]>([defaultMonth]);
  const [slots, setSlots] = useState<string[]>([]);
  const [seatId, setSeatId] = useState<string | null>(null);
  const [lockers, setLockers] = useState<number[]>([]);
  const [status, setStatus] = useState<"confirmed" | "secured">("confirmed");
  const [customPrice, setCustomPrice] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [collectedBy, setCollectedBy] = useState("");

  const [occupied, setOccupied] = useState<Set<string>>(new Set());
  const [usedLockers, setUsedLockers] = useState<Set<number>>(new Set());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (months.length === 0 || slots.length === 0) {
      setOccupied(new Set());
      setUsedLockers(new Set());
      return;
    }

    const controller = new AbortController();
    setChecking(true);

    api<{ occupied_seat_ids: string[]; used_lockers: number[] }>("/api/library/availability", {
      method: "POST",
      body: { year, months, slots },
      signal: controller.signal,
    })
      .then(({ data }) => {
        setOccupied(new Set(data.occupied_seat_ids));
        setUsedLockers(new Set(data.used_lockers));
      })
      .catch(() => {
        /* the server re-checks on submit and the unique indexes are the backstop */
      })
      .finally(() => setChecking(false));

    return () => controller.abort();
  }, [year, months, slots]);

  // Clear a seat or locker that has just become unavailable.
  useEffect(() => {
    if (seatId && occupied.has(seatId)) setSeatId(null);
    setLockers((current) => current.filter((locker) => !usedLockers.has(locker)));
  }, [occupied, usedLockers, seatId]);

  const price = useMemo(() => {
    if (customPrice !== "") return Number(customPrice);
    const tier = config.pricing_tiers[String(slots.length)];
    const base = Number.isFinite(tier) ? Number(tier) : 300;
    return base + lockers.length * Number(config.locker_price ?? 0);
  }, [customPrice, slots.length, lockers.length, config]);

  const canSubmit =
    name.trim() !== "" &&
    months.length > 0 &&
    slots.length > 0 &&
    seatId !== null &&
    (paymentStatus === "pending" || (paymentMethod !== "" && collectedBy.trim() !== ""));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!seatId) return;

    const result = await run("/api/library/admit", {
      method: "POST",
      body: {
        year,
        months,
        name: name.trim(),
        phone: phone || undefined,
        note: note || undefined,
        status,
        block: seatId.split("_")[0],
        seat_id: seatId,
        slots,
        lockers,
        custom_price: customPrice === "" ? undefined : Number(customPrice),
        payment_status: paymentStatus,
        payment_method: paymentStatus === "paid" ? paymentMethod : undefined,
        payment_collected_by: paymentStatus === "paid" ? collectedBy : undefined,
      },
    });

    if (result.ok) onDone();
  }

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 sm:p-6">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Admit a library member"
        className="my-auto w-full max-w-4xl space-y-5 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900">Admit a member</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Booking for {year}. Each month selected becomes its own row, so they can be paid for or
            cancelled separately.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Full name" htmlFor="lib-name" error={fieldErrors.name} required>
            <input
              id="lib-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Phone" htmlFor="lib-phone" error={fieldErrors.phone}>
            <input
              id="lib-phone"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Note" htmlFor="lib-note">
            <input
              id="lib-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={inputClass}
              placeholder="Optional"
            />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-neutral-700">
            Months <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MONTHS.map((label, index) => {
              const value = index + 1;
              const active = months.includes(value);

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMonths((current) => toggle(current, value).sort((a, b) => a - b))}
                  className={cx(
                    "rounded-lg px-3 py-1.5 text-[13px] font-semibold transition",
                    active
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-neutral-700">
            Time slots <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {config.slot_definitions.map((slot) => {
              const active = slots.includes(slot.id);

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSlots((current) => toggle(current, slot.id))}
                  className={cx(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition",
                    active
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: slot.color ?? "#9ca3af" }}
                  />
                  {slot.label}
                  <span className={cx("font-normal", active ? "text-white/60" : "text-neutral-400")}>
                    {slot.time}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold text-neutral-700">
              Seat <span className="text-red-500">*</span>
            </p>
            {checking ? (
              <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Spinner className="h-3 w-3 animate-spin" />
                Checking availability
              </span>
            ) : seatId ? (
              <span className="text-xs font-semibold text-neutral-800">
                Selected {seatId.replace("_", " · ")}
              </span>
            ) : null}
          </div>

          {months.length === 0 || slots.length === 0 ? (
            <p className="rounded-xl bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
              Choose at least one month and one slot to see which seats are free.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-xl border border-neutral-200 p-4">
              <SeatMap
                layout={config.seat_layout}
                occupied={occupied}
                selected={seatId}
                onSelect={setSeatId}
              />
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-neutral-700">Lockers</p>
          <div className="flex flex-wrap gap-1.5">
            {config.locker_numbers.map((locker) => {
              const taken = usedLockers.has(locker);
              const active = lockers.includes(locker);

              return (
                <button
                  key={locker}
                  type="button"
                  disabled={taken}
                  onClick={() => setLockers((current) => toggle(current, locker).sort((a, b) => a - b))}
                  className={cx(
                    "h-9 w-11 rounded-lg text-[13px] font-semibold tabular-nums transition",
                    active
                      ? "bg-neutral-900 text-white"
                      : taken
                        ? "cursor-not-allowed bg-red-100 text-red-400 line-through"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                  )}
                >
                  {locker}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            ₹{config.locker_price} per locker per month.
          </p>
        </div>

        <div className="grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-4">
          <Field label="Booking status" htmlFor="lib-status">
            <select
              id="lib-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as "confirmed" | "secured")}
              className={inputClass}
            >
              <option value="confirmed">Confirmed</option>
              <option value="secured">Provisionally held</option>
            </select>
          </Field>

          <Field
            label="Price per month"
            htmlFor="lib-price"
            hint={customPrice === "" ? "From the price ladder" : "Overridden"}
          >
            <input
              id="lib-price"
              type="number"
              min={0}
              value={customPrice}
              onChange={(event) => setCustomPrice(event.target.value)}
              placeholder={String(price)}
              className={inputClass}
            />
          </Field>

          <Field label="Payment" htmlFor="lib-payment">
            <select
              id="lib-payment"
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value as "pending" | "paid")}
              className={inputClass}
            >
              <option value="pending">Not paid yet</option>
              <option value="paid">Paid now</option>
            </select>
          </Field>

          {paymentStatus === "paid" ? (
            <>
              <Field label="Method" htmlFor="lib-method" required>
                <select
                  id="lib-method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className={inputClass}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </Field>
              <Field label="Collected by" htmlFor="lib-collected" required className="sm:col-span-2">
                <input
                  id="lib-collected"
                  required
                  value={collectedBy}
                  onChange={(event) => setCollectedBy(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-neutral-50 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Total
            </p>
            <p className="text-xl font-bold tabular-nums text-neutral-900">
              ₹{(price * months.length).toLocaleString("en-IN")}
            </p>
          </div>
          <p className="text-[13px] text-neutral-500">
            ₹{price.toLocaleString("en-IN")} × {months.length} month
            {months.length === 1 ? "" : "s"}
            {lockers.length > 0 ? ` · ${lockers.length} locker${lockers.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !canSubmit}>
            {pending ? (
              <>
                <Spinner className="h-4 w-4 animate-spin" />
                Admitting
              </>
            ) : (
              "Admit member"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
