// C:\Users\Asiya\projects\dalra\app\(gate)\Gate.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Gate() {
  const router = useRouter();
  const [mode, setMode] = useState<"shopper" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mode === "shopper") {
      const t = setTimeout(() => {
        document.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMsg(data?.error || "Something went wrong. Try again.");
        return;
      }
      setStatus("done");
      setName("");
      setEmail("");
      router.push("/thanks");
    } catch {
      setStatus("error");
      setMsg("Network error. Try again.");
    }
  }

  return (
    <main
      className={[
        "min-h-screen w-full transition-opacity duration-700",
        mounted ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* ── Left panel — burgundy ── */}
        <div className="relative flex flex-col justify-between bg-[#7B2D3E] px-10 py-12 md:px-16 md:py-16">

          {/* Brand */}
          <div>
            <div className="font-heading text-3xl tracking-[0.08em] text-white md:text-4xl">
              Veilora Club
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/50">
              Global Modest Fashion
            </div>
          </div>

          {/* Hero text */}
          <div className="py-16">
            <div className="h-px w-10 bg-white/30 mb-8" />
            <h1 className="font-heading text-4xl leading-[1.15] text-white md:text-5xl xl:text-6xl">
              The home of<br />
              global modest<br />
              <span className="italic text-[#f2c4a0]">fashion.</span>
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/65 font-light">
              Where global brands and international style meet.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f2c4a0]" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/80">
                Launching soon
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-[11px] tracking-[0.12em] text-white/25">
            © {new Date().getFullYear()} Veilora Club
          </div>
        </div>

        {/* ── Right panel — warm white ── */}
        <div className="flex flex-col justify-center bg-[#faf8f4] px-10 py-12 md:px-16 md:py-16">

          <div className="mx-auto w-full max-w-md">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7B2D3E]">
              Early Access
            </p>
            <h2 className="mt-4 font-heading text-3xl text-[#1a0a0e] md:text-4xl">
              Be the first<br />to shop the edit.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6b5c4e]">
              Join our waitlist and get exclusive early access when we launch.
            </p>

            {/* CTA buttons — always visible */}
            {mode === null && (
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={() => setMode("shopper")}
                  className="flex items-center justify-between rounded bg-[#7B2D3E] px-5 py-4 text-sm tracking-wide text-white transition hover:bg-[#6a2535]"
                >
                  <span>I'm a shopper</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => router.push("/brands/apply")}
                  className="flex items-center justify-between rounded border border-[#7B2D3E] px-5 py-4 text-sm tracking-wide text-[#7B2D3E] transition hover:bg-[#7B2D3E]/5"
                >
                  <span>I'm a brand — partner with us</span>
                  <span>→</span>
                </button>
              </div>
            )}

            {/* Shopper form */}
            <div
              className={[
                "overflow-hidden transition-all duration-500 ease-out",
                mode === "shopper"
                  ? "max-h-[600px] opacity-100"
                  : "max-h-0 opacity-0",
              ].join(" ")}
            >
              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#d8c9b5]" />
                <span className="text-[11px] tracking-[0.12em] text-[#a89280]">
                  Join the waitlist
                </span>
                <div className="h-px flex-1 bg-[#d8c9b5]" />
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label
                    htmlFor="gate-name"
                    className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]"
                  >
                    Your name
                  </label>
                  <input
                    id="gate-name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Asiya"
                    className="w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="gate-email"
                    className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]"
                  >
                    Email address
                  </label>
                  <input
                    id="gate-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="asiya@example.com"
                    className="w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:opacity-60"
                >
                  {status === "loading" ? "Joining..." : "Join waitlist →"}
                </button>

                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="w-full text-center text-xs text-[#a89280] underline underline-offset-4 hover:text-[#7B2D3E]"
                >
                  Back
                </button>

                {msg && (
                  <p className={`text-sm ${status === "error" ? "text-red-600" : "text-green-700"}`}>
                    {msg}
                  </p>
                )}

                <p className="text-[11px] leading-relaxed text-[#a89280]">
                  We'll never share your details. You'll only hear from us when something worth knowing happens.
                </p>
              </form>
            </div>

            {/* Back button when in shopper mode — shown above form */}
            {mode === "shopper" && (
              <div className="mt-2" />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
