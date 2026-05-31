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

import Analytics from "@/components/analytics/GoogleAnalytics";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";


export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-white font-body text-black">
      <StickyHeader>
        <header className="border-b bg-black text-white">
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
                className="font-heading text-4xl leading-none tracking-[0.05em] text-white md:text-5xl"
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

      <footer className="border-t border-white/10 bg-black text-white">
        <div className="mx-auto w-full max-w-[1800px] px-8 py-16 text-sm">
          <div className="mb-12 text-center">
            <div className="font-heading text-2xl tracking-[0.08em] text-white md:text-3xl">
              Veilora Club
            </div>
            <div className="mt-3 font-display text-[18px] text-white/80 md:text-[22px]">
              Where global brands and international style meet
            </div>
          </div>

          <div className="grid gap-10 text-center md:grid-cols-3 md:text-left md:max-w-4xl md:mx-auto">
            <div>
              <h3 className="mb-4 font-heading text-sm uppercase tracking-[0.18em] text-white/90">
                Explore
              </h3>
              <div className="space-y-3">
                <Link href="/new-in" className="block text-white/70 transition hover:text-white">
                  New In
                </Link>
                <Link href="/categories" className="block text-white/70 transition hover:text-white">
                  Categories
                </Link>
                <Link href="/brands" className="block text-white/70 transition hover:text-white">
                  Brands
                </Link>
                <Link href="/sale" className="block text-white/70 transition hover:text-white">
                  Sale
                </Link>
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-heading text-sm uppercase tracking-[0.18em] text-white/90">
                Company
              </h3>
              <div className="space-y-3">
                <Link href="/about" className="block text-white/70 transition hover:text-white">
                  About
                </Link>
                <Link href="/ethics" className="block text-white/70 transition hover:text-white">
                  Ethics &amp; Compliance
                </Link>
                <Link href="/brand-apply" className="block text-white/70 transition hover:text-white">
                  Partner with us
                </Link>
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-heading text-sm uppercase tracking-[0.18em] text-white/90">
                Legal
              </h3>
              <div className="space-y-3">
                <Link href="/privacy-policy" className="block text-white/70 transition hover:text-white">
                  Privacy Policy
                </Link>
                <Link href="/cookie-policy" className="block text-white/70 transition hover:text-white">
                  Cookie Policy
                </Link>
                <Link href="/terms" className="block text-white/70 transition hover:text-white">
                  Terms &amp; Conditions
                </Link>
                
                  <Link href="/contact"  className="block text-white/70 transition hover:text-white">
                  Contact Us
                  </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 mx-auto max-w-md">
            <NewsletterSignup />
          </div>

          <div className="mt-10 border-t border-white/10 pt-8 flex flex-col items-center gap-3">
  <Link
    href="/brand/login"
    className="flex items-center gap-2.5 text-base text-white/80 transition hover:text-white"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
    Brand Portal
  </Link>

   <div className="flex items-center gap-4">
    {/* Instagram */}
    <a href="https://instagram.com/veiloraclub" target="_blank" rel="noopener noreferrer" className="text-white/40 transition hover:text-white/70" aria-label="Veilora Club on Instagram">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    </a>
    {/* TikTok */}
    <a href="https://tiktok.com/@veiloraclub" target="_blank" rel="noopener noreferrer" className="text-white/40 transition hover:text-white/70" aria-label="Veilora Club on TikTok">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.79 1.54V6.78a4.85 4.85 0 0 1-1.02-.09Z" />
      </svg>
    </a>
  </div>
  <p className="text-xs text-white/20 mt-1">
    © {new Date().getFullYear()} Veilora Club
  </p>
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