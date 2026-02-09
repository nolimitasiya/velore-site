"use client";

// app/admin/products/page.tsx
export const dynamic = "force-dynamic";

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_IMPORT_TOKEN ?? "";

import { useEffect, useMemo, useState } from "react";
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
  price: string | null; // Prisma Decimal serializes to string in JSON
  currency: "GBP" | "EUR" | "CHF" | "USD";
  isActive: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  brand: { name: string; slug: string };

  status: Status;
  submittedAt: string | null;
  reviewNote: string | null;
  lastApprovedAt: string | null;
};

function statusPill(status: Status) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "PENDING_REVIEW":
      return "bg-yellow-50 text-yellow-800 border-yellow-200";
    case "NEEDS_CHANGES":
      return "bg-orange-50 text-orange-800 border-orange-200";
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-black/5 text-black/70 border-black/10";
  }
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

  // Inline review UI state
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({}); // per-product textarea

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
    const j = await r.json().catch(() => ({}));

    if (!r.ok || !j.ok) {
      setError(j?.error ?? "Failed to load products");
      setBusy(false);
      return;
    }

    setRows(j.products ?? []);
    setBrands(j.brands ?? []);

    // Initialize note drafts with existing notes (so admin can edit quickly)
    const init: Record<string, string> = {};
    for (const p of (j.products ?? []) as ProductRow[]) {
      init[p.id] = p.reviewNote ?? "";
    }
    setNoteDraft(init);

    setBusy(false);
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

    // Update row in-place (no full reload needed)
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

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Products</h1>
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

                {/* Status pill */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusPill(p.status)}`}>
                    {p.status.replace("_", " ")}
                  </span>

                  {p.submittedAt && (
                    <span className="text-xs text-black/60">
                      Submitted {formatRelativeTime(p.submittedAt, locale)}
                    </span>
                  )}

                  {p.lastApprovedAt && (
                    <span className="text-xs text-black/60">
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
            cell: (p) => {
              const canPublish = p.status === "APPROVED";
              const isPublished = Boolean(p.publishedAt);

              return (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                      isPublished
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-black/5 text-black/70 border-black/10"
                    }`}
                  >
                    {isPublished ? "Published" : "Draft"}
                  </span>

                  <button
                    className="rounded-lg border px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-50"
                    disabled={busy || (!canPublish && !isPublished)} // allow unpublish anytime
                    onClick={() => setProductPublished(p.id, !isPublished)}
                    title={!canPublish && !isPublished ? "Approve the product before publishing" : ""}
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
          {
            header: "Review",
            cell: (p) => {
              const disabled = busyId === p.id || busy;
              const note = noteDraft[p.id] ?? "";

              return (
                <div className="min-w-[280px] space-y-2">
                  <textarea
                    value={note}
                    onChange={(e) =>
                      setNoteDraft((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    placeholder="Review note (required for Needs changes / Reject)"
                    className="w-full rounded-lg border px-3 py-2 text-xs"
                    rows={3}
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={disabled}
                      onClick={() => reviewProduct(p.id, "approve")}
                      className="rounded-lg border px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50"
                      title="Approve product (brand can be published after)"
                    >
                      {busyId === p.id ? "…" : "Approve"}
                    </button>

                    <button
                      disabled={disabled}
                      onClick={() => reviewProduct(p.id, "needs_changes")}
                      className="rounded-lg border px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50"
                      title="Send back to brand with note"
                    >
                      Needs changes
                    </button>

                    <button
                      disabled={disabled}
                      onClick={() => reviewProduct(p.id, "reject")}
                      className="rounded-lg border px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50"
                      title="Reject product with note"
                    >
                      Reject
                    </button>
                  </div>

                  {p.reviewNote && (p.status === "NEEDS_CHANGES" || p.status === "REJECTED") && (
                    <div className="rounded-lg border border-black/10 bg-black/5 p-2 text-xs text-black/80">
                      <div className="font-medium mb-1">Last note sent</div>
                      <div className="line-clamp-3">{p.reviewNote}</div>
                    </div>
                  )}
                </div>
              );
            },
          },
        ]}
      />
    </main>
  );
}
