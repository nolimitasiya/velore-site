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
      <header className="bg-[#7B2D3E] px-6 py-6 text-center">
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

     <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Mobile account navigation */}
        <nav className="mb-8 flex gap-2 overflow-x-auto border-b border-[#e8ddd4] pb-3 lg:hidden">
          {NAVIGATION.map((item) => {
            const active =
              pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${
                  active
                  ? "border-[#7B2D3E] font-medium text-[#7B2D3E]"
                  : "border-transparent text-[#6b5c4e]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

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
<main className="min-w-0 rounded-2xl border border-[#e8ddd4] px-8 py-10 sm:px-12 sm:py-12 lg:px-14 lg:py-14">

            {children}
          </main>
        </div>
      </div>

      <footer className="pb-6 text-center text-[11px] tracking-[0.12em] text-[#7B2D3E]/40">
        © {new Date().getFullYear()} Veilora Club
      </footer>
    </div>
  );
}