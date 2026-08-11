"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
} from "react";


type Product = {
  id: string;
  title: string;
  slug: string;

  price: string | null;
  currency: string;

  productType: string | null;
  badges: string[];

  brand: {
    id: string;
    name: string;
    slug: string;
  };

  images: Array<{
    url: string;
  }>;
};

type ActiveLook = Product & {
  linkedProducts: Product[];
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

export default function CompleteTheLookClient() {
  const [mainQuery, setMainQuery] =
    useState("");

  const [mainResults, setMainResults] =
    useState<Product[]>([]);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [linkedProducts, setLinkedProducts] =
    useState<Product[]>([]);

  const [lookQuery, setLookQuery] =
    useState("");

  const [lookResults, setLookResults] =
    useState<Product[]>([]);

  const [searchingMain, setSearchingMain] =
    useState(false);

  const [searchingLook, setSearchingLook] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const [activeLooks, setActiveLooks] =
  useState<ActiveLook[]>([]);

const [loadingLooks, setLoadingLooks] =
  useState(true);

const [unlinkingId, setUnlinkingId] =
  useState<string | null>(null);

async function loadActiveLooks() {
  setLoadingLooks(true);

  try {
    const response = await fetch(
      "/api/admin/complete-the-look",
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data?.error ??
          "Failed to load active looks."
      );
    }

    setActiveLooks(data.looks ?? []);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to load active looks."
    );
  } finally {
    setLoadingLooks(false);
  }
}

useEffect(() => {
  void loadActiveLooks();
}, []);

