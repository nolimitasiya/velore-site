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
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="w-32">
            <Link
              href="/brand"
              className="text-xs uppercase tracking-[0.18em] text-black/60 hover:text-black"
            >
              Dashboard
            </Link>
          </div>

          <Link
            href="/"
            className="font-heading text-2xl tracking-[0.08em] md:text-3xl"
          >
            Veilora Club
          </Link>

          <div className="w-32 flex justify-end">
            <Link
              href="/brand/profile"
              className="text-xs uppercase tracking-[0.18em] text-black/60 hover:text-black"
            >
              {brandName ?? "Profile"}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}