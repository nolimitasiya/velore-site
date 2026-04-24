"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import countries from "world-countries";
import { BRAND_CURRENCY_OPTIONS } from "@/lib/currency/codes";
import { PRODUCT_TYPES } from "@/lib/taxonomy/productTypes";

function SectionCard({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-black/6 bg-[linear-gradient(180deg,#fff_0%,#fbf8f2_100%)] px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            {eyebrow ? (
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                {eyebrow}
              </div>
            ) : null}
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-neutral-500">{description}</p>
            ) : null}
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>

      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function SoftButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full bg-black px-4 py-2 text-sm text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-neutral-900">{children}</div>
      {hint ? <div className="text-xs text-neutral-500">{hint}</div> : null}
    </div>
  );
}

function InputShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="rounded-2xl border border-black/8 bg-[#fcfbf8] p-1.5">{children}</div>;
}

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
      setTimeout(() => onClose(), 700);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-2xl">
        <div className="border-b border-black/6 bg-[linear-gradient(180deg,#fff_0%,#fbf8f2_100%)] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                Taxonomy request
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-950">
                Request new taxonomy
              </div>
              <div className="mt-1 text-sm text-neutral-500">
                Submit a missing taxonomy item for admin review.
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-neutral-600 hover:bg-black/[0.03]"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <label className="block space-y-2">
            <FieldLabel>Type</FieldLabel>
            <InputShell>
              <select
                className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="MATERIAL">Material</option>
                <option value="COLOUR">Colour</option>
                <option value="SIZE">Size</option>
                <option value="STYLE">Style</option>
              </select>
            </InputShell>
          </label>

          <label className="block space-y-2">
            <FieldLabel>Name</FieldLabel>
            <InputShell>
              <input
                className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
                placeholder="e.g. Crinkle chiffon"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </InputShell>
          </label>

          <label className="block space-y-2">
            <FieldLabel hint="Optional context for admin review">Reason</FieldLabel>
            <InputShell>
              <input
                className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
                placeholder="e.g. Common in hijabs"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </InputShell>
          </label>

          {err ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          {okMsg ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {okMsg}
            </div>
          ) : null}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm hover:bg-black/[0.03]"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="flex-1 rounded-full bg-black px-4 py-2.5 text-sm text-white hover:opacity-90 disabled:opacity-60"
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
  categoryId: string | null;
  status: Status;
  worldwideShipping: boolean;
  shippingCountries: { countryCode: string }[];
  badges: string[];
  images: { url: string; sortOrder: number }[];
  publishedAt: string | null;

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

const BADGES = ["sale"] as const;

const ACCESSORY_COLOUR_SLUGS = [
  "gold",
  "silver",
  "rose-gold",
  "platinum",
  "pearl",
  "black",
];



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
        "rounded-full border px-3.5 py-1.5 text-xs transition",
        active
          ? "border-black bg-black text-white shadow-sm"
          : "border-black/10 bg-white text-neutral-700 hover:bg-black/[0.03]",
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
    categoryId: prod.categoryId ?? null,
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

function filterAccessoryColours(items: TaxItem[]) {
  return items.filter((item) => ACCESSORY_COLOUR_SLUGS.includes(item.slug));
}

