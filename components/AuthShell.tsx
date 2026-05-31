// C:\Users\Asiya\projects\dalra\components\AuthShell.tsx
import Link from "next/link";

export default function AuthShell({
  title,
  subtitle,
  children,
  variant = "brand",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: "brand" | "admin" | "shopper";
}) {
  const portalLabel =
    variant === "admin"
      ? "Admin Portal"
      : variant === "shopper"
      ? "My Account"
      : "Brand Portal";

  const tagline =
    variant === "admin" ? (
      <>Manage your <span className="italic text-[#f2c4a0]">platform.</span></>
    ) : variant === "shopper" ? (
      <>The home of global modest <span className="italic text-[#f2c4a0]">fashion.</span></>
    ) : (
      <>The home of global modest <span className="italic text-[#f2c4a0]">fashion.</span></>
    );

  return (
    <div className="min-h-screen w-full flex flex-col font-body bg-[#faf8f4]">
      {/* ── Top burgundy header ── */}
      <div className="bg-[#7B2D3E] px-8 py-8 text-center">
        <Link
          href="/"
          className="font-heading text-3xl tracking-[0.08em] text-white hover:opacity-80 transition-opacity"
        >
          Veilora Club
        </Link>
        <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/50">
          {portalLabel}
        </div>
        <h2 className="mt-4 font-heading text-2xl leading-[1.15] text-white xl:text-3xl">
          {tagline}
        </h2>
      </div>

      {/* ── Centered card ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-6">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-[#e8ddd4] bg-white p-10 md:p-12">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7B2D3E]">
              {portalLabel}
            </p>
            <h1 className="mt-3 font-heading text-3xl text-[#1a0a0e]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-[#6b5c4e]">
                {subtitle}
              </p>
            )}

            {/* Divider */}
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#d8c9b5]" />
              <span className="text-[11px] tracking-[0.12em] text-[#a89280]">
                {portalLabel}
              </span>
              <div className="h-px flex-1 bg-[#d8c9b5]" />
            </div>

            {children}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="py-5 text-center text-[11px] tracking-[0.12em] text-[#7B2D3E]/40">
        © {new Date().getFullYear()} Veilora Club
      </div>
    </div>
  );
}