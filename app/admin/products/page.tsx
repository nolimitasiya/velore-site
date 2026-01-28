// app/admin/products/page.tsx


"use client";


const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_IMPORT_TOKEN ?? "";


import { useEffect, useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import {
  formatDateTime,
  formatRelativeTime,
  getUserLocale,
  getUserTimeZone,
} from "@/lib/adminTime";
import { formatMoney } from "@/lib/money";
import { AdminHeader } from "@/components/admin/AdminHeader";

type BrandOption = { slug: string; name: string };

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  price: string | null; // Prisma Decimal serializes to string in JSON
  currency: "GBP" | "EUR" | "CHF" | "USD";
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  brand: { name: string; slug: string };
};

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


  useEffect(() => {
    setLocale(getUserLocale());
    setTz(getUserTimeZone());
  }, []);

  async function load() {
    setBusy(true);
    setError(null);

    const queryParams = new URLSearchParams();
    if (q.trim()) queryParams.set("q", q.trim());
    if (active !== "all") queryParams.set("active", active);
    if (brand !== "all") queryParams.set("brand", brand);

    const r = await fetch(`/api/admin/products?${queryParams.toString()}`);


    const j = await r.json();



    if (!r.ok) {
      setError(j?.error ?? "Failed to load products");
      setBusy(false);
      return;
    }

    setRows(j.products ?? []);
    setBrands(j.brands ?? []);
    setBusy(false);
  }

async function setProductPublished(id: string, published: boolean) {
  setBusy(true);
  setError(null);

  const r = await fetch(`/api/admin/products/${id}/publish`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ published }),
});


  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j.ok) {
    setError(j?.error ?? `Failed to update publish status (${r.status})`);
    setBusy(false);
    return;
  }

  // ✅ update just that row instantly
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
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ isActive }),
});


  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j.ok) {
    setError(j?.error ?? `Failed to update active status (${r.status})`);
    setBusy(false);
    return;
  }

  // ✅ update just that row instantly
  setRows((prev) =>
    prev.map((p) =>
      p.id === id ? { ...p, isActive: j.product.isActive } : p
    )
  );

  setBusy(false);
}



  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, tz]);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
       <div className="flex items-center justify-between gap-3">
          <AdminHeader />

        <h1 className="text-2xl font-semibold">Products</h1>
         <button
          onClick={load}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="rounded-2xl border p-4 flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title / slug / brand..."
          className="w-full sm:w-[360px] rounded-lg border px-3 py-2 text-sm"
        />

        <select
          aria-label="Filter by active status"
          value={active}
          onChange={(e) => setActive(e.target.value as any)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>

        <select
          aria-label="Filter by brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All brands</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>

        <button
          onClick={load}
          className="rounded-lg bg-black px-4 py-2 text-white text-sm disabled:opacity-50"
          disabled={busy}
        >
          Apply
        </button>

        {error && <div className="text-sm text-red-700">{error}</div>}
      </div>

      <AdminTable
        rows={rows}
        rowKey={(p) => p.id}
        emptyText={busy ? "Loading..." : "No products found."}
        columns={[
          {
            header: "Updated",
            cell: (p) => (
              <div className="leading-tight">
                <div className="font-medium">
                  {formatRelativeTime(p.updatedAt, locale)}
                </div>
                <div className="text-xs text-black/60">
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
            header: "Product",
            cell: (p) => (
              <div className="leading-tight">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-black/60">{p.slug}</div>
              </div>
            ),
          },
          {
            header: "Brand",
            cell: (p) => (
              <div className="leading-tight">
                <div className="font-medium">{p.brand?.name ?? "-"}</div>
                <div className="text-xs text-black/60">{p.brand?.slug ?? "-"}</div>
              </div>
            ),
          },
          {
            header: "Price",
            cell: (p) =>
              p.price ? (
                formatMoney(p.price, p.currency, locale)
              ) : (
                <span className="text-black/40">—</span>
              ),
          },
          {
            header: "Publish",
            cell: (p) => (
              <div className="flex items-center gap-2">
                <span
  className={`inline-flex rounded-full border px-3 py-1 text-xs ${
    p.publishedAt
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : "bg-black/5 text-black/70 border-black/10"
  }`}
>
  {p.publishedAt ? "Published" : "Draft"}
</span>


                <button
                  className="rounded-lg border px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => {
  console.log("CLICK publish id:", p.id);
  setProductPublished(p.id, !p.publishedAt);
}}

                  //onClick={() => setProductPublished(p.id, !p.publishedAt)}
                >
                  {p.publishedAt ? "Unpublish" : "Publish"}
                </button>
              </div>
            ),
          },
          {
            header: "Status",
            cell: (p) => (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                    p.isActive
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {p.isActive ? "Active" : "Inactive"}
                </span>

                <button
                  className="rounded-lg border px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => setProductActive(p.id, !p.isActive)}
                >
                  {p.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            ),
          },
        ]}
      />
    </main>
  );
}
