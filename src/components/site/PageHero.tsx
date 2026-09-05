/** The dark banner every inner page opens with, sized to clear the fixed nav. */
export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] px-6 pb-16 pt-32 text-center text-white 1000:pt-40">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[760px] -translate-x-1/2 -translate-y-1/3 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(96,165,250,0.10) 0%, transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-3xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
          {eyebrow}
        </p>
        <h1 className="text-[clamp(30px,5vw,52px)] font-bold leading-[1.1] tracking-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/60">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
