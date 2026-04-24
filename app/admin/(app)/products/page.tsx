

"use client";

// app/admin/products/page.tsx
export const dynamic = "force-dynamic";

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_IMPORT_TOKEN ?? "";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import {
  formatDateTime,
  formatRelativeTime,
  getUserLocale,
  getUserTimeZone,
} from "@/lib/adminTime";
import { formatMoney } from "@/lib/formatMoney";

type BrandOption = { slug: string; name: string };

type Status = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "NEEDS_CHANGES" | "REJECTED";
type ReviewAction = "approve" | "needs_changes" | "reject";

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  price: string | null;
  currency: "GBP" | "EUR" | "CHF" | "USD";
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
  affiliateUrl: string | null;
  brand: { name: string; slug: string };

  status: Status;
  submittedAt: string | null;
  reviewNote: string | null;
  lastApprovedAt: string | null;
};

function statusPill(status: Status) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "PENDING_REVIEW":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "NEEDS_CHANGES":
      return "border-orange-200 bg-orange-50 text-orange-800";
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-neutral-100 text-neutral-700";
  }
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-3xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
      {children}
    </label>
  );
}

function ProductThumbnail({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  return (
    <div className="relative h-32 w-24 overflow-hidden rounded-2xl border border-black/10 bg-neutral-50 shadow-sm">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="96px"
          className="object-contain p-1"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center px-2 text-center text-[11px] font-medium text-neutral-400">
          No image
        </div>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locale, setLocale] = useState("en-GB");
  const [tz, setTz] = useState("UTC");

  const [q, setQ] = useState("");
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const [brand, setBrand] = useState("all");

  const [brandSearch, setBrandSearch] = useState("");
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const brandPickerRef = useRef<HTMLDivElement | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [affiliateDraft, setAffiliateDraft] = useState<Record<string, string>>({});
  const [affiliateFilter, setAffiliateFilter] = useState<"all" | "missing" | "ready">("all");


  useEffect(() => {
    setLocale(getUserLocale());
    setTz(getUserTimeZone());
  }, []);

  useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (
      brandPickerRef.current &&
      !brandPickerRef.current.contains(event.target as Node)
    ) {
      setBrandPickerOpen(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

  async function load() {
    setBusy(true);
    setError(null);

    const queryParams = new URLSearchParams();
    if (q.trim()) queryParams.set("q", q.trim());
    if (active !== "all") queryParams.set("active", active);
    if (brand !== "all") queryParams.set("brand", brand);
    if (affiliateFilter !== "all") {
  queryParams.set("affiliate", affiliateFilter);
}

    const r = await fetch(`/api/admin/products?${queryParams.toString()}`);
    const j = await r.json().catch(() => ({}));

    if (!r.ok || !j.ok) {
      setError(j?.error ?? "Failed to load products");
      setBusy(false);
      return;
    }

    setRows(j.products ?? []);
    setBrands(j.brands ?? []);

    const init: Record<string, string> = {};
    for (const p of (j.products ?? []) as ProductRow[]) {
      init[p.id] = p.reviewNote ?? "";
    }
    setNoteDraft(init);
    const affiliateInit: Record<string, string> = {};
    for (const p of (j.products ?? []) as ProductRow[]) {
       affiliateInit[p.id] = p.affiliateUrl ?? "";
}
setAffiliateDraft(affiliateInit);

    setBusy(false);
  }

  async function selectBrandAndLoad(nextBrand: string) {
  setBrand(nextBrand);
  setBrandPickerOpen(false);
  setBrandSearch("");

  setBusy(true);
  setError(null);

  const queryParams = new URLSearchParams();
  if (q.trim()) queryParams.set("q", q.trim());
  if (active !== "all") queryParams.set("active", active);
  if (nextBrand !== "all") queryParams.set("brand", nextBrand);

  const r = await fetch(`/api/admin/products?${queryParams.toString()}`);
  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j.ok) {
    setError(j?.error ?? "Failed to load products");
    setBusy(false);
    return;
  }

  

  setRows(j.products ?? []);
  setBrands(j.brands ?? []);

  const init: Record<string, string> = {};
  for (const p of (j.products ?? []) as ProductRow[]) {
    init[p.id] = p.reviewNote ?? "";
  }

  const affiliateInit: Record<string, string> = {};
for (const p of (j.products ?? []) as ProductRow[]) {
  affiliateInit[p.id] = p.affiliateUrl ?? "";
}
setAffiliateDraft(affiliateInit);

  setNoteDraft(init);

  setBusy(false);
}


async function saveAffiliateUrl(id: string) {
  setBusyId(id);
  setError(null);

  const affiliateUrl = (affiliateDraft[id] ?? "").trim();

  const r = await fetch(`/api/admin/products/${id}/affiliate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ affiliateUrl: affiliateUrl || null }),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j.ok) {
    setError(j?.error ?? `Failed to save affiliate URL (${r.status})`);
    setBusyId(null);
    return;
  }

  setRows((prev) =>
    prev.map((p) =>
      p.id === id
        ? {
            ...p,
            affiliateUrl: j.product.affiliateUrl,
          }
        : p
    )
  );

  setAffiliateDraft((prev) => ({
    ...prev,
    [id]: j.product.affiliateUrl ?? "",
  }));

  setBusyId(null);
}

  async function setProductPublished(id: string, published: boolean) {
    setBusy(true);
    setError(null);

    const r = await fetch(`/api/admin/products/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published }),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok || !j.ok) {
      setError(j?.error ?? `Failed to update publish status (${r.status})`);
      setBusy(false);
      return;
    }

    setRows((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, publishedAt: j.product.publishedAt } : p
      )
    );

    setBusy(false);
  }

  async function setProductActive(id: string, isActive: boolean) {
    setBusy(true);
    setError(null);

    const r = await fetch(`/api/admin/products/${id}/active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok || !j.ok) {
      setError(j?.error ?? `Failed to update active status (${r.status})`);
      setBusy(false);
      return;
    }

    setRows((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isActive: j.product.isActive } : p
      )
    );

    setBusy(false);
  }

  async function reviewProduct(id: string, action: ReviewAction) {
    setBusyId(id);
    setError(null);

    const reviewNote = (noteDraft[id] ?? "").trim();

    const r = await fetch(`/api/admin/products/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reviewNote }),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok || !j.ok) {
      setError(j?.error ?? `Failed to review (${r.status})`);
      setBusyId(null);
      return;
    }

    setRows((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: j.product.status,
              reviewNote: j.product.reviewNote ?? null,
              lastApprovedAt: j.product.lastApprovedAt ?? p.lastApprovedAt,
            }
          : p
      )
    );

    setBusyId(null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, tz]);

  const stats = useMemo(() => {
  const total = rows.length;
  const approved = rows.filter((p) => p.status === "APPROVED").length;
  const pending = rows.filter((p) => p.status === "PENDING_REVIEW").length;
  const needsChanges = rows.filter((p) => p.status === "NEEDS_CHANGES").length;
  const published = rows.filter((p) => Boolean(p.publishedAt)).length;
  const missingAffiliate = rows.filter((p) => !p.affiliateUrl?.trim()).length;

  return { total, approved, pending, needsChanges, published, missingAffiliate };
}, [rows]);

  const filteredBrandOptions = useMemo(() => {
  const term = brandSearch.trim().toLowerCase();

  const allOption = { slug: "all", name: "All brands" };

  const matched = brands.filter((b) =>
    b.name.toLowerCase().includes(term)
  );

  if (!term) return [allOption, ...brands];
  return [allOption, ...matched];
}, [brands, brandSearch]);

