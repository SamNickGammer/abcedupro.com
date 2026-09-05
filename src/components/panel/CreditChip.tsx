"use client";

import { useApi } from "@/lib/use-api";
import { cx } from "@/components/ui";
import { CoinIcon } from "@/components/panel/icons";

type CreditPayload = { credit: number; credit_per_certificate: number };

/**
 * Live credit balance in the header. Marking a marksheet debits the branch, so
 * this needs to reflect the balance now, not at page load.
 */
export function CreditChip({
  initialCredit,
  perCertificate,
}: {
  initialCredit: number;
  perCertificate: number;
}) {
  const { data } = useApi<CreditPayload>("/api/branches/me/credit");

  const credit = data?.credit ?? initialCredit;
  const cost = data?.credit_per_certificate ?? perCertificate;
  const affordable = Math.floor(credit / Math.max(1, cost));

  return (
    <span
      title={`${cost} credits per certificate — enough for ${affordable} more`}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset",
        affordable === 0
          ? "bg-red-50 text-red-700 ring-red-200"
          : affordable <= 2
            ? "bg-amber-50 text-amber-800 ring-amber-200"
            : "bg-emerald-50 text-emerald-700 ring-emerald-200",
      )}
    >
      <CoinIcon className="h-4 w-4" />
      <span className="tabular-nums">{credit.toLocaleString("en-IN")}</span>
      <span className="hidden font-normal opacity-70 sm:inline">credits</span>
    </span>
  );
}
