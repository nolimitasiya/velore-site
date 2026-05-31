// C:\Users\Asiya\projects\dalra\components\AdminShell.tsx
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
  return (
    <div className="min-h-screen bg-[#faf8f4] font-body text-neutral-950">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-[#e8ddd4] bg-white">
        <div className="mx-auto flex w-full items-center justify-between px-8 py-4">
          {/* Left */}
          <div className="w-40">
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[#a89280] transition hover:text-[#7B2D3E]"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7B2D3E]" />
              Dashboard
            </Link>
          </div>

          {/* Centre */}

          <div className="flex flex-col items-center text-center">
  <Link
    href="/"
    className="font-heading text-2xl leading-none tracking-[0.08em] text-[#7B2D3E] transition hover:opacity-70 md:text-3xl"
  >
    Veilora Club
  </Link>
  <div className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-[#a89280]">
    Admin Portal
  </div>
</div>
          
          

          {/* Right */}
          <div className="flex w-40 justify-end">
            <Link
              href="/"
              className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a89280] transition hover:text-[#7B2D3E]"
            >
              Storefront
            </Link>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
