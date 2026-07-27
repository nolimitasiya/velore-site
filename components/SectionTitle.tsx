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

        <h2 className="font-display text-[36px] font-normal leading-none tracking-[-0.02em] text-black md:text-[56px]">
  {children}
</h2>

        <div className="mt-5 h-px w-20 bg-black/20" />
      </div>

      {href && (
        <a
          href={href}
          className="text-[11px] uppercase tracking-[0.18em] text-black/50 underline underline-offset-4 transition-colors hover:text-black"
        >
          {hrefLabel}
        </a>
      )}
    </div>
  );
}