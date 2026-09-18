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
      </div>
    </main>
  );
}