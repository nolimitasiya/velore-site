// C:\Users\Asiya\projects\dalra\app\brand\(authed)\products\[id]\ProductEditClient.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import countries from "world-countries";

type Status = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "NEEDS_CHANGES" | "REJECTED";

type TaxItem = { id: string; name: string; slug: string };

type Product = {
  id: string;
  title: string;
  slug: string;
  sourceUrl: string;
  affiliateUrl: string | null;
  currency: string;
  price: string | null;
  stock: number | null;
  note: string | null;
  productType: string | null;
  status: Status;
  worldwideShipping: boolean;
  shippingCountries: { countryCode: string }[];
  badges: string[];
  images: { url: string; sortOrder: number }[];
  publishedAt: string | null;

  // relations coming from GET
  productMaterials?: { material: TaxItem }[];
  productColours?: { colour: TaxItem }[];
  productSizes?: { size: TaxItem }[];
};

const PRODUCT_TYPES = ["ABAYA", "DRESS", "SKIRT", "TOP", "HIJAB"] as const;

const BADGES = [
  "bestseller",
  "new_in",
  "editor_pick",
  "modest_essential",
  "limited_stock",
  "sale",
  "ramadan_edit",
  "eid_edit",
  "workwear",
  "next_day",
] as const;

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-xs transition",
        active ? "bg-black text-white border-black" : "bg-white text-black border-black/10 hover:bg-black/5",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function uniqStr(xs: string[]) {
  return Array.from(new Set(xs.filter(Boolean)));
}

function snapshotForDirtyCheck(
  prod: Product,
  selectedMaterialIds: string[],
  selectedColourIds: string[],
  selectedSizeIds: string[]
) {
  return JSON.stringify({
    title: prod.title ?? "",
    slug: prod.slug ?? "",
    sourceUrl: prod.sourceUrl ?? "",
    affiliateUrl: prod.affiliateUrl ?? "",
    currency: prod.currency ?? "GBP",
    price: prod.price ?? null,
    stock: prod.stock ?? null,
    note: prod.note ?? null,
    productType: prod.productType ?? null,
    worldwideShipping: !!prod.worldwideShipping,
    shippingCountries: (prod.shippingCountries ?? []).map((x) => x.countryCode).sort(),
    badges: Array.isArray(prod.badges) ? [...prod.badges].sort() : [],
    images: Array.isArray(prod.images) ? [...prod.images].sort((a, b) => a.sortOrder - b.sortOrder).map((x) => x.url) : [],
    materialIds: [...selectedMaterialIds].sort(),
    colourIds: [...selectedColourIds].sort(),
    sizeIds: [...selectedSizeIds].sort(),
  });
}

