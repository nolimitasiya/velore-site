"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

type Currency = "GBP" | "EUR" | "CHF" | "USD";

type Product = {
  id: string;
  title: string;
  sourceUrl: string;
  affiliateUrl: string | null;
  price: string | null;
  originalPrice: string | null;
  currency: Currency;
  badges: string[];

  images: Array<{
  id: string;
  url: string;
  sortOrder: number;
}>;

  brand: {
    name: string;
    slug: string;
  };
};

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
      {children}
      {required ? (
        <span className="ml-1 text-[#7B2D3E]">*</span>
      ) : null}
    </label>
  );
}

export default function AdminEditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [brandName, setBrandName] = useState("");

  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");

  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [currency, setCurrency] = useState<Currency>("GBP");

  const [saleBadge, setSaleBadge] = useState(false);

  const [images, setImages] = useState<Product["images"]>([]);
  const [savingImageId, setSavingImageId] =  useState<string | null>(null);
  const [imageError, setImageError] =  useState<string | null>(null);
  const [savedImageId, setSavedImageId] =  useState<string | null>(null);

  const [newImageUrl, setNewImageUrl] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const [removingImageId, setRemovingImageId] =  useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/products/${id}`, {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.error ?? `Failed to load product (${response.status})`
          );
        }

        const product = data.product as Product;

        setBrandName(product.brand.name);
        setTitle(product.title);
        setSourceUrl(product.sourceUrl);
        setAffiliateUrl(product.affiliateUrl ?? "");
        setPrice(product.price ?? "");
        setOriginalPrice(product.originalPrice ?? "");
        setCurrency(product.currency);
        setSaleBadge(product.badges.includes("sale"));
        setImages(product.images);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load product."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      void loadProduct();
    }
  }, [id]);

  function updateImageUrl(
  imageId: string,
  url: string
) {
  setImages((current) =>
    current.map((image) =>
      image.id === imageId
        ? {
            ...image,
            url,
          }
        : image
    )
  );

  setSavedImageId(null);
}

async function saveImage(imageId: string) {
  if (savingImageId) return;

  const image = images.find(
    (item) => item.id === imageId
  );

  if (!image) return;

  setSavingImageId(imageId);
  setImageError(null);
  setSavedImageId(null);

  try {
    const response = await fetch(
      `/api/admin/products/${id}/images/${imageId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: image.url.trim(),
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.error ??
          `Failed to update image (${response.status})`
      );
    }

    setImages((current) =>
      current.map((item) =>
        item.id === imageId
          ? data.image
          : item
      )
    );

    setSavedImageId(imageId);
  } catch (error) {
    setImageError(
      error instanceof Error
        ? error.message
        : "Failed to update product image."
    );
  } finally {
    setSavingImageId(null);
  }
}

async function addImage() {
  if (addingImage || !newImageUrl.trim()) return;

  setAddingImage(true);
  setImageError(null);
  setSavedImageId(null);

  try {
    const response = await fetch(
      `/api/admin/products/${id}/images`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: newImageUrl.trim(),
        }),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.error ??
          `Failed to add image (${response.status})`
      );
    }

    setImages((current) => [
      ...current,
      data.image,
    ]);

    setNewImageUrl("");
  } catch (error) {
    setImageError(
      error instanceof Error
        ? error.message
        : "Failed to add product image."
    );
  } finally {
    setAddingImage(false);
  }
}