const selectedBrandLabel =
  brand === "all"
    ? "All brands"
    : brands.find((b) => b.slug === brand)?.name ?? "All brands";

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="space-y-6">
        <section className="rounded-[28px] border border-black/10 bg-white px-6 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Admin catalog
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                Product moderation
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-500">
                Review, publish, activate, and manage marketplace products across all brands
                from one clean control surface.
              </p>
            </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="text-xs text-neutral-500">Total</div>
                <div className="mt-1 text-xl font-semibold text-black">{stats.total}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="text-xs text-neutral-500">Approved</div>
                <div className="mt-1 text-xl font-semibold text-black">{stats.approved}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="text-xs text-neutral-500">Pending</div>
                <div className="mt-1 text-xl font-semibold text-black">{stats.pending}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="text-xs text-neutral-500">Needs changes</div>
                <div className="mt-1 text-xl font-semibold text-black">{stats.needsChanges}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="text-xs text-neutral-500">Published</div>
                <div className="mt-1 text-xl font-semibold text-black">{stats.published}</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-xs text-amber-700">Missing affiliate</div>
                <div className="mt-1 text-xl font-semibold text-amber-900">
                  {stats.missingAffiliate}
                  </div>
                  </div>
            </div>
          </div>
        </section>

        <SectionCard className="p-5 md:p-6">
  <div className="space-y-5">
    <div>
      <div className="text-lg font-semibold text-black">Filter products</div>
      <div className="mt-1 text-sm text-neutral-500">
        Search by product or brand, then narrow by activity and brand.
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_220px_auto] lg:items-end">
      <div>
        <FilterLabel>Search</FilterLabel>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title / slug / brand..."
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
        />
      </div>

      <div>
        <FilterLabel>Active status</FilterLabel>
        <select
          aria-label="Filter by active status"
          value={active}
          onChange={(e) => setActive(e.target.value as "all" | "true" | "false")}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
        >
          <option value="all">All</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      <div>
        <FilterLabel>Brand</FilterLabel>
        <select
          aria-label="Filter by brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
        >
          <option value="all">All brands</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FilterLabel>Affiliate status</FilterLabel>
        <select
          aria-label="Filter by affiliate status"
          value={affiliateFilter}
          onChange={(e) =>
            setAffiliateFilter(e.target.value as "all" | "missing" | "ready")
          }
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
        >
          <option value="all">All</option>
          <option value="missing">Missing affiliate</option>
          <option value="ready">Affiliate ready</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={load}
          className="inline-flex min-w-[110px] items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "Loading..." : "Apply"}
        </button>
      </div>
    </div>

    {error ? (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    ) : null}
  </div>
