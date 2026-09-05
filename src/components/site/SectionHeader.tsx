export function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-10 text-center">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>
      <h2 className="text-[clamp(24px,3.5vw,36px)] font-bold tracking-tight text-neutral-900">
        {title}
      </h2>
      <div className="mx-auto mt-4 h-[3px] w-12 rounded-full bg-ink" />
    </div>
  );
}
