// C:\Users\Asiya\projects\dalra\app\brand\(authed)\products\[id]\ProductEditClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import countries from "world-countries";
import { BRAND_CURRENCY_OPTIONS } from "@/lib/currency/codes";
import { PRODUCT_TYPES } from "@/lib/taxonomy/productTypes";


function RequestTaxonomyModal({
  open,
  onClose,
  defaultType,
  onSubmitted,
  contextProductType,
}: {
  open: boolean;
  onClose: () => void;
  defaultType: "MATERIAL" | "COLOUR" | "SIZE" | "STYLE";
  onSubmitted: () => void;
  contextProductType?: string | null;
}) {
  const [type, setType] = useState<"MATERIAL" | "COLOUR" | "SIZE" | "STYLE">(defaultType);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType(defaultType);
    setName("");
    setReason("");
    setErr(null);
    setOkMsg(null);
  }, [open, defaultType]);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      const r = await fetch("/api/brand/taxonomy/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
  type,
  name,
  reason: reason.trim() || null,
  ...((type === "MATERIAL" || type === "STYLE")
  ? { productTypes: contextProductType ? [contextProductType] : [] }
  : {}),
}),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setErr(j?.error ?? `Failed (${r.status})`);
        return;
      }
      setOkMsg("Request submitted ✅ (pending review)");
      onSubmitted();
      setTimeout(() => onClose(), 600);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Request new taxonomy</div>
            <div className="text-xs text-black/60">Submit an item you think is missing.</div>
          </div>
          <button onClick={onClose} className="text-sm text-black/60 hover:text-black">
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="space-y-1 block">
            <div className="text-sm font-medium">Type</div>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="MATERIAL">Material</option>
              <option value="COLOUR">Colour</option>
              <option value="SIZE">Size</option>
              <option value="STYLE">Style</option>
            </select>
          </label>

          <label className="space-y-1 block">
            <div className="text-sm font-medium">Name</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. Crinkle chiffon"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="space-y-1 block">
            <div className="text-sm font-medium">Reason (optional)</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. Common in hijabs"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          {err && <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{err}</div>}
          {okMsg && <div className="rounded-xl bg-emerald-50 p-2 text-sm text-emerald-800">{okMsg}</div>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-black/5"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="flex-1 rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              disabled={busy || name.trim().length < 2}
            >
              {busy ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  productOccasions?: { occasion: TaxItem }[];
  productColours?: { colour: TaxItem }[];
  productSizes?: { size: TaxItem }[];
  productStyles?: { style: TaxItem }[];
};


type BrandTaxRequest = {
  id: string;
  type: "MATERIAL" | "COLOUR" | "SIZE" | "STYLE";
  name: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

const BADGES = [
  "sale",
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
  selectedOccasionIds: string[],
  selectedColourIds: string[],
  selectedSizeIds: string[],
  selectedStyleIds: string[]
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
    images: Array.isArray(prod.images)
      ? [...prod.images].sort((a, b) => a.sortOrder - b.sortOrder).map((x) => x.url)
      : [],
    materialIds: [...selectedMaterialIds].sort(),
    occasionIds: [...selectedOccasionIds].sort(),
    colourIds: [...selectedColourIds].sort(),
    sizeIds: [...selectedSizeIds].sort(),
    styleIds: [...selectedStyleIds].sort(),
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
  
const [myReqs, setMyReqs] = useState<BrandTaxRequest[]>([]);
const [showMyReqs, setShowMyReqs] = useState(false); // collapsed by default
const isExpanded = showMyReqs;
const ariaExpanded = isExpanded ? "true" : "false";
const ariaLabel = isExpanded
  ? "Collapse taxonomy requests"
  : "Expand taxonomy requests";

  // taxonomy options
   const [materials, setMaterials] = useState<TaxItem[]>([]);
  const [occasions, setOccasions] = useState<TaxItem[]>([]);
  const [colours, setColours] = useState<TaxItem[]>([]);
  const [sizes, setSizes] = useState<TaxItem[]>([]);
  const [styles, setStyles] = useState<TaxItem[]>([]);

  const [reqOpen, setReqOpen] = useState(false);
  const [reqDefaultType, setReqDefaultType] = useState<"MATERIAL" | "COLOUR" | "SIZE" | "STYLE">("MATERIAL");

  // selected ids
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedOccasionIds, setSelectedOccasionIds] = useState<string[]>([]);
  const [selectedColourIds, setSelectedColourIds] = useState<string[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);

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
            snapshotForDirtyCheck(
        p,
        selectedMaterialIds,
        selectedOccasionIds,
        selectedColourIds,
        selectedSizeIds,
        selectedStyleIds
      ) !== savedRef.current
    );
    }, [p, selectedMaterialIds, selectedOccasionIds, selectedColourIds, selectedSizeIds, selectedStyleIds]);

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
      productOccasions: Array.isArray(prod.productOccasions) ? prod.productOccasions : [],
      productColours: Array.isArray(prod.productColours) ? prod.productColours : [],
      productSizes: Array.isArray(prod.productSizes) ? prod.productSizes : [],
      productStyles: Array.isArray(prod.productStyles) ? prod.productStyles : [],
    };

    setP(nextP);
    // 3) load my taxonomy requests (brand history)
