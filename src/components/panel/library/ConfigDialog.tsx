"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@/lib/use-api";
import type { LibraryConfig, SeatLayout, SlotDefinition } from "@/components/panel/library/types";

type Tab = "slots" | "seats" | "lockers" | "json";

/**
 * Library settings: the slots sold, what they cost, the lockers, and the shape
 * of the room itself.
 *
 * The Blade page exposed this as five raw JSON textareas, which meant a stray
 * comma took the seat map down. Each setting gets a real control here, and the
 * JSON tab is kept as an escape hatch for anything the form cannot express.
 */
export function ConfigDialog({
  config,
  onClose,
  onSaved,
}: {
  config: LibraryConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { run, pending, error } = useMutation();
  const [tab, setTab] = useState<Tab>("slots");

  const [slots, setSlots] = useState<SlotDefinition[]>(() =>
    config.slot_definitions.map((slot) => ({ ...slot })),
  );
  const [tiers, setTiers] = useState<Record<string, number>>(() => ({ ...config.pricing_tiers }));
  const [lockerPrice, setLockerPrice] = useState(String(config.locker_price));
  const [lockerCount, setLockerCount] = useState(String(config.locker_numbers.length));
  const [layout, setLayout] = useState<SeatLayout>(() =>
    JSON.parse(JSON.stringify(config.seat_layout)) as SeatLayout,
  );
  const [raw, setRaw] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  const seatTotal = useMemo(
    () =>
      Object.values(layout).reduce(
        (sum, rows) => sum + rows.reduce((rowSum, row) => rowSum + row.seats.length, 0),
        0,
      ),
    [layout],
  );

  // A price is needed for every slot count that can now be bought, so adding a
  // fifth slot cannot leave a four-slot booking priced at the fallback.
  const tierKeys = Array.from({ length: Math.max(1, slots.length) }, (_, index) =>
    String(index + 1),
  );

  const openJson = () => {
    setRaw(JSON.stringify(buildPayload(), null, 2));
    setTab("json");
  };

  function buildPayload(): LibraryConfig {
    const count = Math.max(1, Number(lockerCount) || 0);

    return {
      slot_definitions: slots.map((slot) => ({
        id: slot.id.trim().toUpperCase(),
        label: slot.label.trim(),
        time: slot.time.trim(),
        color: slot.color ?? "#111827",
      })),
      pricing_tiers: Object.fromEntries(
        tierKeys.map((key) => [key, Number(tiers[key]) || 0]),
      ),
      locker_price: Number(lockerPrice) || 0,
      locker_numbers: Array.from({ length: count }, (_, index) => index + 1),
      seat_layout: layout,
    };
  }

  const save = async () => {
    setLocalError(null);

    let payload: LibraryConfig;

    if (tab === "json") {
      try {
        payload = JSON.parse(raw) as LibraryConfig;
      } catch {
        setLocalError("That is not valid JSON — check for a trailing comma.");
        return;
      }
    } else {
      payload = buildPayload();

      const ids = payload.slot_definitions.map((slot) => slot.id);
      if (ids.some((id) => !id)) {
        setLocalError("Every slot needs an id.");
        return;
      }
      if (new Set(ids).size !== ids.length) {
        setLocalError("Two slots share the same id. Slot ids must be unique.");
        return;
      }
      if (seatTotal === 0) {
        setLocalError("The room has no seats. Add at least one row.");
        return;
      }
    }

    const result = await run("/api/library/config", { method: "PUT", body: payload });
    if (result.ok) onSaved();
  };

  const shown = localError ?? error;

  return (
    <div
      className="lib-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div className="lib-modal" role="dialog" aria-modal="true" aria-label="Library settings">
        <div className="lib-modal-head">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 className="lib-title font-HellixB" style={{ fontSize: 19, marginBottom: 4 }}>
                Library Settings
              </h2>
              <p className="lib-subtitle font-HellixR">
                {seatTotal} seats × {slots.length} slots ={" "}
                {(seatTotal * Math.max(1, slots.length)).toLocaleString("en-IN")} seat-slots a month.
              </p>
            </div>
            <button
              type="button"
              className="lib-icon-btn"
              onClick={onClose}
              disabled={pending}
              aria-label="Close"
            >
              <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="lib-tabs">
            {(
              [
                ["slots", "Slots & pricing"],
                ["seats", "Seat layout"],
                ["lockers", "Lockers"],
              ] as [Tab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`lib-tab font-HellixB${tab === value ? " active" : ""}`}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className={`lib-tab font-HellixB${tab === "json" ? " active" : ""}`}
              onClick={openJson}
              style={{ marginLeft: "auto" }}
            >
              Raw JSON
            </button>
          </div>
        </div>

        <div className="lib-modal-body">
          {tab === "slots" ? (
            <SlotsTab
              slots={slots}
              setSlots={setSlots}
              tiers={tiers}
              setTiers={setTiers}
              tierKeys={tierKeys}
            />
          ) : null}

          {tab === "seats" ? <SeatsTab layout={layout} setLayout={setLayout} /> : null}

          {tab === "lockers" ? (
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div>
                <label className="lib-label font-HellixB" htmlFor="lib-locker-count">
                  How many lockers
                </label>
                <input
                  id="lib-locker-count"
                  className="lib-input font-HellixR"
                  type="number"
                  min={1}
                  value={lockerCount}
                  onChange={(event) => setLockerCount(event.target.value)}
                />
                <p className="lib-inline-note font-HellixR" style={{ marginTop: 6 }}>
                  Numbered 1 to {Math.max(1, Number(lockerCount) || 1)}.
                </p>
              </div>
              <div>
                <label className="lib-label font-HellixB" htmlFor="lib-locker-price">
                  Price per locker (₹ a month)
                </label>
                <input
                  id="lib-locker-price"
                  className="lib-input font-HellixR"
                  type="number"
                  min={0}
                  value={lockerPrice}
                  onChange={(event) => setLockerPrice(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          {tab === "json" ? (
            <div>
              <div className="lib-warning font-HellixR" style={{ marginBottom: 12 }}>
                Saving from this tab writes exactly what is below. Reducing rows or slots does not
                move members who already hold those seats — check the seat map for the months
                affected first.
              </div>
              <label className="lib-label font-HellixB" htmlFor="lib-raw">
                Full configuration
              </label>
              <textarea
                id="lib-raw"
                className="lib-textarea"
                spellCheck={false}
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
              />
            </div>
          ) : null}

          {shown ? (
            <p className="lib-error font-HellixR" style={{ marginTop: 14 }}>
              {shown}
            </p>
          ) : null}
        </div>

        <div className="lib-modal-actions">
          <span className="lib-inline-note font-HellixR" style={{ marginRight: "auto" }}>
            Changes apply to every month; existing bookings keep their seats.
          </span>
          <button
            type="button"
            className="lib-btn lib-btn-light font-HellixB"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="lib-btn lib-btn-dark font-HellixB"
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SlotsTab({
  slots,
  setSlots,
  tiers,
  setTiers,
  tierKeys,
}: {
  slots: SlotDefinition[];
  setSlots: (value: SlotDefinition[]) => void;
  tiers: Record<string, number>;
  setTiers: (value: Record<string, number>) => void;
  tierKeys: string[];
}) {
  const update = (index: number, patch: Partial<SlotDefinition>) =>
    setSlots(slots.map((slot, position) => (position === index ? { ...slot, ...patch } : slot)));

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span className="lib-mini-label font-HellixB">Time slots</span>
          <button
            type="button"
            className="lib-btn lib-btn-light font-HellixB"
            style={{ padding: "7px 13px", fontSize: 12 }}
            onClick={() =>
              setSlots([
                ...slots,
                { id: nextSlotId(slots), label: `Slot ${nextSlotId(slots)}`, time: "", color: "#64748b" },
              ])
            }
          >
            + Add a slot
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {slots.map((slot, index) => (
            <div
              key={index}
              className="lib-config-row"
              style={{ gridTemplateColumns: "70px minmax(0, 1fr) minmax(0, 1fr) 34px 34px" }}
            >
              <div>
                <label className="lib-label font-HellixB">Id</label>
                <input
                  className="lib-input font-HellixR"
                  value={slot.id}
                  maxLength={4}
                  onChange={(event) => update(index, { id: event.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="lib-label font-HellixB">Label</label>
                <input
                  className="lib-input font-HellixR"
                  value={slot.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                />
              </div>
              <div>
                <label className="lib-label font-HellixB">Time</label>
                <input
                  className="lib-input font-HellixR"
                  placeholder="6AM-10AM"
                  value={slot.time}
                  onChange={(event) => update(index, { time: event.target.value })}
                />
              </div>
              <input
                type="color"
                className="lib-swatch"
                aria-label={`${slot.label} colour`}
                value={slot.color ?? "#111827"}
                onChange={(event) => update(index, { color: event.target.value })}
              />
              <button
                type="button"
                className="lib-icon-btn"
                aria-label={`Remove ${slot.label}`}
                disabled={slots.length <= 1}
                onClick={() => setSlots(slots.filter((_, position) => position !== index))}
              >
                <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="lib-mini-label font-HellixB">Monthly price by number of slots</span>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: `repeat(${Math.min(4, tierKeys.length)}, minmax(0, 1fr))`,
            marginTop: 10,
          }}
        >
          {tierKeys.map((key) => (
            <div key={key}>
              <label className="lib-label font-HellixB" htmlFor={`lib-tier-${key}`}>
                {key} slot{key === "1" ? "" : "s"}
              </label>
              <input
                id={`lib-tier-${key}`}
                className="lib-input font-HellixR"
                type="number"
                min={0}
                value={tiers[key] ?? ""}
                onChange={(event) => setTiers({ ...tiers, [key]: Number(event.target.value) })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Rows are edited as `1-19` or `1,2,5-8`, which is how the room is described. */
function SeatsTab({
  layout,
  setLayout,
}: {
  layout: SeatLayout;
  setLayout: (value: SeatLayout) => void;
}) {
  const blocks = Object.keys(layout);

  const setRows = (block: string, rows: SeatLayout[string]) =>
    setLayout({ ...layout, [block]: rows });

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {blocks.map((block) => {
        const rows = layout[block];
        const seats = rows.reduce((sum, row) => sum + row.seats.length, 0);

        return (
          <div key={block}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="lib-mini-label font-HellixB">
                Block {block} · {seats} seats
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="lib-btn lib-btn-light font-HellixB"
                  style={{ padding: "7px 13px", fontSize: 12 }}
                  onClick={() => setRows(block, [...rows, { row: nextRowLetter(rows), seats: [] }])}
                >
                  + Add a row
                </button>
                {blocks.length > 1 ? (
                  <button
                    type="button"
                    className="lib-btn lib-btn-light font-HellixB"
                    style={{ padding: "7px 13px", fontSize: 12, color: "#dc2626" }}
                    onClick={() => {
                      const next = { ...layout };
                      delete next[block];
                      setLayout(next);
                    }}
                  >
                    Remove block
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="lib-config-row"
                  style={{ gridTemplateColumns: "90px minmax(0, 1fr) 74px 34px" }}
                >
                  <div>
                    <label className="lib-label font-HellixB">Row</label>
                    <input
                      className="lib-input font-HellixR"
                      value={row.row}
                      maxLength={3}
                      onChange={(event) =>
                        setRows(
                          block,
                          rows.map((entry, position) =>
                            position === index
                              ? { ...entry, row: event.target.value.toUpperCase() }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="lib-label font-HellixB">Seat numbers</label>
                    <input
                      className="lib-input font-HellixR"
                      placeholder="1-19 or 1,2,5-8"
                      defaultValue={describeSeats(row.seats)}
                      onBlur={(event) =>
                        setRows(
                          block,
                          rows.map((entry, position) =>
                            position === index
                              ? { ...entry, seats: parseSeats(event.target.value) }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="lib-label font-HellixB">Seats</label>
                    <div
                      className="font-HellixB"
                      style={{ fontSize: 14, padding: "9px 0", color: "#111827" }}
                    >
                      {row.seats.length}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="lib-icon-btn"
                    aria-label={`Remove row ${row.row}`}
                    onClick={() => setRows(block, rows.filter((_, position) => position !== index))}
                  >
                    <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className="lib-btn lib-btn-light font-HellixB"
        style={{ justifySelf: "start", padding: "8px 14px", fontSize: 12 }}
        onClick={() =>
          setLayout({ ...layout, [nextBlockLetter(blocks)]: [{ row: "A", seats: [] }] })
        }
      >
        + Add a block
      </button>

      <div className="lib-warning font-HellixR">
        Seat ids are <strong>block_row+number</strong> — renaming a block or a row leaves any
        booking on the old id stranded. Add rows freely; rename with care.
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ helpers

/** `[1,2,3,7,8]` → `1-3, 7-8`. */
function describeSeats(seats: number[]): string {
  if (seats.length === 0) return "";

  const sorted = [...seats].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (const seat of sorted.slice(1)) {
    if (seat === previous + 1) {
      previous = seat;
      continue;
    }
    parts.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = seat;
    previous = seat;
  }
  parts.push(start === previous ? `${start}` : `${start}-${previous}`);

  return parts.join(", ");
}

/** `1-3, 7-8` → `[1,2,3,7,8]`. Anything unparseable is simply dropped. */
function parseSeats(text: string): number[] {
  const seats = new Set<number>();

  for (const part of text.split(",")) {
    const piece = part.trim();
    if (!piece) continue;

    const range = piece.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      for (let seat = Math.min(from, to); seat <= Math.max(from, to); seat += 1) seats.add(seat);
      continue;
    }

    const single = Number(piece);
    if (Number.isInteger(single) && single >= 0) seats.add(single);
  }

  return [...seats].sort((a, b) => a - b);
}

function nextSlotId(slots: SlotDefinition[]): string {
  const used = new Set(slots.map((slot) => slot.id));
  for (let code = 65; code <= 90; code += 1) {
    const letter = String.fromCharCode(code);
    if (!used.has(letter)) return letter;
  }
  return String(slots.length + 1);
}

function nextRowLetter(rows: { row: string }[]): string {
  const used = new Set(rows.map((row) => row.row));
  for (let code = 65; code <= 90; code += 1) {
    const letter = String.fromCharCode(code);
    if (!used.has(letter)) return letter;
  }
  return String(rows.length + 1);
}

function nextBlockLetter(blocks: string[]): string {
  const used = new Set(blocks);
  for (let code = 65; code <= 90; code += 1) {
    const letter = String.fromCharCode(code);
    if (!used.has(letter)) return letter;
  }
  return String(blocks.length + 1);
}
