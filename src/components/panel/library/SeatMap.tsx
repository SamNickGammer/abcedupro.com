"use client";

import { cx } from "@/components/ui";
import type { SeatLayout } from "@/components/panel/library/types";

/**
 * The room, drawn as it is laid out — blocks of rows of seats.
 *
 * A seat's id is `{block}_{row}{number}`, which is the same key the booking
 * tables use, so occupancy needs no translation step.
 */
export function SeatMap({
  layout,
  occupied,
  selected,
  onSelect,
  bookedLabels,
}: {
  layout: SeatLayout;
  occupied: Set<string>;
  selected: string | null;
  onSelect?: (seatId: string) => void;
  /** Optional tooltip text per seat, e.g. who holds it. */
  bookedLabels?: Map<string, string>;
}) {
  return (
    <div className="space-y-6">
      {Object.entries(layout).map(([block, rows]) => (
        <div key={block}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Block {block}
          </p>
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div key={row.row} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-neutral-400">
                  {row.row}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {row.seats.map((seat) => {
                    const seatId = `${block}_${row.row}${seat}`;
                    const isOccupied = occupied.has(seatId);
                    const isSelected = selected === seatId;

                    return (
                      <button
                        key={seatId}
                        type="button"
                        disabled={!onSelect || isOccupied}
                        onClick={() => onSelect?.(seatId)}
                        title={bookedLabels?.get(seatId) ?? `${row.row}${seat}`}
                        aria-pressed={isSelected}
                        className={cx(
                          "h-7 w-8 shrink-0 rounded-md text-[11px] font-semibold tabular-nums transition",
                          isSelected
                            ? "bg-neutral-900 text-white ring-2 ring-neutral-900 ring-offset-1"
                            : isOccupied
                              ? "cursor-not-allowed bg-red-100 text-red-400 line-through"
                              : onSelect
                                ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100"
                                : "bg-neutral-100 text-neutral-500",
                        )}
                      >
                        {row.row}
                        {seat}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-4 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-4 rounded bg-emerald-50 ring-1 ring-inset ring-emerald-200" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-4 rounded bg-red-100" />
          Taken for the chosen slots
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-4 rounded bg-neutral-900" />
          Selected
        </span>
      </div>
    </div>
  );
}
