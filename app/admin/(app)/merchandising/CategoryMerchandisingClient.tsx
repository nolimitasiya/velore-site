"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ScopeType =
  | "PRODUCT_TYPE"
  | "OCCASION"
  | "CONTINENT";

type ProductTypeOption = {
  value: string;
  label: string;
};

type OccasionOption = {
  id: string;
  name: string;
  slug: string;
};

type ContinentOption = {
  value: string;
  label: string;
};

type MerchProduct = {
  id: string;
  title: string;
  slug: string;

  price: string | null;
  currency: string;

  badges: string[];

  imageUrl: string | null;

  brand: {
    id: string;
    name: string;
    slug: string;
  };
};

type ApiResponse = {
  ok: boolean;

  scopeType: ScopeType;
  scopeKey: string;

  manualLimit: number;

  hasDraft: boolean;
  hasLive: boolean;

  products: MerchProduct[];

  draftPositions: Array<{
    productId: string;
    position: number;
  }>;

  livePositions: Array<{
    productId: string;
    position: number;
  }>;
};

function money(
  value: string | null,
  currency: string
) {
  if (value == null) return "—";

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${currency} ${value}`;
  }

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(number);
  } catch {
    return `${currency} ${value}`;
  }
}

function idsOf(products: MerchProduct[]) {
  return products.map((product) => product.id);
}

function sameOrder(a: string[], b: string[]) {
  if (a.length !== b.length) return false;

  return a.every((value, index) => value === b[index]);
}

export default function CategoryMerchandisingClient({
  productTypes,
  occasions,
  continents,
}: {
  productTypes: ProductTypeOption[];
  occasions: OccasionOption[];
  continents: ContinentOption[];
}) {
  const initialProductType =
    productTypes[0]?.value ?? "ABAYA";

  const [scopeType, setScopeType] =
    useState<ScopeType>("PRODUCT_TYPE");

  const [scopeKey, setScopeKey] =
    useState(initialProductType);

  const [products, setProducts] = useState<
    MerchProduct[]
  >([]);

  const [manualLimit, setManualLimit] =
    useState(48);

  const [hasDraft, setHasDraft] =
    useState(false);

  const [hasLive, setHasLive] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [discarding, setDiscarding] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [previewMode, setPreviewMode] =
    useState<"DESKTOP" | "MOBILE">("DESKTOP");

  const [showPreview, setShowPreview] =
    useState(false);

  const [draggedId, setDraggedId] =
    useState<string | null>(null);

  const savedDraftIdsRef = useRef<string[]>([]);

  const currentManualIds = useMemo(
    () =>
      idsOf(products.slice(0, manualLimit)),
    [products, manualLimit]
  );

  const isDirty = useMemo(
    () =>
      !sameOrder(
        currentManualIds,
        savedDraftIdsRef.current
      ),
    [currentManualIds]
  );

  const availableOptions =
  scopeType === "PRODUCT_TYPE"
    ? productTypes.map((item) => ({
        value: item.value,
        label: item.label,
      }))
    : scopeType === "OCCASION"
    ? occasions.map((item) => ({
        value: item.slug,
        label: item.name,
      }))
    : continents.map((item) => ({
        value: item.value,
        label: item.label,
      }));

  async function load(
    nextScopeType = scopeType,
    nextScopeKey = scopeKey
  ) {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const params = new URLSearchParams({
        scopeType: nextScopeType,
        scopeKey: nextScopeKey,
      });

      const response = await fetch(
        `/api/admin/category-merchandising?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data =
        (await response
          .json()
          .catch(() => ({}))) as Partial<ApiResponse> & {
          error?: string;
        };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ??
            "Failed to load merchandising."
        );
      }

      const nextProducts =
        data.products ?? [];

      const nextManualLimit =
        data.manualLimit ?? 48;

      setProducts(nextProducts);
      setManualLimit(nextManualLimit);

      setHasDraft(Boolean(data.hasDraft));
      setHasLive(Boolean(data.hasLive));

      /*
       * The API already returns:
       * DRAFT first if it exists,
       * otherwise LIVE,
       * otherwise automatic.
       *
       * Therefore the first 48 IDs represent
       * the current saved editor state.
       */
      savedDraftIdsRef.current = idsOf(
        nextProducts.slice(
          0,
          nextManualLimit
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load merchandising."
      );

      setProducts([]);
      savedDraftIdsRef.current = [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseScopeType(
    nextType: ScopeType
  ) {
    if (nextType === scopeType) return;

    if (isDirty) {
      const ok = window.confirm(
        "You have unsaved merchandising changes. Changing collection will discard them. Continue?"
      );

      if (!ok) return;
    }

    const nextKey =
    nextType === "PRODUCT_TYPE"
    ? productTypes[0]?.value ?? ""
    : nextType === "OCCASION"
    ? occasions[0]?.slug ?? ""
    : continents[0]?.value ?? "";

    if (!nextKey) return;

    setScopeType(nextType);
    setScopeKey(nextKey);

    void load(nextType, nextKey);
  }

  function chooseScopeKey(nextKey: string) {
    if (nextKey === scopeKey) return;

    if (isDirty) {
      const ok = window.confirm(
        "You have unsaved merchandising changes. Changing collection will discard them. Continue?"
      );

      if (!ok) return;
    }

    setScopeKey(nextKey);

    void load(scopeType, nextKey);
  }

  function moveProduct(
    draggedProductId: string,
    targetProductId: string
  ) {
    if (
      draggedProductId === targetProductId
    ) {
      return;
    }

    setProducts((current) => {
      const fromIndex =
        current.findIndex(
          (product) =>
            product.id === draggedProductId
        );

      const toIndex =
        current.findIndex(
          (product) =>
            product.id === targetProductId
        );

      if (
        fromIndex === -1 ||
        toIndex === -1
      ) {
        return current;
      }

      const next = [...current];

      const [moved] = next.splice(
        fromIndex,
        1
      );

      next.splice(toIndex, 0, moved);

      return next;
    });
  }

  async function saveDraft() {
    const productIds = products
      .slice(0, manualLimit)
      .map((product) => product.id);

    if (productIds.length === 0) {
      setError(
        "There are no products to save."
      );
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/admin/category-merchandising",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "SAVE_DRAFT",
            scopeType,
            scopeKey,
            productIds,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.error ??
            "Failed to save draft."
        );
      }

      savedDraftIdsRef.current = [
        ...productIds,
      ];

      setHasDraft(true);

      setNotice(
        `Draft saved — ${productIds.length} positions.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save draft."
      );
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    /*
     * If you've moved products but haven't
     * saved yet, save automatically first.
     */
    if (isDirty) {
      await saveDraft();
    }

    setPublishing(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/admin/category-merchandising",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "PUBLISH",
            scopeType,
            scopeKey,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.error ??
            "Failed to publish."
        );
      }

      setHasLive(true);

      setNotice(
        `Published ${data.publishedCount ?? manualLimit} positions live.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to publish."
      );
    } finally {
      setPublishing(false);
    }
  }

  async function discardDraft() {
    if (!hasDraft) return;

    const confirmed = window.confirm(
      "Discard your saved draft and return to the current live arrangement?"
    );

    if (!confirmed) return;

    setDiscarding(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/admin/category-merchandising",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action: "DISCARD_DRAFT",
            scopeType,
            scopeKey,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.error ??
            "Failed to discard draft."
        );
      }

      setHasDraft(false);

      await load();

      setNotice(
        "Draft discarded."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to discard draft."
      );
    } finally {
      setDiscarding(false);
    }
  }

  const currentLabel =
    availableOptions.find(
      (option) =>
        option.value === scopeKey
    )?.label ?? scopeKey;

  const gridClass =
    previewMode === "MOBILE"
      ? "mx-auto grid max-w-[520px] grid-cols-2 gap-4"
      : "grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="space-y-6">
      {/* Header / controls */}
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
                Visual merchandising
              </div>

              <h1 className="mt-2 text-xl font-semibold text-black">
                Category editor
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                Drag products into the order
                you want shoppers to see.
                Positions 1–48 are saved as
                your curated storefront order.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasLive ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                  Live arrangement
                </span>
              ) : null}

              {hasDraft ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                  Draft saved
                </span>
              ) : null}

              {isDirty ? (
                <span className="rounded-full border border-[#e8ddd4] bg-white px-3 py-1.5 text-xs font-medium text-[#7B2D3E]">
                  Unsaved changes
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-[220px_1fr_auto]">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Merchandising type
            </span>

            <select
  value={scopeType}
  onChange={(e) =>
    chooseScopeType(
      e.target.value as ScopeType
    )
  }
  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40"
>
  <option value="PRODUCT_TYPE">
    Product type
  </option>

  <option value="OCCASION">
    Occasion
  </option>

  <option value="CONTINENT">
    Continent
  </option>
</select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Collection
            </span>

            <select
              value={scopeKey}
              onChange={(e) =>
                chooseScopeKey(
                  e.target.value
                )
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40"
            >
              {availableOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </label>


          <div className="flex items-end">
            <div className="flex rounded-2xl border border-black/10 bg-[#fcfbf8] p-1">
              <button
                type="button"
                onClick={() =>
                  setPreviewMode("DESKTOP")
                }
                className={[
                  "rounded-xl px-4 py-2 text-xs transition",
                  previewMode === "DESKTOP"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-500",
                ].join(" ")}
              >
                Desktop
              </button>

              <button
                type="button"
                onClick={() =>
                  setPreviewMode("MOBILE")
                }
                className={[
                  "rounded-xl px-4 py-2 text-xs transition",
                  previewMode === "MOBILE"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-500",
                ].join(" ")}
              >
                Mobile
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="sticky top-4 z-20 rounded-[24px] border border-black/10 bg-white/95 px-5 py-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-medium text-black">
              {currentLabel}
            </div>

            <div className="mt-0.5 text-xs text-neutral-500">
              {products.length} eligible
              products · first{" "}
              {Math.min(
                manualLimit,
                products.length
              )}{" "}
              are curated
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasDraft ? (
              <button
                type="button"
                onClick={() =>
                  void discardDraft()
                }
                disabled={
                  discarding ||
                  saving ||
                  publishing
                }
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-600 hover:bg-black/[0.03] disabled:opacity-50"
              >
                {discarding
                  ? "Discarding..."
                  : "Discard draft"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() =>
                setShowPreview(true)
              }
              disabled={
                loading ||
                products.length === 0
              }
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black hover:bg-black/[0.03] disabled:opacity-50"
            >
              Preview
            </button>

            <button
              type="button"
              onClick={() =>
                void saveDraft()
              }
              disabled={
                saving ||
                publishing ||
                products.length === 0 ||
                !isDirty
              }
              className="rounded-full border border-[#7B2D3E] px-4 py-2 text-sm text-[#7B2D3E] transition hover:bg-[#fdf7f4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? "Saving..."
                : isDirty
                ? "Save draft"
                : "Draft saved"}
            </button>

            <button
              type="button"
              onClick={() =>
                void publish()
              }
              disabled={
                saving ||
                publishing ||
                products.length === 0
              }
              className="rounded-full bg-[#7B2D3E] px-5 py-2 text-sm text-white transition hover:bg-[#6a2435] disabled:opacity-50"
            >
              {publishing
                ? "Publishing..."
                : "Publish"}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {/* Grid */}
      {loading ? (
        <div className="rounded-[28px] border border-black/10 bg-white p-10 text-center text-sm text-neutral-500">
          Loading products...
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-[28px] border border-black/10 bg-white p-10 text-center text-sm text-neutral-500">
          No eligible products found for
          this collection.
        </div>
      ) : (
        <section className="rounded-[28px] border border-black/10 bg-white p-5 md:p-6">
          <div className={gridClass}>
            {products.map(
              (product, index) => {
                const position = index + 1;

                const isDragging =
                  draggedId === product.id;

                return (
                  <article
                    key={product.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggedId(
                        product.id
                      );

                      event.dataTransfer.effectAllowed =
                        "move";

                      event.dataTransfer.setData(
                        "text/plain",
                        product.id
                      );
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();

                      event.dataTransfer.dropEffect =
                        "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();

                      const draggedProductId =
                        event.dataTransfer.getData(
                          "text/plain"
                        );

                      if (
                        !draggedProductId
                      ) {
                        return;
                      }

                      moveProduct(
                        draggedProductId,
                        product.id
                      );

                      setDraggedId(null);
                    }}
                    className={[
                      "group cursor-grab overflow-hidden rounded-3xl border bg-white transition",
                      isDragging
                        ? "scale-[0.98] border-[#7B2D3E] opacity-50"
                        : "border-black/5 hover:border-black/15",
                    ].join(" ")}
                  >
                    <div className="relative aspect-[3/4] bg-black/5">
                      {product.imageUrl ? (
                        <Image
                          src={
                            product.imageUrl
                          }
                          alt={product.title}
                          fill
                          draggable={false}
                          className="pointer-events-none object-cover"
                          sizes={
                            previewMode ===
                            "MOBILE"
                              ? "50vw"
                              : "(max-width: 1024px) 33vw, 25vw"
                          }
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-xs text-black/40">
                          No image
                        </div>
                      )}

                      <div className="absolute left-3 top-3 rounded-full bg-black/85 px-2.5 py-1 text-xs font-medium text-white">
                        #{position}
                      </div>

                      <div className="absolute right-3 top-3 rounded-full border border-white/50 bg-white/90 px-2.5 py-1 text-xs text-black shadow-sm">
                        ↕ Drag
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="line-clamp-2 text-sm font-medium leading-5">
                        {product.title}
                      </div>

                      <div className="mt-1 text-xs uppercase tracking-wide text-black/60">
                        {product.brand.name}
                      </div>

                      <div className="mt-2 text-sm text-black/70">
                        {money(
                          product.price,
                          product.currency
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </section>
      )}

      {/* Preview modal */}
      {showPreview ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 md:p-8">
          <div className="mx-auto max-w-[1500px] rounded-[28px] bg-white">
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-white px-5 py-4 md:px-7">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
                  Draft preview
                </div>

                <div className="mt-1 text-lg font-semibold">
                  {currentLabel}
                </div>

                <div className="mt-1 text-xs text-neutral-500">
                  This preview is private.
                  Nothing changes for shoppers
                  until you publish.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-full border border-black/10 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewMode(
                        "DESKTOP"
                      )
                    }
                    className={[
                      "rounded-full px-3 py-1.5 text-xs",
                      previewMode ===
                      "DESKTOP"
                        ? "bg-black text-white"
                        : "text-neutral-500",
                    ].join(" ")}
                  >
                    Desktop
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewMode(
                        "MOBILE"
                      )
                    }
                    className={[
                      "rounded-full px-3 py-1.5 text-xs",
                      previewMode ===
                      "MOBILE"
                        ? "bg-black text-white"
                        : "text-neutral-500",
                    ].join(" ")}
                  >
                    Mobile
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowPreview(false)
                  }
                  className="rounded-full border border-black/10 px-4 py-2 text-sm hover:bg-black/[0.03]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-5 md:p-8">
              <div className={gridClass}>
                {products
                  .slice(0, manualLimit)
                  .map(
                    (product) => (
                      <article
                        key={
                          product.id
                        }
                        className="overflow-hidden rounded-3xl border border-black/5 bg-white"
                      >
                        <div className="relative aspect-[3/4] bg-black/5">
                          {product.imageUrl ? (
                            <Image
                              src={
                                product.imageUrl
                              }
                              alt={
                                product.title
                              }
                              fill
                              className="object-cover"
                              sizes={
                                previewMode ===
                                "MOBILE"
                                  ? "50vw"
                                  : "(max-width: 1024px) 33vw, 25vw"
                              }
                            />
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-xs text-black/40">
                              No image
                            </div>
                          )}

                          {product.badges.includes(
                            "sale"
                          ) ? (
                            <div className="absolute left-3 top-3 rounded-full bg-black px-3 py-1 text-xs text-white">
                              SALE
                            </div>
                          ) : null}
                        </div>

                        <div className="p-4">
                          <div className="line-clamp-2 text-sm font-medium leading-5">
                            {
                              product.title
                            }
                          </div>

                          <div className="mt-1 text-xs uppercase tracking-wide text-black/60">
                            {
                              product
                                .brand
                                .name
                            }
                          </div>

                          <div className="mt-2 text-sm text-black/70">
                            {money(
                              product.price,
                              product.currency
                            )}
                          </div>

                          <div className="mt-3 inline-flex items-center rounded-full bg-black px-4 py-2 text-xs font-medium text-white">
                            Shop
                          </div>
                        </div>
                      </article>
                    )
                  )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}