export default function ProductEditClient({ id }: { id: string }) {
  const [p, setP] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [myReqs, setMyReqs] = useState<BrandTaxRequest[]>([]);
  const [showMyReqs, setShowMyReqs] = useState(false);
  const isExpanded = showMyReqs;
  const ariaExpanded = isExpanded ? "true" : "false";
  const ariaLabel = isExpanded ? "Collapse taxonomy requests" : "Expand taxonomy requests";

  const [materials, setMaterials] = useState<TaxItem[]>([]);
  const [occasions, setOccasions] = useState<TaxItem[]>([]);
  const [colours, setColours] = useState<TaxItem[]>([]);
  const [sizes, setSizes] = useState<TaxItem[]>([]);
  const [styles, setStyles] = useState<TaxItem[]>([]);
  const [accessoryCategories, setAccessoryCategories] = useState<TaxItem[]>([]);

  const [reqOpen, setReqOpen] = useState(false);
  const [reqDefaultType, setReqDefaultType] = useState<"MATERIAL" | "COLOUR" | "SIZE" | "STYLE">("MATERIAL");

  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedOccasionIds, setSelectedOccasionIds] = useState<string[]>([]);
  const [selectedColourIds, setSelectedColourIds] = useState<string[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);

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
      categoryId: prod.category?.id ?? null,
      status: prod.status,
      worldwideShipping: Boolean(prod.worldwideShipping),
      shippingCountries: shippingCountries.map((cc: string) => ({ countryCode: cc })),
      badges: Array.isArray(prod.badges)
  ? prod.badges.filter((b: string) => b !== "next_day")
  : [],
      images: Array.isArray(prod.images) ? prod.images : [],
      publishedAt: prod.publishedAt ?? null,
      productMaterials: Array.isArray(prod.productMaterials) ? prod.productMaterials : [],
      productOccasions: Array.isArray(prod.productOccasions) ? prod.productOccasions : [],
      productColours: Array.isArray(prod.productColours) ? prod.productColours : [],
      productSizes: Array.isArray(prod.productSizes) ? prod.productSizes : [],
      productStyles: Array.isArray(prod.productStyles) ? prod.productStyles : [],
    };

    setP(nextP);

    try {
      const rr = await fetch("/api/brand/taxonomy/requests?status=ALL", { cache: "no-store" });
      const rj = await rr.json().catch(() => ({}));
      if (rr.ok && rj.ok) setMyReqs(Array.isArray(rj.items) ? rj.items : []);
    } catch {}

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

    try {
            const [m, o, c, s, st, accessoryCats] = await Promise.all([
        nextP.productType
          ? fetchTaxonomy(`/api/brand/taxonomy/materials?productType=${encodeURIComponent(String(nextP.productType))}`)
          : Promise.resolve([]),
        fetchTaxonomy("/api/brand/taxonomy/occasions"),
        fetchTaxonomy("/api/brand/taxonomy/colours"),
        nextP.productType === "ACCESSORIES"
  ? Promise.resolve([])
  : fetchTaxonomy("/api/brand/taxonomy/sizes"),
        nextP.productType
          ? fetchTaxonomy(`/api/brand/taxonomy/styles?productType=${encodeURIComponent(String(nextP.productType))}`)
          : Promise.resolve([]),
        nextP.productType === "ACCESSORIES"
          ? fetchTaxonomy("/api/brand/taxonomy/categories?parent=accessories")
          : Promise.resolve([]),
      ]);

      setMaterials(m);
setOccasions(o);
setColours(
  nextP.productType === "ACCESSORIES" ? filterAccessoryColours(c) : c);
setSizes(s);
setStyles(st);
setAccessoryCategories(accessoryCats);
    } catch (e: any) {
      setError((prev) => prev ?? e?.message ?? "Failed to load taxonomy");
    }

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
  setColours([]);
  setAccessoryCategories([]);
  setSelectedMaterialIds([]);
  setSelectedStyleIds([]);
  setSelectedColourIds([]);
  return;
}

    (async () => {
      try {
        const pt = p.productType;
        if (!pt) {
  setMaterials([]);
  setStyles([]);
  setColours([]);
  setAccessoryCategories([]);
  setSelectedMaterialIds([]);
  setSelectedStyleIds([]);
  setSelectedColourIds([]);
  return;
}

          const [m, st, c, accessoryCats] = await Promise.all([
  fetchTaxonomy(`/api/brand/taxonomy/materials?productType=${encodeURIComponent(pt)}`),
  fetchTaxonomy(`/api/brand/taxonomy/styles?productType=${encodeURIComponent(pt)}`),
  fetchTaxonomy("/api/brand/taxonomy/colours"),
  pt === "ACCESSORIES"
    ? fetchTaxonomy("/api/brand/taxonomy/categories?parent=accessories")
    : Promise.resolve([]),
]);

const nextColours =
  pt === "ACCESSORIES" ? filterAccessoryColours(c) : c;

setMaterials(m);
setStyles(st);
setColours(nextColours);
setAccessoryCategories(accessoryCats);

setSelectedMaterialIds((prev) =>
  prev.filter((id) => m.some((x: TaxItem) => x.id === id))
);

setSelectedStyleIds((prev) =>
  prev.filter((id) => st.some((x: TaxItem) => x.id === id))
);

setSelectedColourIds((prev) =>
  prev.filter((id) => nextColours.some((x: TaxItem) => x.id === id))
);

if (pt === "ACCESSORIES") {
  setSelectedSizeIds([]);
}
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
  if (value === "HOODIE_SWEATSHIRT") return "Hoodie & Sweatshirt";
  if (value === "T_SHIRT") return "T-Shirt";

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
        categoryId: p.categoryId,
        badges: p.badges,
        worldwideShipping: p.worldwideShipping,
        shippingCountries: p.shippingCountries.map((x) => x.countryCode),
        images: p.images.map((x) => x.url),
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

  if (!p) {
    return (
      <div className="rounded-[24px] border border-black/8 bg-white px-5 py-5 text-sm text-black/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {error ?? "Loading..."}
      </div>
    );
  }

  const pendingCount = myReqs.filter((r) => r.status === "PENDING").length;
  const approvedCount = myReqs.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = myReqs.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="space-y-8 bg-[#fcfbf8] p-6 md:p-8">
      {error ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <RequestTaxonomyModal
        open={reqOpen}
        onClose={() => setReqOpen(false)}
        defaultType={reqDefaultType}
        onSubmitted={loadAll}
        contextProductType={p?.productType ?? null}
      />

      <section className="overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="border-b border-black/6 bg-[linear-gradient(180deg,#fff_0%,#fbf8f2_100%)] px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                Product editor
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                Edit product
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Update your product details, taxonomy, badges, and shipping information before submission.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs text-neutral-700">
                  Status: {p.status.replace("_", " ")}
                </span>

                {p.publishedAt ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
                    Live
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {buyUrl ? (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm transition hover:bg-black/[0.03]"
                >
                  View live product
                </a>
              ) : null}

              <button
                onClick={saveDraft}
                disabled={saving || !dirty}
                className={[
                  "rounded-full px-4 py-2 text-sm transition shadow-sm",
                  saving
                    ? "bg-black text-white opacity-60"
                    : dirty
                    ? "bg-black text-white hover:opacity-90"
                    : "cursor-not-allowed bg-neutral-200 text-neutral-600",
                ].join(" ")}
              >
                {saving ? "Saving..." : justSaved ? "Saved ✓" : dirty ? "Save draft" : "No changes"}
              </button>
            </div>
          </div>
        </div>
      </section>

      

      <SectionCard
        eyebrow="Core details"
        title="Product information"
        description="Set the essential details shoppers and admin reviewers rely on."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <FieldLabel>Title</FieldLabel>
            <InputShell>
              <input
                className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
                value={p.title}
                onChange={(e) => setP({ ...p, title: e.target.value })}
              />
            </InputShell>
          </label>

          <label className="space-y-2">
            <FieldLabel>Slug</FieldLabel>
            <InputShell>
              <input
                className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
                value={p.slug}
                onChange={(e) => setP({ ...p, slug: e.target.value })}
              />
            </InputShell>
          </label>

          <label className="space-y-2 md:col-span-2">
            <FieldLabel>Source URL</FieldLabel>
            <InputShell>
              <input
                className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
                value={p.sourceUrl}
                onChange={(e) => setP({ ...p, sourceUrl: e.target.value })}
              />
            </InputShell>
          </label>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <FieldLabel>Price</FieldLabel>
            <InputShell>
              <input
                className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
                inputMode="decimal"
                placeholder="e.g. 89.99"
                value={p.price ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setP({ ...p, price: v === "" ? null : v });
                }}
              />
            </InputShell>
          </label>

          <label className="space-y-2">
            <FieldLabel>Currency</FieldLabel>
            <InputShell>
              <select
                className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
                value={(p.currency || "GBP").toUpperCase()}
                onChange={(e) => setP({ ...p, currency: e.target.value.toUpperCase() })}
              >
                {BRAND_CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </InputShell>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Classification"
        title="Product type"
        description="Choose the product type first. This controls which materials and styles become available."
      >
        <div className="flex flex-wrap gap-2">
          {PRODUCT_TYPES.map((t) => (
            <Chip
  key={t}
  active={p.productType === t}
  onClick={() => {
  setP({
    ...p,
    productType: t,
    categoryId: t === "ACCESSORIES" ? p.categoryId : null,
  });

  if (t === "ACCESSORIES") {
    setSelectedMaterialIds([]);
    setSelectedSizeIds([]);
  }
}}
>
              {formatProductTypeLabel(t)}
            </Chip>
          ))}

          <Chip active={p.productType === null} onClick={() => setP({ ...p, productType: null, categoryId: null })}>
            Clear
          </Chip>
        </div>

        <div className="mt-4 text-sm text-neutral-500">
          Current: <span className="font-medium text-neutral-900">{p.productType ?? "—"}</span>
        </div>
      </SectionCard>

      

            {p.productType === "ACCESSORIES" && (
        <SectionCard
          eyebrow="Classification"
          title="Accessory category"
          description="Select the accessory type that best matches this product."
          actions={
            <SoftButton onClick={() => setP({ ...p, categoryId: null })}>
              Clear
            </SoftButton>
          }
        >
          {!accessoryCategories.length ? (
            <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm text-neutral-500">
              No accessory categories available yet.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accessoryCategories.map((cat) => (
                <Chip
                  key={cat.id}
                  active={p.categoryId === cat.id}
                  onClick={() => setP({ ...p, categoryId: cat.id })}
                >
                  {cat.name}
                </Chip>
              ))}

              <Chip
                active={p.categoryId === null}
                onClick={() => setP({ ...p, categoryId: null })}
              >
                Clear
              </Chip>
            </div>
          )}

          <div className="mt-4 text-sm text-neutral-500">
            Current:{" "}
            <span className="font-medium text-neutral-900">
              {accessoryCategories.find((cat) => cat.id === p.categoryId)?.name ?? "—"}
            </span>
          </div>
        </SectionCard>
      )}



      {p.productType !== "ACCESSORIES" && (
      <SectionCard
        eyebrow="Taxonomy"
        title="Materials"
        description="Select one or more materials relevant to this product."
        actions={
          <>
            <SoftButton onClick={() => setSelectedMaterialIds([])}>Clear</SoftButton>
            <SoftButton
              onClick={() => {
                if (!p?.productType) return;
                setReqDefaultType("MATERIAL");
                setReqOpen(true);
              }}
              disabled={!p?.productType}
            >
              Request new
            </SoftButton>
          </>
        }
      >
        {!p.productType ? (
          <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm text-neutral-500">
            Select a <span className="font-medium text-neutral-900">product type</span> first to choose materials.
          </div>
        ) : !materials.length ? (
          <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm text-neutral-500">
            No materials for this product type yet.
          </div>
        ) : (
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
      </SectionCard>
      )}

      <SectionCard
        eyebrow="Taxonomy"
        title="Occasions"
        description="Add the occasions this product is suitable for."
        actions={<SoftButton onClick={() => setSelectedOccasionIds([])}>Clear</SoftButton>}
      >
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

          {!occasions.length ? (
            <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm text-neutral-500">
              No occasions yet.
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Taxonomy"
        title="Styles"
        description="Styles are filtered by product type so the list stays relevant."
        actions={
          <>
            <SoftButton onClick={() => setSelectedStyleIds([])}>Clear</SoftButton>
            <SoftButton
              onClick={() => {
                if (!p?.productType) return;
                setReqDefaultType("STYLE");
                setReqOpen(true);
              }}
              disabled={!p?.productType}
            >
              Request new
            </SoftButton>
          </>
        }
      >
        {!p.productType ? (
          <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm text-neutral-500">
            Select a <span className="font-medium text-neutral-900">product type</span> first to choose styles.
          </div>
        ) : !styles.length ? (
          <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm text-neutral-500">
            No styles for this product type yet.
          </div>
        ) : (
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
      </SectionCard>

      <SectionCard
        eyebrow="Taxonomy"
        title="Colours"
        description="Choose all colours visible on the product."
        actions={
          <>
            <SoftButton onClick={() => setSelectedColourIds([])}>Clear</SoftButton>
            <SoftButton
              onClick={() => {
                setReqDefaultType("COLOUR");
                setReqOpen(true);
              }}
            >
              Request new
            </SoftButton>
          </>
        }
      >
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
        </div>

        {!colours.length ? (
          <div className="mt-3 rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm text-neutral-500">
            No colours yet (seed them first).
          </div>
        ) : null}
      </SectionCard>

      {p.productType !== "ACCESSORIES" && (
  <SectionCard
    eyebrow="Taxonomy"
    title="Sizes"
    description="Select all sizes available for the product."
    actions={
      <>
        <SoftButton onClick={() => setSelectedSizeIds([])}>Clear</SoftButton>
        <SoftButton
          onClick={() => {
            setReqDefaultType("SIZE");
            setReqOpen(true);
          }}
        >
          Request new
        </SoftButton>
      </>
    }
  >
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
    </div>

    {!sizes.length ? (
      <div className="mt-3 rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm text-neutral-500">
        No sizes yet (seed them first).
      </div>
    ) : null}
  </SectionCard>
)}

      <SectionCard
        eyebrow="Merchandising"
        title="Badges"
        description="Add lightweight merchandising signals for shoppers."
      >
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => {
            const active = p.badges.includes(b);
            return (
              <button
                key={b}
                type="button"
                onClick={() => toggleBadge(b)}
                className={[
                  "rounded-full border px-3.5 py-1.5 text-xs transition",
                  active
                    ? "border-black bg-black text-white shadow-sm"
                    : "border-black/10 bg-white text-neutral-700 hover:bg-black/[0.03]",
                ].join(" ")}
              >
                {b}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Logistics"
        title="Shipping"
        description="Mark whether the product ships worldwide or select supported countries."
      >
        <div className="flex items-center justify-between gap-4 rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4">
          <div>
            <div className="font-medium text-neutral-900">Worldwide shipping</div>
            <div className="mt-1 text-sm text-neutral-500">
              Turn this on if the product can be shipped globally.
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={p.worldwideShipping}
              onChange={(e) => setP({ ...p, worldwideShipping: e.target.checked })}
            />
            Worldwide
          </label>
        </div>

        {!p.worldwideShipping ? (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-neutral-500">Select countries (ISO-2). Leave empty if unknown.</div>

            <div className="max-h-80 overflow-auto rounded-[22px] border border-black/8 bg-[#fcfbf8] p-3">
              {countryOptions.map((c) => {
                const checked = p.shippingCountries.some((x) => x.countryCode === c.code);
                return (
                  <label
                    key={c.code}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setShippingCountry(c.code, e.target.checked)}
                    />
                    <span className="w-10 text-neutral-400">{c.code}</span>
                    <span className="text-neutral-800">{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        eyebrow="Requests"
        title="My taxonomy requests"
        description="Track the status of your requested materials, styles, colours, and sizes."
        actions={
          <button
            type="button"
            onClick={() => setShowMyReqs((v) => !v)}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-black/[0.03]"
            aria-expanded={ariaExpanded}
            aria-controls="my-taxonomy-requests"
            aria-label={ariaLabel}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4">
            <div className="text-xs uppercase tracking-[0.14em] text-neutral-400">Pending</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{pendingCount}</div>
          </div>
          <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4">
            <div className="text-xs uppercase tracking-[0.14em] text-neutral-400">Approved</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{approvedCount}</div>
          </div>
          <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4">
            <div className="text-xs uppercase tracking-[0.14em] text-neutral-400">Rejected</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{rejectedCount}</div>
          </div>
        </div>

        <div id="my-taxonomy-requests" hidden={!showMyReqs} className="mt-5 space-y-3">
          {!myReqs.length ? (
            <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm text-neutral-500">
              No requests yet.
            </div>
          ) : (
            <>
              {myReqs.slice(0, 12).map((r) => (
                <div key={r.id} className="rounded-[22px] border border-black/8 bg-[#fcfbf8] p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-neutral-900">
                      {r.type}: {r.name}
                    </div>
                    <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-neutral-700">
                      {r.status}
                    </span>
                  </div>

                  {r.reason ? (
                    <div className="mt-2 text-xs text-neutral-500">Reason: {r.reason}</div>
                  ) : null}

                  {r.status !== "PENDING" ? (
                    <div className="mt-3 text-xs">
                      {r.reviewNote ? (
                        <div className="rounded-2xl border border-black/8 bg-white p-3 text-neutral-700">
                          <span className="font-medium">Admin note:</span> {r.reviewNote}
                        </div>
                      ) : (
                        <div className="text-neutral-400">No admin note provided.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}

              {myReqs.length > 12 ? (
                <div className="text-xs text-neutral-400">Showing 12 of {myReqs.length}.</div>
              ) : null}
            </>
          )}
        </div>

        {!showMyReqs ? (
          <div className="mt-4 text-xs text-neutral-500">
            {myReqs.length ? "Collapsed — expand to review details." : "No requests yet — submit one from a taxonomy section below."}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}