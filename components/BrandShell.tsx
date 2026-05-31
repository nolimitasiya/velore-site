import Link from "next/link";

export default function BrandShell({
  children,
  brandName,
}: {
  children: React.ReactNode;
  brandName?: string;
}) {
  return (
    <div className="min-h-screen bg-[#faf8f4] font-body text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-[#e8ddd4] bg-white">
        <div className="mx-auto flex w-full items-center justify-between px-8 py-4">
          <div className="w-40">
            <Link
              href="/brand"
              className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[#a89280] transition hover:text-[#7B2D3E]"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7B2D3E]" />
              Dashboard
            </Link>
          </div>

          <div className="flex flex-col items-center text-center">
            <Link
              href="/"
              className="font-heading text-2xl leading-none tracking-[0.08em] text-[#7B2D3E] transition hover:opacity-70 md:text-3xl"
            >
              Veilora Club
            </Link>
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[#a89280]">
              Brand Portal
            </div>
          </div>

          <div className="flex w-40 justify-end">
            <Link
              href="/brand/profile"
              className="inline-flex max-w-[160px] items-center justify-end truncate text-[11px] font-medium uppercase tracking-[0.22em] text-[#a89280] transition hover:text-[#7B2D3E]"
              title={brandName ?? "Profile"}
            >
              {brandName ?? "Profile"}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-8 md:py-12">
        {children}
      </main>
    </div>
  );
}