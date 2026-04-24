import Link from "next/link";

export default function AdminShell({
  children,
  wide = false,
  fullWidth = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
  fullWidth?: boolean;
}) {
  const shellWidth = fullWidth
    ? "max-w-none"
    : wide
    ? "max-w-[1800px]"
    : "max-w-7xl";

  const shellPadding = fullWidth
    ? "px-3 py-6 md:px-5 md:py-8"
    : wide
    ? "px-4 py-8 md:px-6 md:py-10"
    : "px-6 py-10 md:px-8 md:py-12";

  const innerClasses = fullWidth
    ? "bg-transparent p-0 shadow-none border-0 rounded-none"
    : `rounded-[28px] border border-black/8 bg-white/92 ${
        wide ? "p-4 md:p-6" : "p-5 md:p-8"
      } shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-sm`;

  return (
    <div className="min-h-screen bg-[#fcfcfb] font-body text-neutral-950">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.04),_transparent_35%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-neutral-100/80 via-white to-transparent" />

      <header className="sticky top-0 z-40 border-b border-black/8 bg-white/85 backdrop-blur-xl">
        <div
          className={`mx-auto flex w-full ${shellWidth} items-center justify-between px-6 py-5 md:px-8`}
        >
          <div className="w-40">
            <Link
              href="/admin/revenue"
              className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500 transition hover:text-neutral-950"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Dashboard
            </Link>
          </div>

          <div className="flex flex-col items-center text-center">
            <Link
              href="/"
              className="font-heading text-[28px] leading-none tracking-[0.12em] text-neutral-950 transition hover:opacity-80 md:text-[34px]"
            >
              Veilora Club
            </Link>
            <div className="mt-2 inline-flex items-center rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-500">
              Admin Portal
            </div>
          </div>

          <div className="flex w-40 justify-end">
            <Link
              href="/"
              className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500 transition hover:text-neutral-950"
            >
              Storefront
            </Link>
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full ${shellWidth} ${shellPadding}`}>
        <div className={innerClasses}>{children}</div>
      </main>
    </div>
  );
}