async function removeImage(imageId: string) {
  if (removingImageId || images.length <= 1) return;

  const confirmed = window.confirm(
    "Remove this product image? This cannot be undone."
  );

  if (!confirmed) return;

  setRemovingImageId(imageId);
  setImageError(null);
  setSavedImageId(null);

  try {
    const response = await fetch(
      `/api/admin/products/${id}/images/${imageId}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.error ??
          `Failed to remove image (${response.status})`
      );
    }

    setImages((current) =>
      current
        .filter((image) => image.id !== imageId)
        .map((image, index) => ({
          ...image,
          sortOrder: index,
        }))
    );
  } catch (error) {
    setImageError(
      error instanceof Error
        ? error.message
        : "Failed to remove product image."
    );
  } finally {
    setRemovingImageId(null);
  }
}

  async function saveProduct() {
    if (saving) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          sourceUrl: sourceUrl.trim(),
          affiliateUrl: affiliateUrl.trim(),
          price: price.trim(),
          originalPrice: originalPrice.trim(),
          currency,
          saleBadge,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ?? `Failed to update product (${response.status})`
        );
      }

      setPrice(data.product.price ?? "");
      setOriginalPrice(data.product.originalPrice ?? "");

      setSuccess(true);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update product."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50/70">
        <div className="rounded-3xl border border-black/10 bg-white p-6 text-sm text-neutral-500">
          Loading product...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="space-y-6">
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin catalogue · Products
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Edit product
              </h1>

              <p className="text-sm text-white/60">
                {brandName}
              </p>
            </div>

            <Link
              href="/admin/products"
              className="inline-flex w-fit items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              ← Back to products
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-6">
          <div>
            <h2 className="text-lg font-semibold text-black">
              Product details
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Update catalogue information and sale pricing.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <FieldLabel required>Product name</FieldLabel>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel required>Product URL</FieldLabel>

                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
                />
              </div>

              <div>
                <FieldLabel>Affiliate URL</FieldLabel>

                <input
                  type="url"
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <FieldLabel>Current price</FieldLabel>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="79.00"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
                />

                <div className="mt-2 text-xs text-neutral-400">
                  Current selling price.
                </div>
              </div>

              <div>
                <FieldLabel>Original price</FieldLabel>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="119.72"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
                />

                <div className="mt-2 text-xs text-neutral-400">
                  Optional. Price before discount.
                </div>
              </div>

              <div>
                <FieldLabel>Currency</FieldLabel>

                <select
                  value={currency}
                  onChange={(e) =>
                    setCurrency(e.target.value as Currency)
                  }
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
                >
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                  <option value="CHF">CHF</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-4">
              <div>
                <div className="text-sm font-medium text-black">
                  Sale
                </div>

                <div className="mt-1 text-xs leading-5 text-neutral-500">
                  Show this product as part of the Sale collection.
                </div>
              </div>

              <input
                type="checkbox"
                checked={saleBadge}
                onChange={(e) => setSaleBadge(e.target.checked)}
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Product updated successfully.
              </div>
            ) : null}

            <button
              type="button"
              onClick={saveProduct}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-[#7B2D3E] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-6">
  <div>
    <h2 className="text-lg font-semibold text-black">
      Product images
    </h2>

    <p className="mt-1 text-sm leading-6 text-neutral-500">
      Manage externally hosted product images.
    </p>

    <div className="mt-5 rounded-2xl border border-black/10 bg-neutral-50 p-4">
  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
    Add image
  </div>

  <div className="mt-3 flex flex-col gap-3 md:flex-row">
    <input
      type="url"
      value={newImageUrl}
      onChange={(e) => setNewImageUrl(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void addImage();
        }
      }}
      placeholder="https://example.com/product-image.jpg"
      className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
    />

    <button
      type="button"
      onClick={addImage}
      disabled={addingImage || !newImageUrl.trim()}
      className="inline-flex items-center justify-center rounded-2xl bg-[#7B2D3E] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {addingImage ? "Adding..." : "Add image"}
    </button>
  </div>
</div>
  </div>

  {images.length === 0 ? (
    <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
      No product images found.
    </div>
  ) : (
    <div className="mt-6 space-y-4">
      {images.map((image, index) => (
        <div
          key={image.id}
          className="grid gap-5 rounded-2xl border border-black/10 p-4 md:grid-cols-[140px_minmax(0,1fr)]"
        >
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Image {index + 1}
            </div>

            <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-black/10 bg-neutral-50">
              <img
                src={image.url}
                alt={`${title} image ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <FieldLabel>Image URL</FieldLabel>

            <input
              type="url"
              value={image.url}
              onChange={(e) =>
                updateImageUrl(
                  image.id,
                  e.target.value
                )
              }
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => saveImage(image.id)}
                disabled={savingImageId !== null}
                className="inline-flex items-center justify-center rounded-2xl bg-[#7B2D3E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingImageId === image.id
                  ? "Saving..."
                  : "Save image URL"}
              </button>

              <a
                href={image.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Open image
              </a>

              <button
  type="button"
  onClick={() => removeImage(image.id)}
  disabled={
    images.length <= 1 ||
    removingImageId !== null
  }
  title={
    images.length <= 1
      ? "A product must have at least one image."
      : "Remove image"
  }
  className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
>
  {removingImageId === image.id
    ? "Removing..."
    : "Remove image"}
</button>

              {savedImageId === image.id ? (
                <span className="text-sm text-emerald-700">
                  Image updated successfully.
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}

  {imageError ? (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {imageError}
    </div>
  ) : null}
</section>
      </div>
    </main>
  );
}