// C:\Users\Asiya\projects\dalra\app\(gate)\Gate.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type JoinMode = null | "shopper";
type SubmitStatus = "idle" | "loading" | "done" | "error";

export default function Gate() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Early access: shared toggle between shopper / brand ──
  const [mode, setMode] = useState<JoinMode>(null);

  // Shopper form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shopperStatus, setShopperStatus] = useState<SubmitStatus>("idle");
  const [shopperMsg, setShopperMsg] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mode === "shopper") {
      const t = setTimeout(() => {
        document.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [mode]);

  async function submitShopper(e: React.FormEvent) {
    e.preventDefault();
    if (shopperStatus === "loading") return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    setShopperStatus("loading");
    setShopperMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setShopperStatus("error");
        setShopperMsg(data?.error || "Something went wrong. Try again.");
        return;
      }
      setShopperStatus("done");
      setName("");
      setEmail("");
      setTimeout(() => router.push("/thanks"), 700);
    } catch {
      setShopperStatus("error");
      setShopperMsg("Network error. Try again.");
    }
  }

  function resetChoice() {
    setMode(null);
  }

  return (
    <main
      className={[
        "min-h-screen w-full bg-white transition-opacity duration-700",
        mounted ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      {/* ══════════════ HEADER ══════════════ */}
      <header className="sticky top-0 z-50 border-b border-[#EDE6DC] bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-5 md:px-12">
          <div className="font-heading text-2xl font-semibold text-[#1a0a0e]">
            Veilora Club
          </div>

          <nav className="hidden items-center gap-10 md:flex">
            <a href="#about" className="text-sm font-medium text-[#000000] transition hover:text-[#1a0a0e]">
              About
            </a>
            <a href="#features" className="text-sm font-medium text-[#000000] transition hover:text-[#1a0a0e]">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-[#000000] transition hover:text-[#1a0a0e]">
              Discover
            </a>
            <a href="#for-brands" className="text-sm font-medium text-[#000000] transition hover:text-[#1a0a0e]">
              For Brands
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#shoppers"
              className="hidden rounded bg-[#7A2A3A] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.06em] text-white transition hover:opacity-90 sm:inline-block"
            >
              Join Waitlist
            </a>
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex flex-col gap-1.5 p-1.5 md:hidden"
            >
              <span className="block h-[2px] w-[22px] bg-[#1a0a0e]" />
              <span className="block h-[2px] w-[22px] bg-[#1a0a0e]" />
              <span className="block h-[2px] w-[22px] bg-[#1a0a0e]" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-4 border-t border-[#EDE6DC] px-6 py-5 md:hidden">
            <a href="#about" onClick={() => setMenuOpen(false)} className="text-sm text-[#6b5c4e]">About</a>
            <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm text-[#6b5c4e]">Features</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-sm text-[#6b5c4e]">How it works</a>
            <a href="#for-brands" onClick={() => setMenuOpen(false)} className="text-sm text-[#6b5c4e]">For Brands</a>
            <a href="#shoppers" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-[#7A2A3A]">Join Waitlist</a>
          </nav>
        )}
      </header>

      {/* ══════════════ HERO / MISSION ══════════════ */}
      <section id="about" className="px-6 py-20 md:px-12 md:py-28">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-2 lg:gap-24">
          <div className="relative aspect-[4/5] overflow-hidden rounded">
            <Image
              src="/images/hero-mission.jpg"
              alt="Woman wearing a modest jilbab set standing among classical columns"
              fill
              className="object-cover object-[center_20%]"
              priority
            />
          </div>

          <div>
            <h1 className="mt-4 font-heading text-4xl leading-[1.1] text-[#1a0a0e] md:text-5xl">
              Discover <em className="italic text-[#7A2A3A]">modest fashion.</em>
            </h1>
            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-[#000000]">
              Veilora Club is a curated discovery platform connecting shoppers with modest
              fashion brands from around the world. From emerging designers to established
              labels, Veilora Club helps you discover your next favourite brand.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
             
              <a
                href="#how-it-works"
                className="text-sm font-semibold text-[#7A2A3A] underline underline-offset-4"
              >
                Explore our features →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ OUR FEATURES ══════════════ */}
      <section id="features" className="px-6 pb-10 pt-4 md:px-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto mb-16 max-w-xl text-center">            <h2 className="mt-4 font-heading text-3xl text-[#1a0a0e] md:text-4xl">
              Our Features
            </h2>
          </div>

          <div className="grid gap-9 md:grid-cols-3">
            <div className="rounded-md border border-[#EDE6DC] p-10 text-center">
              <div className="font-heading text-5xl italic font-bold text-[#7A2A3A]">7</div>
              <h3 className="mt-4 font-heading text-lg text-[#1a0a0e]">Continents</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6b5c4e]">
                Modest fashion from every corner of the globe.
              </p>
            </div>

            <div className="rounded-md border border-[#EDE6DC] p-10 text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7A2A3A"
                strokeWidth={1.5}
                className="mx-auto h-11 w-11"
              >
                <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 014 18.5v-13z" />
                <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 001.5-1.5v-13z" />
              </svg>
              <h3 className="mt-4 font-heading text-lg text-[#1a0a0e]">The Veilora Diary</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6b5c4e]">
                Stories that inspire, cultural moments &amp; style edits.
              </p>
            </div>

            <div className="rounded-md border border-[#EDE6DC] p-10 text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7A2A3A"
                strokeWidth={1.5}
                className="mx-auto h-11 w-11"
              >
                <path d="M12 21v-8" />
                <path d="M12 13c0-3.5-2.5-6-6.5-6C5.5 11 8 13.5 12 13.5" />
                <path d="M12 13c0-4 3-7 7.5-7C19.5 10.5 16.5 13.5 12 13.5" />
              </svg>
              <h3 className="mt-4 font-heading text-lg text-[#1a0a0e]">Emerging Brands</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6b5c4e]">
                Discover your next new favorite brands.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ THE PROCESS ══════════════ */}
      <section id="how-it-works" className="px-6 pb-8 pt-4 md:px-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto mb-16 max-w-xl text-center">
          
            <h2 className="mt-4 font-heading text-3xl text-[#1a0a0e] md:text-4xl">
              How Veilora Club works
            </h2>
          </div>

          <div className="grid gap-9 md:grid-cols-3">
            <div className="rounded-md border border-[#EDE6DC] p-10">
              <span className="font-heading text-4xl italic font-bold text-[#7A2A3A]">01</span>
              <h3 className="mt-4 text-lg font-semibold text-[#1a0a0e]">Discover</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6b5c4e]">
                Browse curated collections from modest brands across many countries, all in one place.
              </p>
            </div>
            <div className="rounded-md border border-[#EDE6DC] p-10">
              <span className="font-heading text-4xl italic font-bold text-[#7A2A3A]">02</span>
              <h3 className="mt-4 text-lg font-semibold text-[#1a0a0e]">Browse by Occasion</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6b5c4e]">
                Find the perfect outfit for every moment. From everyday essentials to weddings, Eid, graduation and workwear.
              </p>
            </div>
            <div className="rounded-md border border-[#EDE6DC] p-10">
              <span className="font-heading text-4xl italic font-bold text-[#7A2A3A]">03</span>
              <h3 className="mt-4 text-lg font-semibold text-[#1a0a0e]">Shop direct</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6b5c4e]">
                Complete checkout securely on the brand's own website.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ EARLY ACCESS (shoppers + brands) ══════════════ */}
      <section id="shoppers" className="px-6 pb-24 pt-8 md:px-12">
        <div className="mx-auto max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A2A3A]">
            Early Access
          </p>
          <h2 className="mt-4 font-heading text-3xl text-[#1a0a0e] md:text-4xl">
            Be the first<br />to shop the edit.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6b5c4e]">
            Join our waitlist and get exclusive early access when we launch.
          </p>

          {mode === null && (
            <div className="mt-8 flex flex-col gap-4 text-left">
              <button
                type="button"
                onClick={() => setMode("shopper")}
                className="flex items-center justify-between rounded bg-[#7A2A3A] px-6 py-5 text-sm font-semibold text-white transition hover:bg-[#5E1F2C]"
              >
                <span>I'm a shopper</span>
                <span>→</span>
              </button>
              <button
                type="button"
                id="for-brands"
                onClick={() => router.push("/brands/apply")}
                className="flex items-center justify-between rounded border border-[#EDE6DC] px-6 py-5 text-sm font-semibold text-[#7A2A3A] transition hover:border-[#7A2A3A]"
              >
                <span>I'm a brand — partner with us</span>
                <span>→</span>
              </button>
            </div>
          )}

          {mode === "shopper" && (
            <div className="mt-8 text-left">
              {shopperStatus === "done" ? (
                <div className="rounded border border-[#EDE6DC] bg-[#FAF8F5] px-6 py-8 text-center">
                  <p className="font-heading text-lg text-[#1a0a0e]">You're on the list.</p>
                  <p className="mt-1 text-sm text-[#6b5c4e]">Taking you to the confirmation page…</p>
                </div>
              ) : (
                <form onSubmit={submitShopper} className="space-y-4" noValidate>
                  <input
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    {...(shopperStatus === "error" ? { "aria-invalid": true } : {})}
                    className="w-full rounded border border-[#EDE6DC] bg-[#FAF8F5] px-4 py-3.5 text-sm text-[#1a0a0e] placeholder:text-[#a89280] outline-none focus:border-[#7A2A3A]"
                  />
                  <input
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    {...(shopperStatus === "error"
                      ? { "aria-invalid": true, "aria-describedby": "shopper-msg" }
                      : {})}
                    className="w-full rounded border border-[#EDE6DC] bg-[#FAF8F5] px-4 py-3.5 text-sm text-[#1a0a0e] placeholder:text-[#a89280] outline-none focus:border-[#7A2A3A]"
                  />
                  <button
                    type="submit"
                    disabled={shopperStatus === "loading"}
                    className="w-full rounded bg-[#1a0a0e] px-4 py-3.5 text-sm font-bold uppercase tracking-[0.04em] text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {shopperStatus === "loading" ? "Joining..." : "Get Early Access"}
                  </button>
                  <button
                    type="button"
                    onClick={resetChoice}
                    className="w-full text-center text-xs text-[#a89280] underline underline-offset-4 hover:text-[#7A2A3A]"
                  >
                    ← Back
                  </button>
                  {shopperMsg && (
                    <p
                      id="shopper-msg"
                      role="status"
                      aria-live="polite"
                      className={`text-sm ${shopperStatus === "error" ? "text-red-600" : "text-green-700"}`}
                    >
                      {shopperMsg}
                    </p>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="border-t border-[#EDE6DC] px-6 py-11 md:px-12">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-3.5 text-center">
          <div className="font-heading text-2xl font-semibold text-[#1a0a0e]">
            Veilora Club
          </div>
          <div className="text-sm text-[#a89280]">The Home of Global Modest Fashion</div>

          <div className="mt-1.5 flex items-center gap-5">
            <a href="https://www.instagram.com/veiloraclub/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-[#6b5c4e] transition hover:text-[#7A2A3A]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-[19px] w-[19px]">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" />
              </svg>
            </a>
            <a href="https://www.tiktok.com/@veiloraclub" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-[#6b5c4e] transition hover:text-[#7A2A3A]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-[19px] w-[19px]">
                <path d="M14 3v10.5a3.5 3.5 0 11-3.5-3.5c.35 0 .68.04 1 .12V7.2A6.5 6.5 0 1017.5 13.5V9.2c1.06.72 2.34 1.14 3.5 1.14V7.3c-1.9 0-3.5-1.62-3.5-3.3h-3.5z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/company/veilora-club/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-[#6b5c4e] transition hover:text-[#7A2A3A]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-[19px] w-[19px]">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <line x1="7.5" y1="10.5" x2="7.5" y2="16.5" />
                <circle cx="7.5" cy="7.3" r="0.9" fill="currentColor" stroke="none" />
                <path d="M11.5 16.5v-3.7c0-1.4.9-2.3 2.1-2.3 1.2 0 2 .8 2 2.3v3.7" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
