"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  ReactNode,
  useEffect,
  useState,
} from "react";

type Shopper = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

type Props = {
  children: ReactNode;
};

const NAVIGATION = [
  {
    label: "Wishlist",
    href: "/account/wishlist",
  },
  {
    label: "My Fit",
    href: "/account/fit",
  },
  {
    label: "Profile",
    href: "/account/profile",
  },
];

function formatDisplayName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  // Preserve names that already contain intentional casing.
  if (trimmed !== trimmed.toUpperCase()) {
    return trimmed;
  }

  // Normalise legacy ALL-CAPS names.
  return trimmed
    .toLocaleLowerCase()
    .replace(
      /\b\p{L}/gu,
      (letter) => letter.toLocaleUpperCase()
    );
}
export default function AccountShell({
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [shopper, setShopper] =
    useState<Shopper | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [accountMenuOpen, setAccountMenuOpen] =
    useState(false);

  useEffect(() => {
    async function loadShopper() {
      try {
        const response = await fetch(
          "/api/account/auth/me",
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          router.replace(
            `/account/login?next=${encodeURIComponent(
              pathname
            )}`
          );
          return;
        }

        const data = await response.json();

        if (!data.shopper) {
          router.replace(
            `/account/login?next=${encodeURIComponent(
              pathname
            )}`
          );
          return;
        }

        setShopper(data.shopper);
      } finally {
        setLoading(false);
      }
    }

    loadShopper();
  }, [pathname, router]);

  useEffect(() => {
  if (!accountMenuOpen) return;

  const previousOverflow =
    document.body.style.overflow;

  document.body.style.overflow = "hidden";

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setAccountMenuOpen(false);
    }
  }

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    document.body.style.overflow =
      previousOverflow;

    window.removeEventListener(
      "keydown",
      handleKeyDown
    );
  };
}, [accountMenuOpen]);

  async function handleLogout() {
    await fetch(
      "/api/account/auth/logout",
      {
        method: "POST",
        credentials: "include",
      }
    );

    window.location.assign("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center">
        <div className="text-sm tracking-wide text-[#a89280]">
          Loading...
        </div>
      </div>
    );
  }

  if (!shopper) {
    return null;
  }

 const displayFirstName = shopper.firstName
  ? formatDisplayName(shopper.firstName)
  : null;

  return (
    <div className="min-h-screen bg-[#faf8f4] font-body">
      <header className="hidden bg-[#7B2D3E] px-6 py-6 text-center lg:block">
        <Link
          href="/"
          className="font-heading text-2xl tracking-[0.08em] text-white transition hover:opacity-80"
        >
          Veilora Club
        </Link>

        <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/50">
          My Account
        </div>
      </header>

     <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-6 lg:px-8 lg:py-12">
       {/* Mobile account navigation */}
<div className="mb-8 lg:hidden">
  <Link
    href="/"
    className="mb-6 inline-block font-heading text-2xl tracking-[0.02em] text-[#7B2D3E] transition-opacity hover:opacity-70"
  >
    Veilora Club
  </Link>

  <div>
    <button
    type="button"
    onClick={() => setAccountMenuOpen(true)}
    aria-label="Open account menu"
    aria-expanded={accountMenuOpen}
    className="flex items-center gap-3 text-left text-sm text-[#1a0a0e]"
  >
    <span className="flex h-8 w-8 items-center justify-center">
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        aria-hidden="true"
      >
        <path
          d="M4 7h16M4 12h16M4 17h16"
          strokeLinecap="round"
        />
      </svg>
    </span>

          <span>Account menu</span>
    </button>
  </div>
</div>

        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <div className="mb-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#7B2D3E]">
                  My Account
                </p>

                <p className="mt-2 font-heading text-2xl text-[#1a0a0e]">
  {displayFirstName
    ? `Hello, ${displayFirstName}`
    : "Welcome"}
</p>

                <p className="mt-1 break-all text-xs leading-5 text-[#a89280]">
                  {shopper.email}
                </p>
              </div>

              <nav className="space-y-1">
                {NAVIGATION.map((item) => {
                  const active =
                    pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block origin-left rounded-xl px-4 py-3 text-[15px] transition-all duration-200 ${
  active
    ? "font-medium text-[#7B2D3E]"
    : "text-[#6b5c4e] hover:scale-105 hover:text-[#7B2D3E]"
}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8 border-t border-[#e8ddd4] pt-5">
  <button
    type="button"
    onClick={handleLogout}
    className="px-4 text-sm text-[#a89280] underline underline-offset-4 transition hover:text-[#7B2D3E]"
  >
    Sign out
  </button>
</div>
            </div>
          </aside>
<main className="min-w-0 lg:rounded-2xl lg:border lg:border-[#e8ddd4] lg:px-14 lg:py-14">
  {children}
</main>
        </div>
      </div>

      {/* Mobile account drawer */}
<div
  className={`fixed inset-0 z-50 lg:hidden ${
    accountMenuOpen
      ? "pointer-events-auto"
      : "pointer-events-none"
  }`}
  aria-hidden={!accountMenuOpen}
>
  {/* Backdrop */}
  <button
    type="button"
    aria-label="Close account menu"
    onClick={() => setAccountMenuOpen(false)}
    className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
      accountMenuOpen
        ? "opacity-100"
        : "opacity-0"
    }`}
  />

  {/* Drawer */}
  <aside
    role="dialog"
    aria-modal="true"
    aria-label="Account menu"
    className={`absolute inset-y-0 left-0 flex h-[100dvh] w-[88vw] max-w-[390px] flex-col bg-[#fcfbf8] shadow-[20px_0_70px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-out ${
      accountMenuOpen
        ? "translate-x-0"
        : "-translate-x-full"
    }`}
  >
    {/* Header */}
    <div className="flex min-h-[76px] items-center justify-between border-b border-black/10 px-5">
      <span className="font-heading text-2xl text-[#7B2D3E]">
        My Account
      </span>

      <button
        type="button"
        onClick={() => setAccountMenuOpen(false)}
        aria-label="Close account menu"
        className="flex h-10 w-10 items-center justify-center text-black/45"
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            d="M6 6l12 12M18 6 6 18"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>

    {/* Shopper */}
    <div className="border-b border-black/10 px-5 py-6">
      <p className="font-heading text-xl text-[#1a0a0e]">
        {displayFirstName
          ? `Hello, ${displayFirstName}`
          : "Welcome"}
      </p>

      <p className="mt-1 break-all text-xs text-[#a89280]">
        {shopper.email}
      </p>
    </div>

    {/* Navigation */}
    <nav className="flex-1">
      {NAVIGATION.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() =>
              setAccountMenuOpen(false)
            }
            className={`flex items-center justify-between border-b border-black/5 px-5 py-4 text-[15px] transition-colors ${
              active
                ? "font-medium text-[#7B2D3E]"
                : "text-[#1a0a0e]"
            }`}
          >
            <span>{item.label}</span>

            <span
              className={
                active
                  ? "text-[#7B2D3E]"
                  : "text-black/25"
              }
            >
              ›
            </span>
          </Link>
        );
      })}
    </nav>

    {/* Sign out */}
    <div className="border-t border-black/10 p-5">
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm text-[#7B2D3E] underline underline-offset-4"
      >
        Sign out
      </button>
    </div>
  </aside>
</div>

      <footer className="pb-6 text-center text-[11px] tracking-[0.12em] text-[#7B2D3E]/40">
        © {new Date().getFullYear()} Veilora Club
      </footer>
    </div>
  );
}