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

  // ✅ simple fade-in
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
// ✅ autofocus when shopper form appears
useEffect(() => {
  if (mode === "shopper") {
    const t = setTimeout(() => {
      document.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
    }, 200);

    return () => clearTimeout(t);
  }
}, [mode]);

  // Set this later when ready:
  const launchDate: string | null = null; // e.g. "April 15, 2026"

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
    <main className="min-h-screen w-full bg-white text-neutral-900 flex items-center justify-center px-6">
      <div
        className={[
          "w-full max-w-xl text-center transition-all duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        ].join(" ")}
      >
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">
          Veilora Club
        </h1>
{mode === null && (
  <div className="mt-10 flex flex-col sm:flex-row items-stretch justify-center gap-3">
    <button
      onClick={() => setMode("shopper")}
      className="rounded-2xl border px-6 py-4 text-base font-medium hover:bg-neutral-50 transition"
    >
      I’m a shopper
    </button>

    <button
      onClick={() => {
            console.log("Brand button clicked - going to /brand-apply");
            router.push("/brands/apply");}}
      className="rounded-2xl border px-6 py-4 text-base font-medium hover:bg-neutral-50 transition"
    >
      I’m a brand
    </button>
  </div>
)}


        <p className="mt-6 text-sm text-neutral-900">
          We’re launching soon{launchDate ? ` — ${launchDate}` : "."}
        </p>

       <div
  className={[
    "overflow-hidden transition-all duration-500 ease-out",
    mode === "shopper"
      ? "max-h-[800px] opacity-100 translate-y-0"
      : "max-h-0 opacity-0 -translate-y-2",
  ].join(" ")}
>
  {mode === "shopper" && (
    <form
      onSubmit={submit}
      className="mt-10 mx-auto max-w-md space-y-3 text-left"
    >
      <div>
  <label htmlFor="name" className="text-sm font-medium">
    Name
  </label>
  <input
    id="name"
    name="name"
    className="mt-1 w-full rounded-2xl border px-4 py-3"
    value={name}
    onChange={(e) => setName(e.target.value)}
    required
  />
</div>

<div>
  <label htmlFor="email" className="text-sm font-medium">
    Email
  </label>
  <input
    id="email"
    name="email"
    className="mt-1 w-full rounded-2xl border px-4 py-3"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    type="email"
    required
  />
</div>


      <button
        disabled={status === "loading"}
        className="w-full rounded-2xl bg-black text-white px-4 py-3 font-medium disabled:opacity-60"
        type="submit"
      >
        {status === "loading" ? "Joining..." : "Join waitlist"}
      </button>

      {msg && (
        <p
          className={`text-sm ${
            status === "error" ? "text-red-600" : "text-green-700"
          }`}
        >
          {msg}
        </p>
      )}
    </form>
  )}
</div>
</div>
    </main>
  );
}



