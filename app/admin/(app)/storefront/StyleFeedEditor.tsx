"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FeedProduct = {
  id: string;
  title: string;
  slug: string;
  price: string | null;
  currency: string;

  brand: {
    id: string;
    name: string;
    slug: string;
  };

  imageUrl: string | null;
};

type BrandSearchResult = {
  id: string;
  name: string;
  slug: string;
  baseCountryCode?: string | null;
};

type FeedItem = {
  localId: string;
  title: string;
  instagramHandle: string;

  imageUrl: string;
  imagePath: string;
  imageAlt: string;
  imageWidth: number | null;
  imageHeight: number | null;
  imageFocalX: number;
  imageFocalY: number;

  postUrl: string;
  caption: string;
  sortOrder: number;
  isActive: boolean;

  products: FeedProduct[];

  isUploading: boolean;
  uploadError: string | null;
};

function makeLocalId() {
  return Math.random().toString(36).slice(2, 10);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function FocalPointPreview(props: {
  imageUrl: string;
  alt: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
}) {
  const { imageUrl, alt, focalX, focalY, onChange } = props;
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  function updateFromClientPoint(clientX: number, clientY: number) {
    const frame = frameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

    onChange(Number(x.toFixed(2)), Number(y.toFixed(2)));
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Preview</div>
        <div className="text-xs text-black/45">
          Drag to set crop focus · 4:5
        </div>
      </div>

      <div
        ref={frameRef}
        className="relative overflow-hidden rounded-xl border border-black/10 bg-black/5 aspect-[4/5] touch-none select-none"
        onPointerDown={(e) => {
          if (!imageUrl) return;
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          updateFromClientPoint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging || !imageUrl) return;
          updateFromClientPoint(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (!imageUrl) return;
          setDragging(false);
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
        }}
        onPointerLeave={() => {
          setDragging(false);
        }}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={alt || "Style feed preview"}
              className="h-full w-full object-cover"
              style={{
                objectPosition: `${focalX}% ${focalY}%`,
              }}
              draggable={false}
            />

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/[0.03]" />

              <div
                className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/25 shadow-sm"
                style={{
                  left: `${focalX}%`,
                  top: `${focalY}%`,
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-black/40">
            No image yet
          </div>
        )}
      </div>
    </div>
  );
}

export default function StyleFeedEditor() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [brandSearch, setBrandSearch] = useState<Record<string, string>>({});
  const [brandResults, setBrandResults] = useState<
  Record<string, BrandSearchResult[]>
>({});

const [selectedBrand, setSelectedBrand] = useState<
  Record<string, BrandSearchResult | null>
>({});

const [productSearch, setProductSearch] = useState<Record<string, string>>({});
const [productResults, setProductResults] = useState<
  Record<string, FeedProduct[]>
>({});


  const hasUploadingItem = useMemo(
    () => items.some((item) => item.isUploading),
    [items]
  );

  async function load() {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/admin/storefront/style-feed", {
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      setError(json?.error ?? "Failed to load homepage style feed.");
      setBusy(false);
      return;
    }

    const nextItems: FeedItem[] = (json.items ?? []).map((item: any, index: number) => ({
      localId: makeLocalId(),
      title: item.title ?? "",
      instagramHandle: item.instagramHandle ?? "",

      imageUrl: item.imageUrl ?? "",
      imagePath: item.imagePath ?? "",
      imageAlt: item.imageAlt ?? "",
      imageWidth: typeof item.imageWidth === "number" ? item.imageWidth : null,
      imageHeight: typeof item.imageHeight === "number" ? item.imageHeight : null,
      imageFocalX:
        typeof item.imageFocalX === "number" ? item.imageFocalX : 50,
      imageFocalY:
        typeof item.imageFocalY === "number" ? item.imageFocalY : 50,

      postUrl: item.postUrl ?? "",
      caption: item.caption ?? "",
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
      isActive: item.isActive !== false,

      products: (item.products ?? []).map((entry: any) => ({
        id: entry.product.id,
        title: entry.product.title,
        slug: entry.product.slug,
        price:
        entry.product.price !== null &&
        entry.product.price !== undefined
      ? String(entry.product.price)
      : null,
    currency: entry.product.currency ?? "GBP",

  brand: {
    id: entry.product.brand?.id ?? "",
    name: entry.product.brand?.name ?? "",
    slug: entry.product.brand?.slug ?? "",
  },

  imageUrl: entry.product.images?.[0]?.url ?? null,
})),

      isUploading: false,
      uploadError: null,
    }));

    setItems(nextItems);
    setBusy(false);
  }

  useEffect(() => {
    load();
  }, []);

  

  function addItem() {
    if (items.length >= 4) return;

    setItems((prev) => [
      ...prev,
      {
        localId: makeLocalId(),
        title: "",
        instagramHandle: "",

        imageUrl: "",
        imagePath: "",
        imageAlt: "",
        imageWidth: null,
        imageHeight: null,
        imageFocalX: 50,
        imageFocalY: 50,

        postUrl: "",
        caption: "",
        sortOrder: prev.length,
        isActive: true,

        products: [],

        isUploading: false,
        uploadError: null,
      },
    ]);
  }

  function removeItem(localId: string) {
    setItems((prev) =>
      prev
        .filter((item) => item.localId !== localId)
        .map((item, index) => ({ ...item, sortOrder: index }))
    );

  }

  function updateItem(localId: string, updater: (item: FeedItem) => FeedItem) {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? updater(item) : item))
    );
  }

  async function handleUpload(localId: string, file: File) {
    const current = items.find((item) => item.localId === localId);
    if (!current) return;

    

    updateItem(localId, (item) => ({
      ...item,
      isUploading: true,
      uploadError: null,
    }));

    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload/style-feed", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        updateItem(localId, (item) => ({
          ...item,
          isUploading: false,
          uploadError: json?.error ?? "Upload failed.",
        }));
        return;
      }

      updateItem(localId, (item) => ({
        ...item,
        imageUrl: json.imageUrl ?? "",
        imagePath: json.imagePath ?? "",
        imageWidth:
          typeof json.imageWidth === "number" ? json.imageWidth : null,
        imageHeight:
          typeof json.imageHeight === "number" ? json.imageHeight : null,
        imageAlt:
  item.imageAlt || item.title || item.caption || "",
        imageFocalX:
          typeof json.imageFocalX === "number" ? json.imageFocalX : 50,
        imageFocalY:
          typeof json.imageFocalY === "number" ? json.imageFocalY : 50,
        isUploading: false,
        uploadError: null,
      }));
    } catch {
      updateItem(localId, (item) => ({
        ...item,
        isUploading: false,
        uploadError: "Something went wrong while uploading.",
      }));
    }
  }


  async function searchBrands(localId: string, query: string) {
  if (!query.trim()) {
    setBrandResults((prev) => ({
      ...prev,
      [localId]: [],
    }));
    return;
  }

  try {
    const res = await fetch(
      `/api/admin/brands/search?q=${encodeURIComponent(query)}&take=8`,
      {
        cache: "no-store",
      }
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) return;

    setBrandResults((prev) => ({
      ...prev,
      [localId]: json.brands ?? [],
    }));
  } catch {
    // Keep the editor usable even if search fails.
  }
}

