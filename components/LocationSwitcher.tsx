"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCATION,
  MAJOR_LOCATIONS,
  Location,
  currencySortKey,
} from "@/data/locations";

const LS_KEY = "dalra_location";

function flagUrl(code: string) {
  return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
}

function Flag({
  code,
  name,
  size = 20,
}: {
  code: string;
  name: string;
  size?: number;
}) {
  return (
    <img
      src={flagUrl(code)}
      alt={`${name} flag`}
      width={size}
      height={Math.round((size * 3) / 4)}
      className="rounded-sm ring-1 ring-black/10"
      loading="lazy"
    />
  );
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function LocationSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<Location>(DEFAULT_LOCATION);

  // Load saved location
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Location;
      if (parsed?.code && parsed?.currency && parsed?.name) setCurrent(parsed);
    } catch {
      // ignore
    }
  }, []);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = q
      ? MAJOR_LOCATIONS.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.currency.toLowerCase().includes(q)
        )
      : MAJOR_LOCATIONS;

    // Group by currency
    const groups = new Map<string, Location[]>();
    for (const item of base) {
      if (!groups.has(item.currency)) groups.set(item.currency, []);
      groups.get(item.currency)!.push(item);
    }

    const ordered = Array.from(groups.entries()).sort(
      (a, b) => currencySortKey(a[0]) - currencySortKey(b[0])
    );

    // Sort inside each currency group
    for (const [, items] of ordered) {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return ordered;
  }, [query]);

  // ✅ THIS is where it goes (client-side)
  async function choose(loc: Location) {
    setCurrent(loc);
    setOpen(false);
    setQuery("");

    try {
      localStorage.setItem(LS_KEY, JSON.stringify(loc));
    } catch {}

    // ✅ Set cookies for country
    setCookie("dalra_country", loc.code);

    // ✅ Set currency via API (sets vc_currency + dalra_currency on the server response)
    await fetch("/api/currency/set", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currency: loc.currency }),
    });

    // ✅ Force server components (categories pages) to re-read cookies
    router.refresh();
  }

  return (
    <>
      {/* Flag button (header left) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Change location"
        className="inline-flex items-center gap-3 rounded-full px-3 py-2 text-white/90 transition-colors hover:text-white"
      >
        <Flag code={current.code} name={current.name} size={22} />

        <span className="text-sm tracking-widest text-white/80 hidden lg:inline">
          {current.currency}
        </span>

        <span className="text-white/60 text-sm">▾</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Modal */}
      <div
        className={[
          "fixed left-1/2 top-1/2 z-[60] w-[min(92vw,820px)] -translate-x-1/2 -translate-y-1/2",
          "rounded-3xl bg-white shadow-xl border",
          "transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Change location"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div className="font-heading text-lg text-black">Change location</div>
          <button
            type="button"
            className="rounded-full px-3 py-2 text-black/60 hover:text-black hover:bg-black/[0.04]"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or currency"
              className="w-full rounded-2xl border px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-auto px-2 py-2">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-sm text-black/60">No results.</div>
          ) : (
            filtered.map(([currency, items]) => (
              <div key={currency} className="mb-3">
                <div className="px-4 pt-3 pb-2 text-xs tracking-widest text-black/50">
                  {currency}
                </div>

                <div className="rounded-2xl overflow-hidden border mx-2">
                  {items.map((loc) => {
                    const active =
                      loc.code === current.code &&
                      loc.currency === current.currency;

                    return (
                      <button
                        key={loc.code}
                        type="button"
                        onClick={() => choose(loc)}
                        className={[
                          "w-full flex items-center justify-between px-4 py-4 text-left",
                          "transition-colors hover:bg-black/[0.03]",
                          active ? "bg-black/[0.04]" : "bg-white",
                          "border-b last:border-b-0",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <Flag code={loc.code} name={loc.name} size={20} />
                          <div className="text-sm text-black">{loc.name}</div>
                        </div>

                        <div className="text-sm text-black/60 tabular-nums">
                          {loc.symbol ? `${loc.symbol} ` : ""}
                          {loc.currency}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
