"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Status = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "NEEDS_CHANGES" | "REJECTED";

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

  status: Status;
  publishedAt: string | null;
  submittedAt: string | null;
  reviewNote: string | null;
};

const TABS: Array<{ key: "all" | Status; label: string }> = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "PENDING_REVIEW", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "NEEDS_CHANGES", label: "Needs changes" },
  { key: "REJECTED", label: "Rejected" },
];

function pillClass(status: Status) {
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

export default function ProductsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | Status>("all");

  async function load() {
    setError(null);
    const r = await fetch("/api/brand/products/list", { cache: "no-store" });
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

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((p) => p.status === tab);
  }, [rows, tab]);

  async function submit(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const r = await fetch(`/api/brand/products/${id}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setError(
    j?.fields?.length ? `${j.error}\n• ${j.fields.join("\n• ")}` : (j?.error ?? `Failed (${r.status})`)
  );
  return;
}
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-700">{error}</div>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1 text-xs ${
              tab === t.key ? "bg-black text-white border-black" : "border-black/10 hover:bg-black/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
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

            <div className="p-3 space-y-2">
              <div className="font-medium line-clamp-2">{p.title}</div>

              <div className="text-sm text-black/70">
                {p.price != null ? `${p.currency ?? ""} ${p.price}` : "Price not set"}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${pillClass(p.status)}`}>
                  {p.status.replace("_", " ")}
                </span>

                {p.publishedAt && p.status === "APPROVED" && (
  <span className="inline-flex rounded-full border px-3 py-1 text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
    Live
  </span>
)}

              </div>

              {/* Review note surfaced for brand */}
              {(p.status === "NEEDS_CHANGES" || p.status === "REJECTED") && p.reviewNote && (
                <div className="text-xs rounded-lg border border-black/10 bg-black/5 p-2 text-black/80">
                  <div className="font-medium mb-1">Admin note</div>
                  <div className="line-clamp-3">{p.reviewNote}</div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/brand/products/${p.id}`}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-black/5"
                >
                  Edit
                </Link>

                <button
                  className="rounded-lg bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  disabled={
                    busyId === p.id ||
                    p.status === "PENDING_REVIEW" ||
                    p.status === "APPROVED" || // optional: require edit -> submit again only if changed
                    p.status === "REJECTED"
                  }

                  onClick={() => submit(p.id)}
                >
                  {busyId === p.id ? "Submitting..." : "Submit for review"}
                </button>

                {p.affiliateUrl && (
                  <a className="text-xs underline text-black/70" href={p.affiliateUrl} target="_blank" rel="noreferrer">
                    View link
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && !error && (
          <div className="text-sm text-black/60">No products in this tab.</div>
        )}
      </div>
    </div>
  );
}
