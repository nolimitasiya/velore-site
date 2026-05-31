"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

type NavigationPromoKey =
  | "CLOTHING"
  | "ACCESSORIES"
  | "OCCASION"
  | "NEW_IN"
  | "SHOP_BY_BRANDS"
  | "EDITORIAL"
  | "SALE";

type NavigationPromo = {
  id: string;
  key: NavigationPromoKey;
  title: string;
  kicker: string | null;
  blurb: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const PROMO_ORDER: NavigationPromoKey[] = [
  "CLOTHING",
  "ACCESSORIES",
  "OCCASION",
  "NEW_IN",
  "SHOP_BY_BRANDS",
  "EDITORIAL",
  "SALE",
];

const DEFAULTS: Record<
  NavigationPromoKey,
  {
    title: string;
    kicker: string;
    blurb: string;
    ctaLabel: string;
    ctaHref: string;
  }
> = {
  CLOTHING: {
    title: "Modern modest essentials",
    kicker: "Veilora Edit",
    blurb:
      "Discover refined modest pieces curated across global brands, from elevated essentials to statement silhouettes.",
    ctaLabel: "View all clothing",
    ctaHref: "/categories/clothing",
  },
    ACCESSORIES: {
    title: "Finishing pieces with intention",
    kicker: "Accessories Edit",
    blurb:
      "Discover curated accessories designed to complement modest dressing with polish and ease.",
    ctaLabel: "Shop accessories",
    ctaHref: "/categories/accessories",
  },
  OCCASION: {
    title: "Dressing for every moment",
    kicker: "Occasion Edit",
    blurb:
      "Explore occasion-led dressing across curated edits, from everyday polish to wedding, Eid, and evening dressing.",
    ctaLabel: "View all occasions",
    ctaHref: "/categories/occasion",
  },
  NEW_IN: {
    title: "Fresh arrivals, thoughtfully selected",
    kicker: "New In",
    blurb:
      "Stay close to the newest modestwear arrivals across the Veilora edit.",
    ctaLabel: "Shop new in",
    ctaHref: "/new-in",
  },
  SHOP_BY_BRANDS: {
    title: "Discover brands with a point of view",
    kicker: "Brand Edit",
    blurb:
      "Browse a curated mix of global modest brands, each bringing its own distinct identity.",
    ctaLabel: "Shop by brands",
    ctaHref: "/brands",
  },
  EDITORIAL: {
    title: "Stories, style notes, and thoughtful edits",
    kicker: "Editorial",
    blurb:
      "Explore the Veilora editorial space for diary entries, modest style inspiration, and curated features.",
    ctaLabel: "View editorial",
    ctaHref:  "/diary",
  },
  SALE: {
    title: "Refined pieces at considered prices",
    kicker: "Sale Edit",
    blurb:
      "Explore reduced styles across the Veilora edit without compromising on elegance.",
    ctaLabel: "Shop sale",
    ctaHref: "/sale",
  },
};

function emptyPromo(key: NavigationPromoKey): NavigationPromo {
  return {
    id: `temp-${key}`,
    key,
    title: DEFAULTS[key].title,
    kicker: DEFAULTS[key].kicker,
    blurb: DEFAULTS[key].blurb,
    imageUrl: null,
    ctaLabel: DEFAULTS[key].ctaLabel,
    ctaHref: DEFAULTS[key].ctaHref,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function prettyKey(key: NavigationPromoKey) {
  return key.replaceAll("_", " ");
}

export default function AdminNavigationPage() {
  const [promos, setPromos] = useState<Record<NavigationPromoKey, NavigationPromo>>(
  {
    CLOTHING: emptyPromo("CLOTHING"),
    ACCESSORIES: emptyPromo("ACCESSORIES"),
    OCCASION: emptyPromo("OCCASION"),
    NEW_IN: emptyPromo("NEW_IN"),
    SHOP_BY_BRANDS: emptyPromo("SHOP_BY_BRANDS"),
    EDITORIAL: emptyPromo("EDITORIAL"),
    SALE: emptyPromo("SALE"),
  }
);

  const [busy, setBusy] = useState(true);
  const [savingKey, setSavingKey] = useState<NavigationPromoKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/admin/navigation-promos", {
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      setError(json?.error ?? "Failed to load navigation promos");
      setBusy(false);
      return;
    }

    const next: Record<NavigationPromoKey, NavigationPromo> = {
  CLOTHING: emptyPromo("CLOTHING"),
  ACCESSORIES: emptyPromo("ACCESSORIES"),
  OCCASION: emptyPromo("OCCASION"),
  NEW_IN: emptyPromo("NEW_IN"),
  SHOP_BY_BRANDS: emptyPromo("SHOP_BY_BRANDS"),
  EDITORIAL: emptyPromo("EDITORIAL"),
  SALE: emptyPromo("SALE"),
};

    for (const promo of (json.promos ?? []) as NavigationPromo[]) {
      next[promo.key] = promo;
    }

    setPromos(next);
    setBusy(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updatePromo(
    key: NavigationPromoKey,
    updater: (promo: NavigationPromo) => NavigationPromo
  ) {
    setPromos((prev) => ({
      ...prev,
      [key]: updater(prev[key]),
    }));
  }

  async function savePromo(key: NavigationPromoKey) {
    const promo = promos[key];
    setSavingKey(key);

    const res = await fetch(`/api/admin/navigation-promos/${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: promo.title,
        kicker: promo.kicker,
        blurb: promo.blurb,
        imageUrl: promo.imageUrl,
        ctaLabel: promo.ctaLabel,
        ctaHref: promo.ctaHref,
        isActive: promo.isActive,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setSavingKey(null);

    if (!res.ok || !json.ok) {
      alert(json?.error ?? `Failed to save ${key}`);
      return;
    }

    alert(`${prettyKey(key)} promo saved`);
    await load();
  }

  return (
    <main className="min-h-screen bg-neutral-50/70">
  <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8">
  <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        Admin · Content
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Navigation Promos
      </h1>
      <p className="max-w-2xl text-sm leading-6 text-white/60">
        Manage editorial content for each storefront header navigation slot.
      </p>
    </div>
  </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {busy ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/60">
          Loading navigation promos...
        </div>
      ) : (
        <div className="space-y-6">
          {PROMO_ORDER.map((key) => {
            const promo = promos[key];

            return (
                <section key={key} className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
  <div className="flex items-center justify-between border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Nav slot</div>
      <h2 className="mt-0.5 text-base font-semibold text-black">{prettyKey(key)}</h2>
    </div>
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${
      promo.isActive
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-black/10 bg-neutral-100 text-neutral-600"
    }`}>
      {promo.isActive ? "Active" : "Inactive"}
    </span>
  </div>
  <div className="p-6">

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium">Kicker</span>
                    <input
                      type="text"
                      value={promo.kicker ?? ""}
                      onChange={(e) =>
                        updatePromo(key, (p) => ({ ...p, kicker: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-[#7B2D3E]/30 focus:ring-2 focus:ring-[#7B2D3E]/10"
                      placeholder="e.g. Veilora Edit"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium">Title</span>
                    <input
                      type="text"
                      value={promo.title}
                      onChange={(e) =>
                        updatePromo(key, (p) => ({ ...p, title: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-[#7B2D3E]/30 focus:ring-2 focus:ring-[#7B2D3E]/10"
                      placeholder="Promo title"
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-medium">Blurb</span>
                    <textarea
                      value={promo.blurb ?? ""}
                      onChange={(e) =>
                        updatePromo(key, (p) => ({ ...p, blurb: e.target.value }))
                      }
                      rows={4}
                      className="w-full rounded-2xl border border-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-[#7B2D3E]/30 focus:ring-2 focus:ring-[#7B2D3E]/10"
                      placeholder="Short editorial description"
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-medium">Image URL</span>
                    <input
                      type="url"
                      value={promo.imageUrl ?? ""}
                      onChange={(e) =>
                        updatePromo(key, (p) => ({ ...p, imageUrl: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-[#7B2D3E]/30 focus:ring-2 focus:ring-[#7B2D3E]/10"
                      placeholder="https://..."
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium">CTA label</span>
                    <input
                      type="text"
                      value={promo.ctaLabel ?? ""}
                      onChange={(e) =>
                        updatePromo(key, (p) => ({ ...p, ctaLabel: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-[#7B2D3E]/30 focus:ring-2 focus:ring-[#7B2D3E]/10"
                      placeholder="e.g. View all clothing"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium">CTA href</span>
                    <input
                      type="text"
                      value={promo.ctaHref ?? ""}
                      onChange={(e) =>
                        updatePromo(key, (p) => ({ ...p, ctaHref: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-[#7B2D3E]/30 focus:ring-2 focus:ring-[#7B2D3E]/10"
                      placeholder="/categories/clothing"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-6">
                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50/80 px-4 py-3 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-[#7B2D3E]"
                      checked={promo.isActive}
                      onChange={(e) =>
                        updatePromo(key, (p) => ({ ...p, isActive: e.target.checked }))
                      }
                    />
                    <span className="font-medium text-neutral-800">Active — show this promo in the nav</span>
                    </label>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
                  <div className="rounded-2xl border border-[#e8ddd4] bg-[#fdf7f4] p-5">
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/50">
                    Preview copy
                    </div>

                    <div className="space-y-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-black/45">
                        {promo.kicker || "No kicker"}
                      </div>

                      <div className="text-xl text-black">
                        {promo.title || "No title"}
                      </div>

                      <div className="text-sm leading-6 text-black/55">
                        {promo.blurb || "No blurb"}
                      </div>

                      <div className="inline-flex w-fit border-b border-[#7B2D3E] pb-1 text-[11px] uppercase tracking-[0.14em] text-[#7B2D3E]">
                        {promo.ctaLabel || "No CTA"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-white p-4">
                    <div className="mb-3 text-xs uppercase tracking-[0.14em] text-black/40">
                      Preview image
                    </div>

                    <div className="aspect-[4/5] overflow-hidden rounded-xl bg-black/5">
                      {promo.imageUrl ? (
                        <img
                          src={promo.imageUrl}
                          alt={`${promo.key} promo`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-black/35">
                          No image
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
  onClick={() => savePromo(key)}
  disabled={savingKey === key}
  className="inline-flex items-center rounded-2xl bg-[#7B2D3E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-50"
>
  {savingKey === key ? "Saving..." : "Save promo"}
</button>
                </div>
                 </div>
            </section>
          );
        })}
        </div>
      )}
    </div>
  </main>
  );
}