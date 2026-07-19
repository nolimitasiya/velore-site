import LocationSwitcher from "@/components/LocationSwitcher";
import MobileMenu from "@/components/MobileMenu";
import HeaderNav from "@/components/HeaderNav";
import HeaderSearch from "@/components/HeaderSearch";
import StickyHeader from "@/components/StickyHeader";
import CookieBanner from "@/components/CookieBanner";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { NewsletterModal } from "@/components/newsletter/NewsletterModal";
import Link from "next/link";
import ShopperPreferencesModal from "@/components/ShopperPreferencesModal";

import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";


export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-white font-body text-black">
      <StickyHeader>
        <header className="border-b border-black/10 bg-[#fcfbf8] text-black">
          <div className="mx-auto w-full max-w-[1800px] px-8">
            <div className="flex items-center py-4">
              <div className="flex items-center gap-3">
                <div className="relative z-50 md:hidden">
                  <MobileMenu />
                </div>
                <LocationSwitcher />
              </div>

              <div className="ml-auto hidden md:flex">
                <HeaderSearch />
              </div>
            </div>

            <div className="pb-3 text-center">
              <Link
  href="/"
  className="font-heading text-4xl leading-none tracking-[0.03em] text-[#7B2D3E] md:text-5xl"
>
                Veilora Club
              </Link>
            </div>

            <div className="hidden pb-4 md:block">
              <HeaderNav />
            </div>
          </div>
        </header>
      </StickyHeader>

      <main className="w-full">{children}</main>

      <footer className="border-t border-black/10 bg-[#fcfbf8] text-black">
  <div className="mx-auto w-full max-w-[1800px] px-6 py-14 md:px-10 md:py-20">
    <div className="grid gap-12 lg:grid-cols-[1.35fr_0.7fr_0.8fr_0.85fr_1.15fr] lg:gap-10">
      {/* Brand */}
      <div>
        <Link
          href="/"
          className="font-heading text-4xl tracking-[0.03em] text-[#7B2D3E] md:text-5xl"
        >
          Veilora Club
        </Link>

        <p className="mt-5 max-w-xs font-display text-xl leading-8 text-black/60">
          The home of global modest fashion.
        </p>

        <div className="mt-8 flex items-center gap-5">
          <a
            href="https://instagram.com/veiloraclub"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Veilora Club on Instagram"
            className="text-black/60 transition hover:text-[#7B2D3E]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle
                cx="17.5"
                cy="6.5"
                r="0.8"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </a>

          <a
            href="https://tiktok.com/@veiloraclub"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Veilora Club on TikTok"
            className="text-black/60 transition hover:text-[#7B2D3E]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.79 1.54V6.78a4.85 4.85 0 0 1-1.02-.09Z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Explore */}
      <div>
        <h3 className="font-display text-[20px] font-medium tracking-[0.01em] text-[#7B2D3E]">
          Explore
        </h3>

        <div className="mt-6 space-y-4">
          <Link href="/new-in" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            New In
          </Link>
          <Link href="/categories" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            Categories
          </Link>
          <Link href="/brands" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            Brands
          </Link>
          <Link href="/sale" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            Sale
          </Link>
        </div>
      </div>

      {/* Company */}
      <div>
        <h3 className="font-display text-[20px] font-medium tracking-[0.01em] text-[#7B2D3E]">
          Company
        </h3>

        <div className="mt-6 space-y-4">
          <Link href="/about" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            About
          </Link>
          <Link href="/ethics" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            Ethics &amp; Compliance
          </Link>
          <Link href="/brand-apply" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            Partner with us
          </Link>
        </div>
      </div>

      {/* Legal */}
      <div>
        <h3 className="font-display text-[20px] font-medium tracking-[0.01em] text-[#7B2D3E]">
          Legal
        </h3>

        <div className="mt-6 space-y-4">
          <Link href="/privacy-policy" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            Privacy Policy
          </Link>
          <Link href="/cookie-policy" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            Cookie Policy
          </Link>
          <Link href="/terms" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            Terms &amp; Conditions
          </Link>
          <Link href="/contact" className="block font-body text-[15px] text-black/65 transition-colors hover:text-[#7B2D3E]">
            Contact Us
          </Link>
        </div>
      </div>

      {/* Newsletter */}
      <div>
        <h3 className="font-display text-[20px] font-medium tracking-[0.01em] text-[#7B2D3E]">
          Stay in the loop
        </h3>

        <div className="mt-6">
          <NewsletterSignup />
        </div>
      </div>
    </div>

    <div className="mt-16 border-t border-black/10 pt-7">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          <Link
            href="/brand/login"
            className="inline-flex items-center gap-2.5 text-sm text-black/65 transition hover:text-[#7B2D3E]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Brand Portal
          </Link>

          <p className="text-xs text-black/40">
            © {new Date().getFullYear()} Veilora Club. All rights reserved.
          </p>
        </div>

        <a
          href="#top"
          className="inline-flex w-fit items-center gap-3 text-sm text-black/60 transition hover:text-[#7B2D3E]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-black/15">
            ↑
          </span>
          Back to top
        </a>
      </div>
    </div>
  </div>
</footer>

      <ShopperPreferencesModal />
      <GoogleAnalytics />
      <CookieBanner />
      <NewsletterModal />
    </div>
  );
}