</SectionCard>

        <SectionCard className="overflow-hidden">
  <div className="border-b border-black/10 px-5 py-4">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="text-lg font-semibold text-black">All products</div>
        <div className="mt-1 text-sm text-neutral-500">
          Moderate listings, manage visibility, and send review feedback to brands.
        </div>
      </div>

      <div className="w-full max-w-md" ref={brandPickerRef}>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Quick brand switcher
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setBrandPickerOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 text-left text-sm text-black transition hover:border-black/20"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{selectedBrandLabel}</div>
              <div className="mt-0.5 text-xs text-neutral-500">
                Switch quickly between brands
              </div>
            </div>
            <span className="ml-3 text-neutral-400">⌄</span>
          </button>

          {brandPickerOpen && (
            <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
              <div className="border-b border-black/10 p-3">
                <input
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Search brand..."
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
                  autoFocus
                />
              </div>

              <div className="max-h-72 overflow-y-auto p-2">
                {filteredBrandOptions.length > 0 ? (
                  filteredBrandOptions.map((option) => {
                    const selected = brand === option.slug;
                    return (
                      <button
                        key={option.slug}
                        type="button"
                        onClick={() => void selectBrandAndLoad(option.slug)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          selected
                            ? "bg-black text-white"
                            : "text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        <span className="truncate">{option.name}</span>
                        {selected ? (
                          <span className="ml-3 text-xs text-white/80">Selected</span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-sm text-neutral-500">
                    No matching brands found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1700px] [&_table]:w-full [&_thead_th]:bg-neutral-50 [&_thead_th]:px-4 [&_thead_th]:py-3 [&_thead_th]:text-left [&_thead_th]:text-xs [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.12em] [&_thead_th]:text-neutral-500 [&_tbody_td]:px-4 [&_tbody_td]:py-4 [&_tbody_tr]:border-t [&_tbody_tr]:border-black/6">
              <AdminTable
                rows={rows}
                rowKey={(p) => p.id}
                emptyText={busy ? "Loading..." : "No products found."}
                columns={[
                  {
                    header: "Updated",
                    cell: (p) => (
                      <div className="min-w-[110px] leading-tight">
                        <div className="font-medium text-black">
                          {formatRelativeTime(p.updatedAt, locale)}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {formatDateTime(p.updatedAt, {
                            locale,
                            timeZone: tz,
                            dateStyle: "medium",
                            timeStyle: "short",
                            showTimeZoneLabel: true,
                          })}
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: "Image",
                    cell: (p) => (
                      <div className="min-w-[120px]">
                        <ProductThumbnail src={p.imageUrl} alt={p.title} />
                      </div>
                    ),
                  },
                  {
                    header: "Product",
                    cell: (p) => (
                      <div className="min-w-[260px] leading-tight">
                        <div className="font-medium text-black">{p.title}</div>
                        <div className="mt-1 text-xs text-neutral-500">{p.slug}</div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${statusPill(
                              p.status
                            )}`}
                          >
                            {p.status.replaceAll("_", " ")}
                          </span>

                          {p.submittedAt && (
                            <span className="text-xs text-neutral-500">
                              Submitted {formatRelativeTime(p.submittedAt, locale)}
                            </span>
                          )}

                          {p.lastApprovedAt && (
                            <span className="text-xs text-neutral-500">
                              Approved {formatRelativeTime(p.lastApprovedAt, locale)}
                            </span>
                          )}
                        </div>
                      </div>
                    ),
                  },
                  {
  header: "Brand",
  cell: (p) => (
    <div className="min-w-[180px] leading-tight">
      <div className="font-medium text-black">{p.brand?.name ?? "-"}</div>
      <div className="mt-1 text-xs text-neutral-500">{p.brand?.slug ?? "-"}</div>
    </div>
  ),
},
                  {
                    header: "Price",
                    cell: (p) => (
                      <div className="min-w-[90px]">
                        {p.price ? (
                          <span className="font-medium text-black">
                            {formatMoney(p.price, p.currency, locale)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </div>
                    ),
                  },
                  {
                    header: "Publish",
                    cell: (p) => {
                      const hasAffiliate = Boolean(p.affiliateUrl?.trim());
                      const canPublish = p.status === "APPROVED" && hasAffiliate;
                      const isPublished = Boolean(p.publishedAt);

                      return (
                        <div className="flex min-w-[170px] flex-col gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-medium ${
                              isPublished
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-black/10 bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {isPublished ? "Published" : "Draft"}
                          </span>

                          <button
                            className="inline-flex w-fit items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={busy || (!canPublish && !isPublished)}
                            onClick={() => setProductPublished(p.id, !isPublished)}
                            title={
                              !canPublish && !isPublished
                              ? p.status !== "APPROVED"
                              ? "Approve the product before publishing"
                              : "Add affiliate link before publishing"
                              : ""
                            }
                          >
                            {isPublished ? "Unpublish" : "Publish"}
                          </button>
                        </div>
                      );
                    },
                  },
                  {
                    header: "Active",
                    cell: (p) => (
                      <div className="flex min-w-[170px] flex-col gap-2">
                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-medium ${
                            p.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </span>

                        <button
                          className="inline-flex w-fit items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={busy}
                          onClick={() => setProductActive(p.id, !p.isActive)}
                        >
                          {p.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    ),
                  },
                  {
                    header: "Review",
                    cell: (p) => {
                      const disabled = busyId === p.id || busy;
                      const note = noteDraft[p.id] ?? "";

                      return (
                        <div className="min-w-[420px] space-y-3">
                           <div className="space-y-2">
  <div className="flex items-center justify-between">
    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
      Affiliate link
    </div>
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        p.affiliateUrl
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {p.affiliateUrl ? "Affiliate ready" : "Affiliate missing"}
    </span>
  </div>

  <input
    value={affiliateDraft[p.id] ?? ""}
    onChange={(e) =>
      setAffiliateDraft((prev) => ({ ...prev, [p.id]: e.target.value }))
    }
    placeholder="Paste Shopify Collabs product link"
    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
  />

  <div className="flex flex-wrap gap-2">
    <button
      disabled={disabled}
      onClick={() => saveAffiliateUrl(p.id)}
      className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
    >
      Save affiliate link
    </button>

    {p.affiliateUrl ? (
      <a
        href={`/out/${p.id}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03]"
      >
        Test outbound
      </a>
    ) : null}
  </div>
</div>
                          <textarea
                            value={note}
                            onChange={(e) =>
                              setNoteDraft((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            placeholder="Review note (required for Needs changes / Reject)"
                            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
                            rows={4}
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={disabled}
                              onClick={() => reviewProduct(p.id, "approve")}
                              className="inline-flex items-center justify-center rounded-xl bg-black px-3.5 py-2 text-xs font-medium text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Approve product (brand can be published after)"
                            >
                              {busyId === p.id ? "..." : "Approve"}
                            </button>

                            <button
                              disabled={disabled}
                              onClick={() => reviewProduct(p.id, "needs_changes")}
                              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                              title="Send back to brand with note"
                            >
                              Needs changes
                            </button>

                            <button
                              disabled={disabled}
                              onClick={() => reviewProduct(p.id, "reject")}
                              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Reject product with note"
                            >
                              Reject
                            </button>
                          </div>

                          {p.reviewNote &&
                            (p.status === "NEEDS_CHANGES" || p.status === "REJECTED") && (
                              <div className="rounded-2xl border border-black/10 bg-neutral-50 p-3 text-xs text-neutral-700">
                                <div className="mb-1 font-semibold text-black">Last note sent</div>
                                <div className="line-clamp-4 leading-5">{p.reviewNote}</div>
                              </div>
                            )}
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}