try {
  const rr = await fetch("/api/brand/taxonomy/requests?status=ALL", { cache: "no-store" });
  const rj = await rr.json().catch(() => ({}));
  if (rr.ok && rj.ok) setMyReqs(Array.isArray(rj.items) ? rj.items : []);
} catch {
  // silent – don’t block editing if this fails
}

    // hydrate selected ids from relations
      const matIds = uniqStr(
      (nextP.productMaterials ?? [])
        .map((x: { material: TaxItem }) => x.material?.id)
        .filter(Boolean) as string[]
    );

    const occIds = uniqStr(
      (nextP.productOccasions ?? [])
        .map((x: { occasion: TaxItem }) => x.occasion?.id)
        .filter(Boolean) as string[]
    );

    const colIds = uniqStr(
      (nextP.productColours ?? [])
        .map((x: { colour: TaxItem }) => x.colour?.id)
        .filter(Boolean) as string[]
    );

    const sizIds = uniqStr(
      (nextP.productSizes ?? [])
        .map((x: { size: TaxItem }) => x.size?.id)
        .filter(Boolean) as string[]
    );

    const styIds = uniqStr(
      (nextP.productStyles ?? [])
        .map((x: { style: TaxItem }) => x.style?.id)
        .filter(Boolean) as string[]
    );

    setSelectedMaterialIds(matIds);
    setSelectedOccasionIds(occIds);
    setSelectedColourIds(colIds);
    setSelectedSizeIds(sizIds);
    setSelectedStyleIds(styIds);

    // 2) load taxonomy options (in parallel)
    try {
                const [m, o, c, s, st] = await Promise.all([
        nextP.productType
          ? fetchTaxonomy(
              `/api/brand/taxonomy/materials?productType=${encodeURIComponent(String(nextP.productType))}`
            )
          : Promise.resolve([]),
        fetchTaxonomy("/api/brand/taxonomy/occasions"),
        fetchTaxonomy("/api/brand/taxonomy/colours"),
        fetchTaxonomy("/api/brand/taxonomy/sizes"),
        nextP.productType
          ? fetchTaxonomy(
              `/api/brand/taxonomy/styles?productType=${encodeURIComponent(String(nextP.productType))}`
            )
          : Promise.resolve([]),
      ]);

      setMaterials(m);
      setOccasions(o);
      setColours(c);
      setSizes(s);
      setStyles(st);
    } catch (e: any) {
      // Don't block editing if taxonomy list fails, but show an error
      setError((prev) => prev ?? e?.message ?? "Failed to load taxonomy");
    }

    // ✅ after load, treat as “saved”
    savedRef.current = snapshotForDirtyCheck(nextP, matIds, occIds, colIds, sizIds, styIds);
    setJustSaved(false);
  }


  useEffect(() => {
  loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [id]);

  useEffect(() => {
  if (!p?.productType) {
    setMaterials([]);
    setStyles([]);
    setSelectedMaterialIds([]);
    setSelectedStyleIds([]);
    return;
  }

  (async () => {
    try {
      const pt = p.productType;
      if (!pt) {
        setMaterials([]);
        setStyles([]);
        setSelectedMaterialIds([]);
        setSelectedStyleIds([]);
        return;
      }

      const [m, st] = await Promise.all([
        fetchTaxonomy(`/api/brand/taxonomy/materials?productType=${encodeURIComponent(pt)}`),
        fetchTaxonomy(`/api/brand/taxonomy/styles?productType=${encodeURIComponent(pt)}`),
      ]);

      setMaterials(m);
      setStyles(st);

      setSelectedMaterialIds((prev) =>
  prev.filter((id) => m.some((x: TaxItem) => x.id === id))
);

setSelectedStyleIds((prev) =>
  prev.filter((id) => st.some((x: TaxItem) => x.id === id))
);

    } catch (e: any) {
      setError((prev) => prev ?? e?.message ?? "Failed to load materials/styles");
      setMaterials([]);
      setStyles([]);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [p?.productType]);


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

  function formatProductTypeLabel(value: string) {
  if (value === "COATS_JACKETS") return "Coats & Jackets";

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
        occasionIds: selectedOccasionIds,
        colourIds: selectedColourIds,
        sizeIds: selectedSizeIds,
        styleIds: selectedStyleIds,
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

     // summary counts
const pendingCount = myReqs.filter((r) => r.status === "PENDING").length;
const approvedCount = myReqs.filter((r) => r.status === "APPROVED").length;
const rejectedCount = myReqs.filter((r) => r.status === "REJECTED").length;

const expanded: boolean = showMyReqs === true;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <RequestTaxonomyModal
  open={reqOpen}
  onClose={() => setReqOpen(false)}
  defaultType={reqDefaultType}
  onSubmitted={loadAll} // ✅
  contextProductType={p?.productType ?? null}
/>

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
     

      <div className="rounded-2xl border p-4 space-y-2">
  <div className="flex items-center justify-between">
    <div className="font-medium">
      My taxonomy requests{" "}
      <span className="text-xs text-black/50">({myReqs.length})</span>

      {!showMyReqs && myReqs.length > 0 && (
        <span className="ml-2 text-xs text-black/60">
          • {pendingCount} pending • {approvedCount} approved • {rejectedCount} rejected
        </span>
      )}
    </div>
   <button
  type="button"
  onClick={() => setShowMyReqs((v) => !v)}
  className="rounded-lg border px-2 py-1 text-xs hover:bg-black/5"
  aria-expanded={ariaExpanded}
  aria-controls="my-taxonomy-requests"
  aria-label={ariaLabel}
>
  {isExpanded ? "−" : "+"}
</button>
  </div>

  <div id="my-taxonomy-requests" hidden={!showMyReqs} className="space-y-2">
    {!myReqs.length ? (
      <div className="text-xs text-black/60">No requests yet.</div>
    ) : (
      <>
        {myReqs.slice(0, 12).map((r) => (
          <div key={r.id} className="rounded-xl border p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {r.type}: {r.name}
              </div>
              <span className="text-xs rounded-full border px-2 py-1">{r.status}</span>
            </div>

            {r.reason && <div className="text-xs text-black/60 mt-1">Reason: {r.reason}</div>}

            {r.status !== "PENDING" && (
              <div className="text-xs mt-2">
                {r.reviewNote ? (
                  <div className="rounded-lg bg-black/5 p-2">
                    <span className="font-medium">Admin note:</span> {r.reviewNote}
                  </div>
                ) : (
                  <div className="text-black/50">No admin note provided.</div>
                )}
              </div>
            )}
          </div>
        ))}

        {myReqs.length > 12 && (
          <div className="text-xs text-black/50">Showing 12 of {myReqs.length}.</div>
        )}
      </>
    )}
  </div>

  {!showMyReqs && (
    <div className="text-xs text-black/60">
      {myReqs.length ? "Collapsed — click + to view." : "No requests yet — submit one with “request new”."}
    </div>
  )}
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

       {/* <label className="space-y-1 md:col-span-2">
          <div className="text-sm font-medium">Affiliate URL (Buy Now)</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={p.affiliateUrl ?? ""}
            onChange={(e) => setP({ ...p, affiliateUrl: e.target.value || null })}
          />
        </label> */}
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
  className="w-full rounded-lg border px-3 py-2 text-sm"
  value={(p.currency || "GBP").toUpperCase()}
  onChange={(e) => setP({ ...p, currency: e.target.value.toUpperCase() })}
>
  {BRAND_CURRENCY_OPTIONS.map((c) => (
    <option key={c.code} value={c.code}>
      {c.label}
    </option>
  ))}
</select>


        </label>
      </div>

      {/* ✅ Product type (chips, single-select) */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="font-medium">Product type</div>

        <div className="flex flex-wrap gap-2">
  {PRODUCT_TYPES.map((t) => (
    <Chip key={t} active={p.productType === t} onClick={() => setP({ ...p, productType: t })}>
      {formatProductTypeLabel(t)}
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
          <button
  type="button"
  className="text-xs text-black/60 hover:text-black"
  onClick={() => {
  if (!p?.productType) return; // already enforced in UI
  setReqDefaultType("MATERIAL");
  setReqOpen(true);
}}
>
  request new
</button>
        </div>

        {!p.productType ? (
  <div className="text-xs text-black/50">
    Select a <span className="font-medium">product type</span> first to choose materials.
  </div>
) : !materials.length ? (
  <div className="text-xs text-black/50">No materials for this product type yet.</div>
) : null}
        {p.productType && materials.length > 0 && (
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
          </div>
        )}
      </div>


            {/* ✅ Occasions (multi-select chips) */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Occasions</div>
          <button
            type="button"
            className="text-xs text-black/60 hover:text-black"
            onClick={() => setSelectedOccasionIds([])}
          >
            clear
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {occasions.map((o) => (
            <Chip
              key={o.id}
              active={selectedOccasionIds.includes(o.id)}
              onClick={() => toggleSelected(setSelectedOccasionIds, selectedOccasionIds, o.id)}
            >
              {o.name}
            </Chip>
          ))}
          {!occasions.length && (
            <div className="text-xs text-black/50">No occasions yet.</div>
          )}
        </div>
      </div>




      {/* ✅ Styles (multi-select chips) */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">Styles</div>
          <button
            type="button"
            className="text-xs text-black/60 hover:text-black"
            onClick={() => setSelectedStyleIds([])}
          >
            clear
          </button>
          <button
            type="button"
            className="text-xs text-black/60 hover:text-black"
            onClick={() => {
              if (!p?.productType) return;
              setReqDefaultType("STYLE");
              setReqOpen(true);
            }}
          >
            request new
          </button>
        </div>

        {!p.productType ? (
          <div className="text-xs text-black/50">
            Select a <span className="font-medium">product type</span> first to choose styles.
          </div>
        ) : !styles.length ? (
          <div className="text-xs text-black/50">No styles for this product type yet.</div>
        ) : null}

        {p.productType && styles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {styles.map((s) => (
              <Chip
                key={s.id}
                active={selectedStyleIds.includes(s.id)}
                onClick={() => toggleSelected(setSelectedStyleIds, selectedStyleIds, s.id)}
              >
                {s.name}
              </Chip>
            ))}
          </div>
        )}
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
          <button
  type="button"
  className="text-xs text-black/60 hover:text-black"
  onClick={() => {
    setReqDefaultType("COLOUR");
    setReqOpen(true);
  }}
>
  request new
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
          <button
  type="button"
  className="text-xs text-black/60 hover:text-black"
  onClick={() => {
    setReqDefaultType("SIZE");
    setReqOpen(true);
  }}
>
  request new
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
