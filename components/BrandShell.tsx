import Link from "next/link";

export default function BrandShell({
  children,
  brandName,
}: {
  children: React.ReactNode;
  brandName?: string;
}) {
  return (
    <div className="min-h-screen w-full bg-white font-body text-black">
      {/* Light header */}
      <header className="border-b bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="w-24" />
          <Link
            href="/"
            className="font-heading text-2xl md:text-3xl tracking-[0.08em]"
          >
            Veilora Club
          </Link>
          <div className="w-24 flex justify-end">
            <Link
              href="/brand"
              className="text-xs uppercase tracking-[0.18em] text-black/60 hover:text-black"
            >
              {brandName ?? "Brand Portal"}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}