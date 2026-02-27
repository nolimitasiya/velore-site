import Link from "next/link";

export default function AuthShell({
  title,
  children,
  variant = "brand",
}: {
  title: string;
  children: React.ReactNode;
  variant?: "brand" | "admin";
}) {
  const portalLabel = variant === "admin" ? "Admin Portal" : "Brand Portal";

  return (
    <div className="min-h-screen w-full bg-white font-body text-black">
      {/* Minimal header — same Veilora branding */}
      <header className="border-b bg-black text-white">
        <div className="mx-auto w-full max-w-[1800px] px-8">
          <div className="py-4 text-center">
            <Link
              href="/"
              className="font-heading text-4xl md:text-5xl leading-none tracking-[0.05em] text-white"
            >
              Veilora Club
            </Link>
            <div className="mt-2 text-xs tracking-[0.2em] uppercase text-white/70">
              {portalLabel}
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto w-full max-w-[1800px] px-8">
        <div className="mx-auto max-w-md py-14">
          <h1 className="font-display text-[26px] md:text-[30px] tracking-[0.02em] mb-8">
            {title}
          </h1>

          {children}
        </div>
      </main>
    </div>
  );
}