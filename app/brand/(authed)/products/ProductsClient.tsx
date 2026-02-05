"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Row = {
  id: string;
  title: string;
  price: string | null; // Decimal serializes as string
  currency: string;
  isActive: boolean;
  createdAt: string;
  sourceUrl: string | null;
  affiliateUrl: string | null;
  imageUrl: string | null;
};


export default function ProductsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const r = await fetch("/api/brand/products/list");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j?.error ?? `Failed to load (${r.status})`);
      return;
    }
    setRows(j.products ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <div key={p.id} className="rounded-2xl border overflow-hidden">
            <div className="relative aspect-[4/5] bg-black/5">
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt={p.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-xs text-black/50">
                  No image
                </div>
              )}
            </div>

            <div className="p-3 space-y-1">
              <div className="font-medium line-clamp-2">{p.title}</div>

              <div className="text-sm text-black/70">
                {p.price != null ? `${p.currency ?? ""} ${p.price}` : "Price not set"}
              </div>

              {"isActive" in p && (
                <div className="text-xs text-black/60">
                  Status: {p.isActive ? "Live" : "Hidden"}
                </div>
              )}

              {p.affiliateUrl && (
                <a
                  className="text-xs underline text-black/70"
                  href={p.affiliateUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View product link
                </a>
              )}
            </div>
          </div>
        ))}

        {rows.length === 0 && !error && (
          <div className="text-sm text-black/60">No products yet.</div>
        )}
      </div>
    </div>
  );
}