async function searchProducts(localId: string, query: string) {
  if (!query.trim()) {
    setProductResults((prev) => ({
      ...prev,
      [localId]: [],
    }));
    return;
  }

  const brand = selectedBrand[localId];

  const url =
    `/api/storefront/products?q=${encodeURIComponent(query)}&take=8` +
    (brand?.id
      ? `&brandId=${encodeURIComponent(brand.id)}`
      : "");

  try {
    const res = await fetch(url, {
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) return;

    const products: FeedProduct[] = (json.products ?? []).map((p: any) => ({
      id: p.id,
      title: p.title ?? "",
      slug: p.slug ?? "",
      price:
        p.price !== null && p.price !== undefined
          ? String(p.price)
          : null,
      currency: p.currency ?? "GBP",

      brand: {
        id: p.brand?.id ?? "",
        name: p.brand?.name ?? "",
        slug: p.brand?.slug ?? "",
      },

      imageUrl:
        p.imageUrl ??
        p.images?.[0]?.url ??
        null,
    }));

    setProductResults((prev) => ({
      ...prev,
      [localId]: products,
    }));
  } catch {
    // Ignore transient search errors.
  }
}

function addProduct(localId: string, product: FeedProduct) {
  updateItem(localId, (item) => {
    if (item.products.some((p) => p.id === product.id)) {
      return item;
    }

    if (item.products.length >= 4) {
      return item;
    }

    return {
      ...item,
      products: [...item.products, product],
    };
  });

  setProductSearch((prev) => ({
    ...prev,
    [localId]: "",
  }));

  setProductResults((prev) => ({
    ...prev,
    [localId]: [],
  }));
}

function removeProduct(localId: string, productId: string) {
  updateItem(localId, (item) => ({
    ...item,
    products: item.products.filter(
      (product) => product.id !== productId
    ),
  }));
}

function moveProduct(
  localId: string,
  productIndex: number,
  direction: "up" | "down"
) {
  updateItem(localId, (item) => {
    const products = [...item.products];

    const nextIndex =
      direction === "up"
        ? productIndex - 1
        : productIndex + 1;

    if (
      nextIndex < 0 ||
      nextIndex >= products.length
    ) {
      return item;
    }

    [products[productIndex], products[nextIndex]] = [
      products[nextIndex],
      products[productIndex],
    ];

    return {
      ...item,
      products,
    };
  });
}


  async function save() {
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const payload = {
        items: items.map((item) => ({
          title: item.title,
          instagramHandle: item.instagramHandle,

          imageUrl: item.imageUrl,
          imagePath: item.imagePath || null,
          imageAlt: item.imageAlt || null,
          imageWidth: item.imageWidth,
          imageHeight: item.imageHeight,
          imageFocalX: item.imageFocalX,
          imageFocalY: item.imageFocalY,

          postUrl: item.postUrl,
          caption: item.caption,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
          productIds: item.products.map((product) => product.id),
        })),
      };

      const res = await fetch("/api/admin/storefront/style-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setError(json?.error ?? "Failed to save homepage style feed.");
        return;
      }

      setMessage("Homepage style feed updated successfully.");
      await load();
    } catch {
      setError("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
  <div className="flex items-center justify-between border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Storefront</div>
      <h2 className="mt-0.5 text-base font-semibold text-black">Homepage style feed</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Curate up to 4 editorial style feed cards for the homepage.
      </p>
    </div>
    <div className="text-sm text-neutral-500">{items.length} / 4 items</div>
  </div>
  <div className="p-6">

      {message && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {busy ? (
        <div className="mt-6 rounded-xl border border-black/10 bg-black/5 px-4 py-6 text-sm text-black/60">
          Loading homepage style feed...
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/10 px-4 py-6 text-sm text-black/60">
                No homepage style feed items yet.
              </div>
            ) : null}

            {items.map((item, index) => (
              <div
                key={item.localId}
                className="rounded-2xl border border-black/10 bg-neutral-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">Style feed item {index + 1}</div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.localId)}
                    className="text-sm text-red-600"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    

                    <div>
                      <label
                        htmlFor={`style-feed-image-upload-${item.localId}`}
                        className="text-sm font-medium"
                      >
                        Upload image
                      </label>
                      <input
                        id={`style-feed-image-upload-${item.localId}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void handleUpload(item.localId, file);
                          }
                          e.currentTarget.value = "";
                        }}
                        className="mt-2 block w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-sm file:text-white"
                      />
                      <p className="mt-2 text-xs text-black/50">
                        JPG, PNG or WebP. Minimum 1200 × 1500. Recommended 1600 × 2000.
                      </p>

                      {item.isUploading && (
                        <div className="mt-2 text-xs text-black/60">
                          Uploading image...
                        </div>
                      )}

                      {item.uploadError && (
                        <div className="mt-2 text-xs text-red-600">
                          {item.uploadError}
                        </div>
                      )}

                      {item.imageWidth && item.imageHeight ? (
                        <div className="mt-2 text-xs text-black/45">
                          Uploaded image: {item.imageWidth} × {item.imageHeight}
                        </div>
                      ) : null}
                    </div>

                    <div>
  <label
    htmlFor={`style-feed-title-${item.localId}`}
    className="text-sm font-medium"
  >
    Title
  </label>
  <input
    id={`style-feed-title-${item.localId}`}
    type="text"
    value={item.title}
    onChange={(e) =>
      updateItem(item.localId, (current) => ({
        ...current,
        title: e.target.value,
        imageAlt: current.imageAlt || e.target.value,
      }))
    }
    placeholder="Summer evening in Paris"
    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
  />
</div>

<div>
  <label
    htmlFor={`style-feed-instagram-handle-${item.localId}`}
    className="text-sm font-medium"
  >
    Instagram handle
  </label>
  <input
    id={`style-feed-instagram-handle-${item.localId}`}
    type="text"
    value={item.instagramHandle}
    onChange={(e) =>
      updateItem(item.localId, (current) => ({
        ...current,
        instagramHandle: e.target.value,
      }))
    }
    placeholder="@james"
    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
  />
</div>

                    

                    <div>
                      <label
                        htmlFor={`style-feed-post-url-${item.localId}`}
                        className="text-sm font-medium"
                      >
                        Instagram post URL
                      </label>
                      <input
                        id={`style-feed-post-url-${item.localId}`}
                        type="text"
                        value={item.postUrl}
                        onChange={(e) =>
                          updateItem(item.localId, (current) => ({
                            ...current,
                            postUrl: e.target.value,
                          }))
                        }
                        placeholder="https://www.instagram.com/p/XXXXXXXXXXX/"
                        className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                      />
                      <p className="mt-2 text-xs text-black/50">
                        This is the link shoppers will open when they click the card.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`style-feed-caption-${item.localId}`}
                        className="text-sm font-medium"
                      >
                        Caption
                      </label>
                      <textarea
                        id={`style-feed-caption-${item.localId}`}
                        value={item.caption}
                        onChange={(e) =>
                          updateItem(item.localId, (current) => ({
                            ...current,
                            caption: e.target.value,
                            imageAlt:
                              current.imageAlt || e.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Optional short caption"
                        className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`style-feed-image-alt-${item.localId}`}
                        className="text-sm font-medium"
                      >
                        Image alt text
                      </label>
                      <input
                        id={`style-feed-image-alt-${item.localId}`}
                        type="text"
                        value={item.imageAlt}
                        onChange={(e) =>
                          updateItem(item.localId, (current) => ({
                            ...current,
                            imageAlt: e.target.value,
                          }))
                        }
                        placeholder="Describe the image for accessibility"
                        className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-white p-4">
  <div className="flex items-start justify-between gap-4">
    <div>
      <div className="text-sm font-medium">
        Shop the Look
      </div>

      <p className="mt-1 text-xs text-black/50">
        Attach up to 4 Veilora products to this inspiration post.
      </p>
    </div>

    <div className="text-xs text-black/40">
      {item.products.length} / 4
    </div>
  </div>

  <div className="mt-4 space-y-3">
    {/* Brand search */}
    <div>
      <div className="flex items-center justify-between">
  <label className="text-xs font-medium text-black/60">
    Brand
  </label>

  {selectedBrand[item.localId] ? (
    <button
      type="button"
      onClick={() => {
        setSelectedBrand((prev) => ({
          ...prev,
          [item.localId]: null,
        }));

        setBrandSearch((prev) => ({
          ...prev,
          [item.localId]: "",
        }));

        setBrandResults((prev) => ({
          ...prev,
          [item.localId]: [],
        }));

        setProductSearch((prev) => ({
          ...prev,
          [item.localId]: "",
        }));

        setProductResults((prev) => ({
          ...prev,
          [item.localId]: [],
        }));
      }}
      className="text-xs text-black/45 underline underline-offset-4 transition hover:text-black"
    >
      Clear
    </button>
  ) : null}
</div>

      <input
        type="text"
        value={brandSearch[item.localId] ?? ""}
        onChange={(e) => {
          const value = e.target.value;

          setBrandSearch((prev) => ({
            ...prev,
            [item.localId]: value,
          }));

          setSelectedBrand((prev) => ({
            ...prev,
            [item.localId]: null,
          }));

          void searchBrands(item.localId, value);
        }}
        placeholder="Search brands..."
        className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      />

      {brandResults[item.localId]?.length > 0 ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-black/10 bg-white">
          {brandResults[item.localId].map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => {
                setSelectedBrand((prev) => ({
                  ...prev,
                  [item.localId]: brand,
                }));

                setBrandSearch((prev) => ({
                  ...prev,
                  [item.localId]: brand.name,
                }));

                setBrandResults((prev) => ({
                  ...prev,
                  [item.localId]: [],
                }));

                setProductSearch((prev) => ({
                  ...prev,
                  [item.localId]: "",
                }));

                setProductResults((prev) => ({
                  ...prev,
                  [item.localId]: [],
                }));
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/[0.03]"
            >
              <span>{brand.name}</span>

              <span className="text-xs text-black/40">
                {brand.baseCountryCode ?? brand.slug}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>

    {/* Product search */}
    <div>
      <label className="text-xs font-medium text-black/60">
        Product
      </label>

      <input
        type="text"
        value={productSearch[item.localId] ?? ""}
        onChange={(e) => {
          const value = e.target.value;

          setProductSearch((prev) => ({
            ...prev,
            [item.localId]: value,
          }));

          void searchProducts(
            item.localId,
            value
          );
        }}
        placeholder={
          selectedBrand[item.localId]
            ? `Search ${selectedBrand[item.localId]?.name} products...`
            : "Search products..."
        }
        disabled={item.products.length >= 4}
        className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm disabled:bg-black/[0.03] disabled:text-black/30"
      />

      {productResults[item.localId]?.length > 0 ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-black/10 bg-white">
          {productResults[item.localId].map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() =>
                addProduct(
                  item.localId,
                  product
                )
              }
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-black/[0.03]"
            >
              <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-black/5">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {product.title}
                </div>

                <div className="mt-0.5 text-xs text-black/45">
                  {product.brand.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  </div>

  {/* Selected products */}
  {item.products.length > 0 ? (
    <div className="mt-5 grid grid-cols-2 gap-3">
      {item.products.map((product, productIndex) => (
        <div
          key={product.id}
          className="overflow-hidden rounded-xl border border-black/10 bg-neutral-50"
        >
          <div className="aspect-[3/4] bg-black/5">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-black/30">
                No image
              </div>
            )}
          </div>

          <div className="p-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-black/40">
              {product.brand.name}
            </div>

            <div className="mt-1 line-clamp-2 text-xs font-medium">
              {product.title}
            </div>

            {product.price ? (
  <div className="mt-1 text-xs text-black/55">
    {new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: product.currency,
    }).format(Number(product.price))}
  </div>
) : null}

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  moveProduct(
                    item.localId,
                    productIndex,
                    "up"
                  )
                }
                disabled={productIndex === 0}
                className="text-xs disabled:opacity-25"
              >
                ←
              </button>

              <button
                type="button"
                onClick={() =>
                  moveProduct(
                    item.localId,
                    productIndex,
                    "down"
                  )
                }
                disabled={
                  productIndex ===
                  item.products.length - 1
                }
                className="text-xs disabled:opacity-25"
              >
                →
              </button>

              <button
                type="button"
                onClick={() =>
                  removeProduct(
                    item.localId,
                    product.id
                  )
                }
                className="ml-auto text-xs text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="mt-4 rounded-xl border border-dashed border-black/10 px-4 py-5 text-center text-xs text-black/40">
      No products attached yet.
    </div>
  )}
</div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor={`style-feed-order-${item.localId}`}
                          className="text-sm font-medium"
                        >
                          Display order
                        </label>
                        <input
                          id={`style-feed-order-${item.localId}`}
                          type="number"
                          min={0}
                          max={10}
                          value={item.sortOrder}
                          onChange={(e) =>
                            updateItem(item.localId, (current) => ({
                              ...current,
                              sortOrder: Number(e.target.value) || 0,
                            }))
                          }
                          className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="flex items-end">
                        <label
                          htmlFor={`style-feed-active-${item.localId}`}
                          className="inline-flex items-center gap-2 text-sm"
                        >
                          <input
                            id={`style-feed-active-${item.localId}`}
                            type="checkbox"
                            checked={item.isActive}
                            onChange={(e) =>
                              updateItem(item.localId, (current) => ({
                                ...current,
                                isActive: e.target.checked,
                              }))
                            }
                          />
                          Active
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FocalPointPreview
                      imageUrl={item.imageUrl}
                      alt={item.imageAlt || item.caption || "Style feed preview"}
                      focalX={item.imageFocalX}
                      focalY={item.imageFocalY}
                      onChange={(x, y) =>
                        updateItem(item.localId, (current) => ({
                          ...current,
                          imageFocalX: x,
                          imageFocalY: y,
                        }))
                      }
                    />

                    <div className="rounded-2xl border border-black/10 bg-white p-3 text-xs text-black/55">
                      <div>
                        Focal point: <strong>{item.imageFocalX}%</strong> /{" "}
                        <strong>{item.imageFocalY}%</strong>
                      </div>
                      <div className="mt-1">
                        The admin preview uses the same 4:5 crop logic the homepage will use.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addItem}
              disabled={items.length >= 4}
              className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-[#fdf7f4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add item
            </button>

            <button
              type="button"
              onClick={save}
              disabled={saving || hasUploadingItem}
              className="inline-flex items-center rounded-2xl bg-[#7B2D3E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : hasUploadingItem ? "Wait for uploads..." : "Save style feed"}
            </button>
          </div>
        </>
      )}
      </div>
    </section>
  );
}