// components/SectionTitle.tsx
export function SectionTitle({
  children,
  eyebrow,
  href,
  hrefLabel = "View all",
}: {
  children: React.ReactNode;
  eyebrow?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-black/40">
            {eyebrow}
          </p>
        )}
        <h2 className="font-heading text-3xl font-normal tracking-tight text-black md:text-4xl">
          {children}
        </h2>
        <div className="mt-3 h-px w-12 bg-black/20" />
      </div>
      {href && (
        <a
          href={href}
          className="text-[11px] uppercase tracking-[0.18em] text-black/50 underline underline-offset-4 hover:text-black transition-colors"
        >
          {hrefLabel}
        </a>
      )}
    </div>
  );
}
