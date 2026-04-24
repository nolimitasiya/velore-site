import Link from "next/link";

export default function BrandShell({
  children,
  brandName,
}: {
  children: React.ReactNode;
  brandName?: string;
}) {
  return (
    <div className="min-h-screen bg-[#fcfcfb] font-body text-neutral-950">
      {/* soft page background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.04),_transparent_35%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-neutral-100/80 via-white to-transparent" />

      <header className="sticky top-0 z-40 border-b border-black/8 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-8">
          <div className="w-40">
            <Link
              href="/brand"
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
              Brand Portal
            </div>
          </div>

          <div className="flex w-40 justify-end">
            <Link
              href="/brand/profile"
              className="inline-flex max-w-[160px] items-center justify-end truncate text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500 transition hover:text-neutral-950"
              title={brandName ?? "Profile"}
            >
              {brandName ?? "Profile"}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-8 md:py-12">
        <div className="rounded-[28px] border border-black/8 bg-white/92 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur-sm md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}