"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type MerchPageKey = "CLOTHING" | "SALE" | "OCCASION";
type MerchBucket = "TOP_PICKS" | "DISCOVER_MORE" | "EXPLORE_NEW";

type MerchItem = {
  id: string;
  pageKey: MerchPageKey;
  bucket: MerchBucket;
  productId: string;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    price: string | null;
    currency: string;
    isActive: boolean;
    status: string;
    publishedAt: string | null;
    badges: string[];
    brand: {
      id: string;
      name: string;
      slug: string;
    };
    images: Array<{ url: string }>;
  };
};

type SearchProduct = {
  id: string;
  title: string;
  slug: string;
  price: string | null;
  currency: string;
  productType: string | null;
  badges: string[];
  publishedAt: string | null;
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  images: Array<{ url: string }>;
  productOccasions: Array<{
    occasion: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
};

type InitialData = {
  pageKey: MerchPageKey;
  buckets: Record<MerchBucket, MerchItem[]>;
};

type EditDraft = {
  note: string;
  startsAt: string;
  endsAt: string;
};

type SummaryRow = {
  pageKey: MerchPageKey;
  totalCount: number;
  liveCount: number;
  bucketCounts: Record<MerchBucket, number>;
};

const PAGE_OPTIONS: Array<{ value: MerchPageKey; label: string }> = [
  { value: "CLOTHING", label: "Clothing" },
  { value: "SALE", label: "Sale" },
  { value: "OCCASION", label: "Occasion" },
];

const BUCKET_META: Array<{
  key: MerchBucket;
  title: string;
  description: string;
}> = [
  {
    key: "TOP_PICKS",
    title: "1–10 Top Picks",
    description: "Your strongest products. Reviewed bi-weekly.",
  },
  {
    key: "DISCOVER_MORE",
    title: "Discover More",
    description: "Your fairness and variety layer. Reviewed weekly.",
  },
  {
    key: "EXPLORE_NEW",
    title: "Explore New Brands",
    description: "New or underexposed brands. 7–14 day boost window.",
  },
];

function formatMoney(value: string | null, currency: string) {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return `${value} ${currency}`;

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(num);
  } catch {
    return `${value} ${currency}`;
  }
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function getItemStatus(item: MerchItem) {
  const now = new Date();

  if (!item.isActive) {
    return {
      label: "Inactive",
      className: "bg-black/5 text-black/60",
    };
  }

  if (item.startsAt && new Date(item.startsAt) > now) {
    return {
      label: "Scheduled",
      className: "bg-blue-50 text-blue-700",
    };
  }

  if (item.endsAt && new Date(item.endsAt) < now) {
    return {
      label: "Expired",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Live",
    className: "bg-emerald-50 text-emerald-700",
  };
}

export default function MerchandisingClient({
  initialData,
  summary,
}: {
  initialData: InitialData;
  summary: SummaryRow[];
}) {
  const [pageKey, setPageKey] = useState<MerchPageKey>(initialData.pageKey);
  const [buckets, setBuckets] = useState<Record<MerchBucket, MerchItem[]>>(
    initialData.buckets
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const [editDrafts, setEditDrafts] = useState<Record<string, EditDraft>>({});

  function getDraft(item: MerchItem): EditDraft {
    return (
      editDrafts[item.id] ?? {
        note: item.note ?? "",
        startsAt: toDateInputValue(item.startsAt),
        endsAt: toDateInputValue(item.endsAt),
      }
    );
  }

  function setDraft(itemId: string, next: Partial<EditDraft>) {
    setEditDrafts((prev) => {
      const current =
        prev[itemId] ?? {
          note: "",
          startsAt: "",
          endsAt: "",
        };

      return {
        ...prev,
        [itemId]: {
          ...current,
          ...next,
        },
      };
    });
  }

  async function loadPage(nextPageKey: MerchPageKey) {
    setLoading(true);
    setError(null);
    setPageKey(nextPageKey);
    setSearchResults([]);
    setSearchError(null);

    try {
      const res = await fetch(`/api/admin/merchandising?pageKey=${nextPageKey}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load merchandising data.");
      }

      setBuckets(data.buckets);
      setEditDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshCurrentPage() {
    const res = await fetch(`/api/admin/merchandising?pageKey=${pageKey}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Failed to refresh merchandising data.");
    }

    setBuckets(data.buckets);
  }

  async function runSearch() {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `/api/admin/merchandising/products?q=${encodeURIComponent(
          q
        )}&pageKey=${pageKey}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to search products.");
      }

      setSearchResults(data.products ?? []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addToBucket(productId: string, bucket: MerchBucket) {
    const key = `${productId}:${bucket}`;
    setAddingKey(key);
    setError(null);

    try {
      const res = await fetch("/api/admin/merchandising", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageKey,
          bucket,
          productId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to add product.");
      }

      await refreshCurrentPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product.");
    } finally {
      setAddingKey(null);
    }
  }

  async function removeItem(itemId: string) {
    const key = `remove:${itemId}`;
    setActionKey(key);
    setError(null);

    try {
      const res = await fetch(`/api/admin/merchandising/${itemId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to remove item.");
      }

      await refreshCurrentPage();
      setEditDrafts((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item.");
    } finally {
      setActionKey(null);
    }
  }

  async function toggleActive(item: MerchItem) {
    const key = `toggle:${item.id}`;
    setActionKey(key);
    setError(null);

    try {
      const res = await fetch(`/api/admin/merchandising/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !item.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update item.");
      }

      await refreshCurrentPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item.");
    } finally {
      setActionKey(null);
    }
  }

  async function moveItem(item: MerchItem, direction: "up" | "down") {
    const items = buckets[item.bucket] ?? [];
    const currentIndex = items.findIndex((x) => x.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const targetItem = items[targetIndex];
    const key = `move:${item.id}:${direction}`;
    setActionKey(key);
    setError(null);

    try {
      const res = await fetch(`/api/admin/merchandising/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          position: targetItem.position,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to move item.");
      }

      await refreshCurrentPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move item.");
    } finally {
      setActionKey(null);
    }
  }

  async function saveDetails(item: MerchItem) {
    const draft = getDraft(item);
    const key = `save:${item.id}`;
    setActionKey(key);
    setError(null);

    try {
      const res = await fetch(`/api/admin/merchandising/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: draft.note.trim(),
          startsAt: draft.startsAt || null,
          endsAt: draft.endsAt || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save details.");
      }

      await refreshCurrentPage();
      setEditDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save details.");
    } finally {
      setActionKey(null);
    }
  }

  const currentSummary = summary.find((row) => row.pageKey === pageKey);

  const existingProductsById = useMemo(() => {
    const map = new Map<string, MerchItem>();

    for (const item of Object.values(buckets).flat()) {
      map.set(item.productId, item);
    }

    return map;
  }, [buckets]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Collection Merchandising
            </h1>
            <p className="mt-1 text-sm text-black/60">
              Organise internal merchandising buckets for page 1 while keeping
              the shopper-facing grid seamless.
            </p>
          </div>

          <div className="w-full max-w-xs">
            <label
              htmlFor="pageKey"
              className="mb-2 block text-sm font-medium text-black"
            >
              Page
            </label>
            <select
              id="pageKey"
              value={pageKey}
              onChange={(e) => loadPage(e.target.value as MerchPageKey)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/30"
            >
              {PAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {summary.map((row) => {
          const label =
            PAGE_OPTIONS.find((option) => option.value === row.pageKey)?.label ??
            row.pageKey;

          const isCurrent = row.pageKey === pageKey;

          return (
            <div
              key={row.pageKey}
              className={`rounded-3xl border p-5 shadow-sm ${
                isCurrent
                  ? "border-black bg-black text-white"
                  : "border-black/10 bg-white text-black"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{label}</h2>
                  <p
                    className={`mt-1 text-sm ${
                      isCurrent ? "text-white/70" : "text-black/60"
                    }`}
                  >
                    {row.liveCount} live / {row.totalCount} total
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadPage(row.pageKey)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    isCurrent
                      ? "bg-white text-black"
                      : "bg-black/5 text-black"
                  }`}
                >
                  {isCurrent ? "Viewing" : "Open"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div
                  className={`rounded-2xl px-3 py-2 ${
                    isCurrent ? "bg-white/10" : "bg-black/5"
                  }`}
                >
                  <div className={isCurrent ? "text-white/70" : "text-black/50"}>
                    Top Picks
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {row.bucketCounts.TOP_PICKS}/10
                  </div>
                </div>

                <div
                  className={`rounded-2xl px-3 py-2 ${
                    isCurrent ? "bg-white/10" : "bg-black/5"
                  }`}
                >
                  <div className={isCurrent ? "text-white/70" : "text-black/50"}>
                    Discover
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {row.bucketCounts.DISCOVER_MORE}
                  </div>
                </div>

                <div
                  className={`rounded-2xl px-3 py-2 ${
                    isCurrent ? "bg-white/10" : "bg-black/5"
                  }`}
                >
                  <div className={isCurrent ? "text-white/70" : "text-black/50"}>
                    Explore
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {row.bucketCounts.EXPLORE_NEW}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {currentSummary ? (
        <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white">
              {PAGE_OPTIONS.find((option) => option.value === pageKey)?.label}
            </div>
            <div className="text-sm text-black/60">
              {currentSummary.liveCount} live items across page 1 buckets
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Add products</h2>
          <p className="mt-1 text-sm text-black/60">
            Search approved, published products eligible for this page and add
            them into a bucket.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder={`Search products for ${
              PAGE_OPTIONS.find((p) => p.value === pageKey)?.label
            }`}
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/30"
          />

          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={searching}
            className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {searchError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {searchError}
          </div>
        ) : null}

        {searchResults.length > 0 ? (
          <div className="mt-5 space-y-3">
            {searchResults.map((product) => {
              const imageUrl = product.images[0]?.url ?? null;
              const existingItem = existingProductsById.get(product.id);
              const alreadyAdded = Boolean(existingItem);

              return (
                <div
                  key={product.id}
                  className="rounded-2xl border border-black/10 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative h-24 w-20 overflow-hidden rounded-xl bg-black/5">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={product.title}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-black">
                          {product.title}
                        </p>
                        <p className="truncate text-xs text-black/60">
                          {product.brand.name}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-black/60">
                          <span>{formatMoney(product.price, product.currency)}</span>
                          <span>•</span>
                          <span>{product.productType ?? "No type"}</span>
                          {product.badges.length > 0 ? (
                            <>
                              <span>•</span>
                              <span>{product.badges.join(", ")}</span>
                            </>
                          ) : null}
                        </div>

                        {alreadyAdded ? (
                          <p className="mt-2 text-xs font-medium text-amber-700">
                            Already added to{" "}
                            {BUCKET_META.find(
                              (bucket) => bucket.key === existingItem?.bucket
                            )?.title ?? existingItem?.bucket}
                            .
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {BUCKET_META.map((bucket) => {
                        const key = `${product.id}:${bucket.key}`;
                        const isAdding = addingKey === key;

                        return (
                          <button
                            key={bucket.key}
                            type="button"
                            disabled={alreadyAdded || isAdding}
                            onClick={() => void addToBucket(product.id, bucket.key)}
                            className="rounded-2xl border border-black/10 px-4 py-2 text-xs font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isAdding ? "Adding..." : `Add to ${bucket.title}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchQuery.trim() && !searching && !searchError ? (
          <div className="mt-4 rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-black/50">
            No matching products found.
          </div>
        ) : null}
      </section>

      {loading ? (
        <div className="rounded-3xl border border-black/10 bg-white p-6 text-sm text-black/60 shadow-sm">
          Loading merchandising…
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        {BUCKET_META.map((bucketMeta) => {
          const items = buckets[bucketMeta.key] ?? [];

          return (
            <section
              key={bucketMeta.key}
              className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <div className="mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      {bucketMeta.title}
                    </h2>
                    <p className="mt-1 text-sm text-black/60">
                      {bucketMeta.description}
                    </p>
                  </div>

                  <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/70">
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-black/50">
                    No products in this bucket yet.
                  </div>
                ) : (
                  items.map((item, index) => {
                    const imageUrl = item.product.images[0]?.url ?? null;
                    const draft = getDraft(item);
                    const statusMeta = getItemStatus(item);

                    const isMovingUp = actionKey === `move:${item.id}:up`;
                    const isMovingDown = actionKey === `move:${item.id}:down`;
                    const isRemoving = actionKey === `remove:${item.id}`;
                    const isToggling = actionKey === `toggle:${item.id}`;
                    const isSaving = actionKey === `save:${item.id}`;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-black/10 p-3"
                      >
                        <div className="flex gap-3">
                          <div className="relative h-20 w-16 overflow-hidden rounded-xl bg-black/5">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={item.product.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : null}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-black">
                                  {item.product.title}
                                </p>
                                <p className="truncate text-xs text-black/60">
                                  {item.product.brand.name}
                                </p>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white">
                                  #{item.position}
                                </div>
                                <div
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusMeta.className}`}
                                >
                                  {statusMeta.label}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-black/60">
                              <span>
                                {formatMoney(item.product.price, item.product.currency)}
                              </span>
                              <span>•</span>
                              <span>{item.product.status}</span>
                              <span>•</span>
                              <span>{item.isActive ? "Active" : "Inactive"}</span>
                            </div>

                            <div className="mt-3 space-y-3">
                              <div>
                                <label
                                  htmlFor={`note-${item.id}`}
                                  className="mb-1 block text-xs font-medium text-black/70"
                                >
                                  Note
                                </label>
                                <textarea
                                  id={`note-${item.id}`}
                                  value={draft.note}
                                  onChange={(e) =>
                                    setDraft(item.id, { note: e.target.value })
                                  }
                                  rows={2}
                                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs outline-none transition focus:border-black/30"
                                  placeholder="Optional internal note"
                                />
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label
                                    htmlFor={`startsAt-${item.id}`}
                                    className="mb-1 block text-xs font-medium text-black/70"
                                  >
                                    Start date
                                  </label>
                                  <input
                                    id={`startsAt-${item.id}`}
                                    type="date"
                                    value={draft.startsAt}
                                    onChange={(e) =>
                                      setDraft(item.id, {
                                        startsAt: e.target.value,
                                      })
                                    }
                                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs outline-none transition focus:border-black/30"
                                  />
                                </div>

                                <div>
                                  <label
                                    htmlFor={`endsAt-${item.id}`}
                                    className="mb-1 block text-xs font-medium text-black/70"
                                  >
                                    End date
                                  </label>
                                  <input
                                    id={`endsAt-${item.id}`}
                                    type="date"
                                    value={draft.endsAt}
                                    onChange={(e) =>
                                      setDraft(item.id, {
                                        endsAt: e.target.value,
                                      })
                                    }
                                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs outline-none transition focus:border-black/30"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={index === 0 || !!actionKey}
                                onClick={() => void moveItem(item, "up")}
                                className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isMovingUp ? "Moving..." : "Move up"}
                              </button>

                              <button
                                type="button"
                                disabled={index === items.length - 1 || !!actionKey}
                                onClick={() => void moveItem(item, "down")}
                                className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isMovingDown ? "Moving..." : "Move down"}
                              </button>

                              <button
                                type="button"
                                disabled={!!actionKey}
                                onClick={() => void toggleActive(item)}
                                className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isToggling
                                  ? "Saving..."
                                  : item.isActive
                                  ? "Set inactive"
                                  : "Set active"}
                              </button>

                              <button
                                type="button"
                                disabled={!!actionKey}
                                onClick={() => void saveDetails(item)}
                                className="rounded-xl bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isSaving ? "Saving..." : "Save details"}
                              </button>

                              <button
                                type="button"
                                disabled={!!actionKey}
                                onClick={() => void removeItem(item.id)}
                                className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isRemoving ? "Removing..." : "Remove"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}