async function searchProducts(
    query: string,
    type: "MAIN" | "LOOK"
  ) {
    const q = query.trim();

    if (!q) return;

    if (type === "MAIN") {
      setSearchingMain(true);
    } else {
      setSearchingLook(true);
    }

    setError(null);

    try {
      const response = await fetch(
        `/api/admin/complete-the-look?q=${encodeURIComponent(q)}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.error ?? "Search failed."
        );
      }

      if (type === "MAIN") {
        setMainResults(data.products ?? []);
      } else {
        setLookResults(data.products ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Search failed."
      );
    } finally {
      if (type === "MAIN") {
        setSearchingMain(false);
      } else {
        setSearchingLook(false);
      }
    }
  }

  async function selectMainProduct(product: Product) {
    setSelectedProduct(product);
    setMainResults([]);
    setMainQuery("");
    setLookResults([]);
    setLookQuery("");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/admin/complete-the-look?productId=${encodeURIComponent(
          product.id
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.error ??
            "Failed to load Complete the Look."
        );
      }

      setLinkedProducts(
        data.linkedProducts ?? []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Complete the Look."
      );
    }
  }

  async function unlinkLook(productId: string) {
  const confirmed = window.confirm(
    "Remove all Complete the Look products from this product?"
  );

  if (!confirmed) return;

  setUnlinkingId(productId);
  setError(null);
  setNotice(null);

  try {
    const response = await fetch(
      `/api/admin/complete-the-look?productId=${encodeURIComponent(
        productId
      )}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data?.error ??
          "Failed to unlink look."
      );
    }

    if (
      selectedProduct?.id === productId
    ) {
      setSelectedProduct(null);
      setLinkedProducts([]);
    }

    setNotice(
      "Complete the Look removed."
    );

    await loadActiveLooks();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to unlink look."
    );
  } finally {
    setUnlinkingId(null);
  }
}

  function addLinkedProduct(product: Product) {
    if (!selectedProduct) return;

    if (product.id === selectedProduct.id) {
      setError(
        "You cannot add the main product to its own look."
      );
      return;
    }

    if (
      linkedProducts.some(
        (item) => item.id === product.id
      )
    ) {
      setError(
        "That product is already in this look."
      );
      return;
    }

    if (linkedProducts.length >= 4) {
      setError(
        "You can add a maximum of 4 products."
      );
      return;
    }

    setLinkedProducts((current) => [
      ...current,
      product,
    ]);

    setLookResults([]);
    setLookQuery("");
    setError(null);
    setNotice(null);
  }

  function removeLinkedProduct(
    productId: string
  ) {
    setLinkedProducts((current) =>
      current.filter(
        (product) =>
          product.id !== productId
      )
    );

    setNotice(null);
  }

  function moveProduct(
    index: number,
    direction: "LEFT" | "RIGHT"
  ) {
    setLinkedProducts((current) => {
      const next = [...current];

      const targetIndex =
        direction === "LEFT"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= next.length
      ) {
        return current;
      }

      [next[index], next[targetIndex]] = [
        next[targetIndex],
        next[index],
      ];

      return next;
    });

    setNotice(null);
  }

  async function saveLook() {
    if (!selectedProduct) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        "/api/admin/complete-the-look",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            productId:
              selectedProduct.id,

            linkedProductIds:
              linkedProducts.map(
                (product) => product.id
              ),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.error ??
            "Failed to save look."
        );
      }

      setNotice(
        linkedProducts.length > 0
          ? `Complete the Look saved — ${linkedProducts.length} product${
              linkedProducts.length === 1
                ? ""
                : "s"
            }.`
          : "Complete the Look cleared."
      );

      await loadActiveLooks();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save look."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
            Visual merchandising
          </div>

          <h1 className="mt-1 text-xl font-semibold text-black">
            Complete the Look
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Pair up to four products with a
            main product to create an
            editorial outfit for shoppers.
          </p>
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

      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
  <div className="flex items-center justify-between border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
        Current styling
      </div>

      <h2 className="mt-1 text-base font-semibold text-black">
        Active Complete the Looks
      </h2>

      <p className="mt-1 text-xs text-neutral-500">
        Products currently styled together
        on the storefront.
      </p>
    </div>

    <div className="rounded-full border border-[#e8ddd4] bg-white px-3 py-1.5 text-xs text-neutral-500">
      {activeLooks.length} active
    </div>
  </div>

  <div className="p-6">
    {loadingLooks ? (
      <div className="py-8 text-center text-sm text-black/40">
        Loading looks...
      </div>
    ) : activeLooks.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-black/10 px-5 py-8 text-center text-sm text-black/40">
        No Complete the Looks are currently
        active.
      </div>
    ) : (
      <div className="space-y-4">
        {activeLooks.map((look) => (
          <div
            key={look.id}
            className="rounded-2xl border border-black/10 p-4"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-black/5">
                  {look.images[0]?.url ? (
                    <Image
                      src={look.images[0].url}
                      alt={look.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2D3E]/60">
                    Main product
                  </div>

                  <div className="mt-1 truncate text-sm font-semibold">
                    {look.title}
                  </div>

                  <div className="mt-1 text-xs text-black/50">
                    {look.brand.name}
                  </div>

                  <div className="mt-2 text-xs font-medium text-emerald-700">
                    {
                      look.linkedProducts
                        .length
                    }{" "}
                    linked product
                    {look.linkedProducts
                      .length === 1
                      ? ""
                      : "s"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {look.linkedProducts.map(
                  (product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-2 rounded-xl bg-[#fdf7f4] p-2 pr-3"
                    >
                      <div className="relative h-12 w-10 overflow-hidden rounded-lg bg-black/5">
                        {product.images[0]
                          ?.url ? (
                          <Image
                            src={
                              product
                                .images[0]
                                .url
                            }
                            alt={
                              product.title
                            }
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : null}
                      </div>

                      <div className="max-w-[130px]">
                        <div className="truncate text-xs font-medium">
                          {product.title}
                        </div>

                        <div className="truncate text-[10px] text-black/40">
                          {
                            product.brand
                              .name
                          }
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void selectMainProduct(
                      look
                    )
                  }
                  className="rounded-full border border-[#7B2D3E] px-4 py-2 text-xs font-medium text-[#7B2D3E] hover:bg-[#fdf7f4]"
                >
                  Edit
                </button>

                <button
                  type="button"
                  disabled={
                    unlinkingId === look.id
                  }
                  onClick={() =>
                    void unlinkLook(look.id)
                  }
                  className="rounded-full border border-red-200 px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {unlinkingId === look.id
                    ? "Unlinking..."
                    : "Unlink all"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</section>

      {/* Main product */}
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
        <div className="border-b border-black/10 px-6 py-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
            Step 1
          </div>

          <h2 className="mt-1 text-base font-semibold">
            Choose the main product
          </h2>
        </div>

        <div className="p-6">
          {!selectedProduct ? (
            <>
              <div className="flex gap-3">
                <input
                  value={mainQuery}
                  onChange={(event) =>
                    setMainQuery(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                    ) {
                      event.preventDefault();

                      void searchProducts(
                        mainQuery,
                        "MAIN"
                      );
                    }
                  }}
                  placeholder="Search by product or brand..."
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/30"
                />

                <button
                  type="button"
                  disabled={searchingMain}
                  onClick={() =>
                    void searchProducts(
                      mainQuery,
                      "MAIN"
                    )
                  }
                  className="rounded-2xl bg-[#7B2D3E] px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {searchingMain
                    ? "Searching..."
                    : "Search"}
                </button>
              </div>

              {mainResults.length > 0 ? (
                <div className="mt-5 space-y-2">
                  {mainResults.map(
                    (product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() =>
                          void selectMainProduct(
                            product
                          )
                        }
                        className="flex w-full items-center gap-4 rounded-2xl border border-black/10 p-3 text-left transition hover:border-[#7B2D3E]/30 hover:bg-[#fdf7f4]"
                      >
                        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5">
                          {product.images[0]
                            ?.url ? (
                            <Image
                              src={
                                product
                                  .images[0]
                                  .url
                              }
                              alt={
                                product.title
                              }
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {product.title}
                          </div>

                          <div className="mt-0.5 text-xs text-black/50">
                            {
                              product.brand
                                .name
                            }
                          </div>

                          <div className="mt-1 text-xs text-black/60">
                            {money(
                              product.price,
                              product.currency
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#fdf7f4] p-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-black/5">
                  {selectedProduct
                    .images[0]?.url ? (
                    <Image
                      src={
                        selectedProduct
                          .images[0].url
                      }
                      alt={
                        selectedProduct.title
                      }
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2D3E]/60">
                    Main product
                  </div>

                  <div className="mt-1 truncate text-sm font-semibold">
                    {selectedProduct.title}
                  </div>

                  <div className="mt-1 text-xs text-black/50">
                    {
                      selectedProduct.brand
                        .name
                    }
                  </div>

                  <div className="mt-1 text-sm text-black/70">
                    {money(
                      selectedProduct.price,
                      selectedProduct.currency
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setLinkedProducts([]);
                  setLookResults([]);
                  setNotice(null);
                  setError(null);
                }}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium"
              >
                Change product
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Complete the Look editor */}
      {selectedProduct ? (
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                Step 2
              </div>

              <h2 className="mt-1 text-base font-semibold">
                Complete the Look
              </h2>
            </div>

            <div className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-black/50">
              {linkedProducts.length} / 4
            </div>
          </div>

          <div className="space-y-6 p-6">
            {linkedProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {linkedProducts.map(
                  (product, index) => (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-3xl border border-black/10 bg-white"
                    >
                      <div className="relative aspect-[3/4] bg-black/5">
                        {product.images[0]
                          ?.url ? (
                          <Image
                            src={
                              product
                                .images[0]
                                .url
                            }
                            alt={
                              product.title
                            }
                            fill
                            className="object-cover"
                            sizes="25vw"
                          />
                        ) : null}

                        <div className="absolute left-3 top-3 rounded-full bg-black/80 px-2 py-1 text-[10px] text-white">
                          #{index + 1}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="line-clamp-2 text-sm font-medium">
                          {product.title}
                        </div>

                        <div className="mt-1 text-xs text-black/50">
                          {
                            product.brand
                              .name
                          }
                        </div>

                        <div className="mt-2 text-sm text-black/70">
                          {money(
                            product.price,
                            product.currency
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            disabled={
                              index === 0
                            }
                            onClick={() =>
                              moveProduct(
                                index,
                                "LEFT"
                              )
                            }
                            className="rounded-xl border border-black/10 px-2.5 py-1.5 text-xs disabled:opacity-30"
                          >
                            ←
                          </button>

                          <button
                            type="button"
                            disabled={
                              index ===
                              linkedProducts.length -
                                1
                            }
                            onClick={() =>
                              moveProduct(
                                index,
                                "RIGHT"
                              )
                            }
                            className="rounded-xl border border-black/10 px-2.5 py-1.5 text-xs disabled:opacity-30"
                          >
                            →
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeLinkedProduct(
                                product.id
                              )
                            }
                            className="rounded-xl border border-red-200 px-2.5 py-1.5 text-xs text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/10 px-5 py-8 text-center text-sm text-black/40">
                No products have been
                added to this look yet.
              </div>
            )}

            {linkedProducts.length < 4 ? (
              <div className="border-t border-black/10 pt-6">
                <div className="mb-3 text-sm font-medium">
                  Add another product
                </div>

                <div className="flex gap-3">
                  <input
                    value={lookQuery}
                    onChange={(event) =>
                      setLookQuery(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault();

                        void searchProducts(
                          lookQuery,
                          "LOOK"
                        );
                      }
                    }}
                    placeholder="Search matching top, skirt, hijab..."
                    className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/30"
                  />

                  <button
                    type="button"
                    disabled={searchingLook}
                    onClick={() =>
                      void searchProducts(
                        lookQuery,
                        "LOOK"
                      )
                    }
                    className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {searchingLook
                      ? "Searching..."
                      : "Search"}
                  </button>
                </div>

                {lookResults.length >
                0 ? (
                  <div className="mt-4 space-y-2">
                    {lookResults
                      .filter(
                        (product) =>
                          product.id !==
                          selectedProduct.id
                      )
                      .map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-black/5">
                              {product
                                .images[0]
                                ?.url ? (
                                <Image
                                  src={
                                    product
                                      .images[0]
                                      .url
                                  }
                                  alt={
                                    product.title
                                  }
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              ) : null}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {
                                  product.title
                                }
                              </div>

                              <div className="mt-0.5 text-xs text-black/50">
                                {
                                  product
                                    .brand
                                    .name
                                }{" "}
                                ·{" "}
                                {money(
                                  product.price,
                                  product.currency
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              addLinkedProduct(
                                product
                              )
                            }
                            className="shrink-0 rounded-full border border-[#7B2D3E] px-4 py-2 text-xs font-medium text-[#7B2D3E] hover:bg-[#fdf7f4]"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end border-t border-black/10 pt-5">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void saveLook()
                }
                className="rounded-full bg-[#7B2D3E] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save look"}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}