"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Row = {
  id: string;
  title: string;
  price: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  sourceUrl: string | null;
  affiliateUrl: string | null;
  imageUrl: string | null;
  status: string;
  publishedAt: string | null;
};

export default function ProductsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setError(null);
      setLoading(true);

      try {
        const response = await fetch(
          "/api/brand/products/list",
          {
            cache: "no-store",
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.error ??
              `Failed to load products (${response.status})`
          );
        }

        setRows(
          Array.isArray(data.products)
            ? data.products
            : []
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load products."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-[24px] border border-black/8 bg-white px-5 py-5 text-sm text-black/50">
        Loading products...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-[24px] border border-black/8 bg-white px-6 py-10 text-center">
        <div className="text-sm font-medium text-black">
          No products yet
        </div>

        <div className="mt-1 text-sm text-black/45">
          Products managed by Veilora will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-black/50">
          {rows.length}{" "}
          {rows.length === 1
            ? "product"
            : "products"}
        </div>

        <div className="text-xs text-black/40">
          Select a product to view its performance
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((product) => {
  const live =
    product.status === "APPROVED" &&
    Boolean(product.publishedAt) &&
    product.isActive;

          return (
            <Link
              key={product.id}
              href={`/brand/revenue/products/${product.id}`}
              className="group overflow-hidden rounded-[22px] border border-black/10 bg-white transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-black/5">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.015]"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-xs text-black/40">
                    No image
                  </div>
                )}
              </div>

              <div className="space-y-2 p-4">
                <div className="line-clamp-2 font-medium text-black">
                  {product.title}
                </div>

                <div className="text-sm text-black/60">
                  {product.price != null
                    ? `${product.currency} ${product.price}`
                    : "Price unavailable"}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span
                    className={[
                      "inline-flex rounded-full border px-3 py-1 text-[11px]",
                      live
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-black/10 bg-black/[0.03] text-black/50",
                    ].join(" ")}
                  >
                    {live ? "Live" : "Not live"}
                  </span>

                  <span className="text-xs text-[#7B2D3E] opacity-0 transition group-hover:opacity-100">
                    View insights →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}