async function fetchTaxonomy(path: string): Promise<TaxItem[]> {
  const r = await fetch(path, { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j?.error ?? `Failed (${r.status})`);
  return Array.isArray(j.items) ? j.items : [];
}

export default function ProductEditClient({ id }: { id: string }) {
  const [p, setP] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // taxonomy options
  const [materials, setMaterials] = useState<TaxItem[]>([]);
  const [colours, setColours] = useState<TaxItem[]>([]);
  const [sizes, setSizes] = useState<TaxItem[]>([]);

  // selected ids
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedColourIds, setSelectedColourIds] = useState<string[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);

  // ✅ “saved state” snapshot + tiny “Saved ✓” feedback
  const savedRef = useRef<string>("");
  const [justSaved, setJustSaved] = useState(false);

  const countryOptions = useMemo(() => {
    return countries
      .map((c) => ({ code: c.cca2, name: c.name.common }))
      .filter((x) => x.code && x.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const dirty = useMemo(() => {
    if (!p) return false;
    return (
      snapshotForDirtyCheck(p, selectedMaterialIds, selectedColourIds, selectedSizeIds) !== savedRef.current
    );
  }, [p, selectedMaterialIds, selectedColourIds, selectedSizeIds]);

  const buyUrl = useMemo(() => {
    if (!p) return "";
    return (p.affiliateUrl?.trim() || p.sourceUrl?.trim() || "").trim();
  }, [p]);

  function toggleSelected(setter: (v: string[]) => void, current: string[], id: string) {
    const has = current.includes(id);
    setter(has ? current.filter((x) => x !== id) : [...current, id]);
  }

  async function loadAll() {
    setError(null);

    // 1) load product
    const r = await fetch(`/api/brand/products/${id}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      setError(j?.error ?? "Failed to load");
      return;
    }

    const prod = j.product as any;

    const shippingCountries = (prod.shippingCountries ?? []).map((x: any) => x.countryCode);

    const nextP: Product = {
      id: prod.id,
      title: prod.title ?? "",
      slug: prod.slug ?? "",
      sourceUrl: prod.sourceUrl ?? "",
      affiliateUrl: prod.affiliateUrl ?? null,
      currency: prod.currency ?? "GBP",
      price: prod.price ?? null,
      stock: prod.stock ?? null,
      note: prod.note ?? null,
      productType: prod.productType ?? null,
      status: prod.status,
      worldwideShipping: Boolean(prod.worldwideShipping),
      shippingCountries: shippingCountries.map((cc: string) => ({ countryCode: cc })),
      badges: Array.isArray(prod.badges) ? prod.badges : [],
      images: Array.isArray(prod.images) ? prod.images : [],
      publishedAt: prod.publishedAt ?? null,
      productMaterials: Array.isArray(prod.productMaterials) ? prod.productMaterials : [],
      productColours: Array.isArray(prod.productColours) ? prod.productColours : [],
      productSizes: Array.isArray(prod.productSizes) ? prod.productSizes : [],
    };

    setP(nextP);

    // hydrate selected ids from relations
    const matIds = uniqStr((nextP.productMaterials ?? []).map((x) => x.material?.id).filter(Boolean));
    const colIds = uniqStr((nextP.productColours ?? []).map((x) => x.colour?.id).filter(Boolean));
    const sizIds = uniqStr((nextP.productSizes ?? []).map((x) => x.size?.id).filter(Boolean));

    setSelectedMaterialIds(matIds);
    setSelectedColourIds(colIds);
    setSelectedSizeIds(sizIds);

    // 2) load taxonomy options (in parallel)
    try {
      const [m, c, s] = await Promise.all([
        fetchTaxonomy("/api/brand/taxonomy/materials"),
        fetchTaxonomy("/api/brand/taxonomy/colours"),
        fetchTaxonomy("/api/brand/taxonomy/sizes"),
      ]);
      setMaterials(m);
      setColours(c);
      setSizes(s);
    } catch (e: any) {
      // Don't block editing if taxonomy list fails, but show an error
      setError((prev) => prev ?? e?.message ?? "Failed to load taxonomy");
    }

    // ✅ after load, treat as “saved”
    savedRef.current = snapshotForDirtyCheck(nextP, matIds, colIds, sizIds);
    setJustSaved(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggleBadge(b: string) {
    if (!p) return;
    const has = p.badges.includes(b);
    const next = has ? p.badges.filter((x) => x !== b) : [...p.badges, b];
    setP({ ...p, badges: next });
  }

  function setShippingCountry(code: string, checked: boolean) {
    if (!p) return;
    const set = new Set(p.shippingCountries.map((x) => x.countryCode));
    if (checked) set.add(code);
    else set.delete(code);
    setP({ ...p, shippingCountries: Array.from(set).map((cc) => ({ countryCode: cc })) });
  }

  async function saveDraft() {
    if (!p) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: p.title,
        slug: p.slug,
        sourceUrl: p.sourceUrl,
        affiliateUrl: p.affiliateUrl,
        currency: p.currency,
        price: p.price,
        stock: p.stock,
        note: p.note,
        productType: p.productType,
        badges: p.badges,
        worldwideShipping: p.worldwideShipping,
        shippingCountries: p.shippingCountries.map((x) => x.countryCode),
        images: p.images.map((x) => x.url),

        // ✅ new multi-select relations
        materialIds: selectedMaterialIds,
        colourIds: selectedColourIds,
        sizeIds: selectedSizeIds,
      };

      const r = await fetch(`/api/brand/products/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setError(j?.error ?? `Failed to save (${r.status})`);
        return;
      }

      await loadAll();

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
    } finally {
      setSaving(false);
    }
  }

  if (!p) return <div className="text-sm text-black/60">{error ?? "Loading..."}</div>;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border p-4 flex flex-wrap items-center gap-2">
        <span className="text-xs rounded-full border px-3 py-1 bg-black/5 border-black/10">
          Status: {p.status.replace("_", " ")}
        </span>

        {p.publishedAt && (
          <span className="text-xs rounded-full border px-3 py-1 bg-emerald-50 text-emerald-800 border-emerald-200">
            Live
          </span>
        )}

        {buyUrl && (
          <a
            href={buyUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto rounded-lg border border-black/10 bg-white px-4 py-2 text-sm hover:bg-black/5"
          >
            Buy
          </a>
        )}

        <button
          onClick={saveDraft}
          disabled={saving || !dirty}
          className={[
            buyUrl ? "" : "ml-auto",
            "rounded-lg px-4 py-2 text-sm transition",
            saving
              ? "bg-black text-white opacity-60"
              : dirty
              ? "bg-black text-white hover:opacity-90"
              : "bg-neutral-200 text-neutral-600 cursor-not-allowed",
          ].join(" ")}
        >
          {saving ? "Saving..." : justSaved ? "Saved ✓" : dirty ? "Save draft" : "No changes"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">Title</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={p.title}
            onChange={(e) => setP({ ...p, title: e.target.value })}
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Slug</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={p.slug}
            onChange={(e) => setP({ ...p, slug: e.target.value })}
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm font-medium">Source URL</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={p.sourceUrl}
            onChange={(e) => setP({ ...p, sourceUrl: e.target.value })}
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm font-medium">Affiliate URL (Buy Now)</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={p.affiliateUrl ?? ""}
            onChange={(e) => setP({ ...p, affiliateUrl: e.target.value || null })}
          />
        </label>
      </div>

      {/* ✅ Price + Currency */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">Price</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            inputMode="decimal"
            placeholder="e.g. 89.99"
            value={p.price ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setP({ ...p, price: v === "" ? null : v });
            }}
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Currency</div>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
            value={p.currency ?? "GBP"}
            onChange={(e) => setP({ ...p, currency: e.target.value })}
          >
            <option value="GBP">GBP</option>
            <option value="EUR">EUR</option>
            <option value="CHF">CHF</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>

      {/* ✅ Product type (chips, single-select) */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="font-medium">Product type</div>

        <div className="flex flex-wrap gap-2">
          {PRODUCT_TYPES.map((t) => (
            <Chip key={t} active={p.productType === t} onClick={() => setP({ ...p, productType: t })}>
              {t.toLowerCase()}
            </Chip>
          ))}

          <Chip active={p.productType === null} onClick={() => setP({ ...p, productType: null })}>
            clear
          </Chip>
        </div>

        <div className="text-xs text-black/60">
          Current: <span className="font-medium">{p.productType ?? "—"}</span>
        </div>
      </div>

      {/* ✅ Materials (multi-select chips) */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Materials</div>
          <button
            type="button"
            className="text-xs text-black/60 hover:text-black"
            onClick={() => setSelectedMaterialIds([])}
          >
            clear
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {materials.map((m) => (
            <Chip
              key={m.id}
              active={selectedMaterialIds.includes(m.id)}
              onClick={() => toggleSelected(setSelectedMaterialIds, selectedMaterialIds, m.id)}
            >
              {m.name}
            </Chip>
          ))}
          {!materials.length && <div className="text-xs text-black/50">No materials yet (seed them first).</div>}
        </div>
      </div>

      {/* ✅ Colours (multi-select chips) */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Colours</div>
          <button
            type="button"
            className="text-xs text-black/60 hover:text-black"
            onClick={() => setSelectedColourIds([])}
          >
            clear
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {colours.map((c) => (
            <Chip
              key={c.id}
              active={selectedColourIds.includes(c.id)}
              onClick={() => toggleSelected(setSelectedColourIds, selectedColourIds, c.id)}
            >
              {c.name}
            </Chip>
          ))}
          {!colours.length && <div className="text-xs text-black/50">No colours yet (seed them first).</div>}
        </div>
      </div>

      {/* ✅ Sizes (multi-select chips) */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Sizes</div>
          <button
            type="button"
            className="text-xs text-black/60 hover:text-black"
            onClick={() => setSelectedSizeIds([])}
          >
            clear
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <Chip
              key={s.id}
              active={selectedSizeIds.includes(s.id)}
              onClick={() => toggleSelected(setSelectedSizeIds, selectedSizeIds, s.id)}
            >
              {s.name}
            </Chip>
          ))}
          {!sizes.length && <div className="text-xs text-black/50">No sizes yet (seed them first).</div>}
        </div>
      </div>

      {/* Badges chips */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="font-medium">Badges</div>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => {
            const active = p.badges.includes(b);
            return (
              <button
                key={b}
                type="button"
                onClick={() => toggleBadge(b)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active ? "bg-black text-white border-black" : "border-black/10 hover:bg-black/5"
                }`}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>

      {/* Shipping */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Shipping</div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={p.worldwideShipping}
              onChange={(e) => setP({ ...p, worldwideShipping: e.target.checked })}
            />
            Worldwide
          </label>
        </div>

        {!p.worldwideShipping && (
          <div className="space-y-2">
            <div className="text-sm text-black/70">Select countries (ISO-2). Leave empty if unknown.</div>

            <div className="max-h-72 overflow-auto rounded-xl border p-2">
              {countryOptions.map((c) => {
                const checked = p.shippingCountries.some((x) => x.countryCode === c.code);
                return (
                  <label key={c.code} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setShippingCountry(c.code, e.target.checked)}
                    />
                    <span className="w-10 text-black/60">{c.code}</span>
                    <span>{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
1