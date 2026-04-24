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
                <Link href="/shipping-returns" className="block text-white/70 transition hover:text-white">
                  Shipping &amp; Returns
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

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/50">
            © {new Date().getFullYear()} Veilora Club
          </div>

          <div className="mt-4 flex justify-center gap-6 text-xs text-white/40">
            <Link href="/admin" className="transition hover:text-white">
              Admin
            </Link>
            <Link href="/brand/login" className="transition hover:text-white">
              Brand Portal
            </Link>
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