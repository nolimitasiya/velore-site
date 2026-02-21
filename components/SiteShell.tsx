import LocationSwitcher from "@/components/LocationSwitcher";
import MobileMenu from "@/components/MobileMenu";
import HeaderNav from "@/components/HeaderNav";
import HeaderSearch from "@/components/HeaderSearch";
import StickyHeader from "@/components/StickyHeader";
import CookieBanner from "@/components/CookieBanner";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { NewsletterModal } from "@/components/newsletter/NewsletterModal";
import Link from "next/link";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-white font-body text-black">
      <StickyHeader>
        <header className="border-b bg-black text-white">
          <div className="mx-auto w-full max-w-[1800px] px-8">
            <div className="flex items-center py-4">
              <div className="flex items-center gap-3">
                <div className="md:hidden relative z-50">
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
                className="font-display text-4xl md:text-5xl leading-none tracking-[0.06em] text-white"
              >
                Veilora Club
              </Link>
            </div>

            <div className="hidden md:block pb-4">
              <HeaderNav />
            </div>
          </div>
        </header>
      </StickyHeader>

      <main className="w-full">{children}</main>

      <footer className="border-t border-white/10 bg-black text-white">
        <div className="mx-auto w-full max-w-[1800px] px-8 py-14 text-sm">
          <div className="mb-10 text-center">
            <div className="font-heading text-2xl md:text-3xl tracking-[0.3em] text-white">
              Veilora Club
            </div>
            <div className="mt-3 text-sm md:text-base tracking-wide text-white/80">
              Where global brands and international style meet
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
            <Link href="/about" className="transition-colors text-white/70 hover:text-white">
              About
            </Link>
            <Link href="/privacy-policy" className="transition-colors text-white/70 hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors text-white/70 hover:text-white">
              Terms &amp; Conditions
            </Link>
            <Link href="/shipping-returns" className="transition-colors text-white/70 hover:text-white">
              Shipping &amp; Returns
            </Link>
            <Link href="/ethics" className="transition-colors text-white/70 hover:text-white">
              Ethics &amp; Compliance
            </Link>

            <Link href="/admin" className="text-xs text-white/60 hover:text-white transition">
              Admin
            </Link>

            <Link href="/brand/login" className="text-xs text-white/60 hover:text-white transition">
              Brand Portal
            </Link>
          </div>

          <div className="mt-6 max-w-md mx-auto">
            <NewsletterSignup />
          </div>

          <div className="mt-10 text-center text-xs text-white/50">
            © {new Date().getFullYear()} Veilora Club
          </div>
        </div>
      </footer>

      <CookieBanner />
      <NewsletterModal />
    </div>
  );
}
