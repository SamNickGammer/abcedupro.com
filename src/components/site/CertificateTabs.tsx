"use client";

import Image from "next/image";
import { useState } from "react";
import { cx } from "@/components/ui";

const TABS = [
  {
    id: "iso" as const,
    label: "ISO Certificate",
    src: "/assets/certificates/iso_certificate.jpg",
    caption: "ISO 9001:2015 quality management certification.",
  },
  {
    id: "govt" as const,
    label: "Bihar Govt. Certificate",
    src: "/assets/certificates/bihar_certificate.jpg",
    caption: "Registration under the Government of Bihar Society Registration Act.",
  },
];

/**
 * The Laravel page selected these with a `?tab=` query parameter, so the nav
 * dropdown's deep links still land on the right one — that is what
 * `initialTab` preserves.
 */
export function CertificateTabs({ initialTab }: { initialTab: "iso" | "govt" }) {
  const [active, setActive] = useState<"iso" | "govt">(initialTab);
  const current = TABS.find((tab) => tab.id === active) ?? TABS[0];

  return (
    <div className="mx-auto max-w-3xl">
      <div
        role="tablist"
        aria-label="Accreditation certificates"
        className="mx-auto mb-6 flex w-fit gap-1 rounded-xl bg-neutral-200/70 p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={cx(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              active === tab.id
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <figure className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_10px_36px_rgba(0,0,0,0.08)]">
        <Image
          key={current.id}
          src={current.src}
          alt={current.label}
          width={1400}
          height={990}
          className="w-full rounded-lg object-contain"
        />
        <figcaption className="px-2 pb-1 pt-3 text-center text-[13px] text-neutral-500">
          {current.caption}
        </figcaption>
      </figure>
    </div>
  );
}
