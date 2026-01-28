import "./globals.css";
import LocationSwitcher from "../components/LocationSwitcher";
import MobileMenu from "../components/MobileMenu";
import HeaderNav from "../components/HeaderNav";
import HeaderSearch from "../components/HeaderSearch";
import StickyHeader from "../components/StickyHeader";
import CookieBanner from "../components/CookieBanner";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { NewsletterModal } from "@/components/newsletter/NewsletterModal";


import Link from "next/link";
import { Playfair_Display, Inter } from "next/font/google";





const heading = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Veilora Club",
  description: "Where global brands and international style meet",
  openGraph: {
    title: "Veilora Club",
    description: "Where global brands and international style meet",
    url: SITE_URL,
    siteName: "Veilora Club",
  },
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      {/* ✅ Body should be black text globally (header will override to white) */}
      <body className="min-h-screen w-full bg-[#eee] font-body text-black">
        {/* ✅ Sticky, momentum header */}
{/* ✅ Sticky, momentum header */}
<StickyHeader>
  <header className="border-b bg-black text-white">
    <div className="mx-auto w-full max-w-[1800px] px-8">
      

   <div className="flex items-center py-4">
  {/* Left group: mobile hamburger first, then currency */}
  <div className="flex items-center gap-3">
    {/* Mobile menu – FIRST on mobile */}
    <div className="md:hidden relative z-50">
      <MobileMenu />
    </div>

    {/* Location / currency */}
    <LocationSwitcher />
  </div>

  {/* Desktop search – right aligned */}
  <div className="ml-auto hidden md:flex">
    <HeaderSearch />
  </div>
</div>



      {/* Row 2: Logo centered */}
      <div className="pb-3 text-center">
        <Link
          href="/"
          className="font-display text-4xl md:text-5xl leading-none tracking-[0.06em] text-white"
        >
          Veilora Club
        </Link>
      </div>

      {/* Row 3: Nav centered under logo (desktop only) */}
      <div className="hidden md:block pb-4">
        <HeaderNav />
      </div>
    </div>
  </header>
</StickyHeader>


        {/* Main */}
        <main className="w-full">{children}</main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-black text-white">
        <div className="mx-auto w-full max-w-[1800px] px-8 py-14 text-sm">
    
    {/* Brand */}
    <div className="mb-10 text-center">
  <div className="font-heading text-2xl md:text-3xl tracking-[0.3em] text-white">
    Veilora Club
  </div>
      <div className="mt-3 text-sm md:text-base tracking-wide text-white/80">
    Where global brands and international style meet
  </div>
</div>

    {/* Footer links */}
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
      <Link
        href="/about"
        className="transition-colors text-white/70 hover:text-white"
      >
        About
      </Link>

      <Link
        href="/privacy-policy"
        className="transition-colors text-white/70 hover:text-white"
      >
        Privacy Policy
      </Link>

      <Link
        href="/terms"
        className="transition-colors text-white/70 hover:text-white"
      >
        Terms &amp; Conditions
      </Link>

      <Link
        href="/shipping-returns"
        className="transition-colors text-white/70 hover:text-white"
      >
        Shipping &amp; Returns
      </Link>

      <Link
        href="/ethics"
        className="transition-colors text-white/70 hover:text-white"
      >
        Ethics &amp; Compliance
      </Link>
      
    </div>
    <div className="mt-6 max-w-md mx-auto">
  <NewsletterSignup />
</div>

    {/* Copyright */}
    <div className="mt-10 text-center text-xs text-white/50">
      © {new Date().getFullYear()} Veilora Club
    </div>
  </div>
</footer>

<CookieBanner />
<NewsletterModal />

      </body>
      
    </html>
  );
}
