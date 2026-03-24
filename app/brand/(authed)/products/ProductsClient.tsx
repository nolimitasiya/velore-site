"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

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
function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white"
      aria-hidden="true"
    />
  );
}

function DangerConfirmModal(props: {
  open: boolean;
  title: string;
  description: ReactNode;
  phrase: string; // exact phrase required
  confirmLabel?: string;
  busy?: boolean;
  value: string;
  setValue: (v: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const {
    open,
    title,
    description,
    phrase,
    confirmLabel = "Delete",
    busy = false,
    value,
    setValue,
    onClose,
    onConfirm,
  } = props;

  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (open) {
      setShake(false);
      // optional: clear input when modal opens
      // setValue("");
    }
  }, [open]);

  if (!open) return null;

  const canConfirm = value.trim() === phrase;

  return (
    <>
      {/* Backdrop (click to close) */}
      <div
        className="fixed inset-0 z-50 bg-black/40 veilora-fade-in"
        onClick={() => !busy && onClose()}
      />

      {/* Centered modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={[
            "w-full max-w-md rounded-2xl border-2 border-red-300 bg-white p-5 shadow-xl",
            "veilora-pop-in",
            shake ? "veilora-shake" : "",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()} // prevent backdrop close
        >
          <div className="text-lg font-semibold text-red-700">{title}</div>

          <div className="mt-2 text-sm text-black/70">{description}</div>

          <div className="mt-4">
            <div className="text-xs font-medium text-black/60 mb-1">
              Type{" "}
              <span className="font-semibold text-red-700">
                {phrase}
              </span>{" "}
              to confirm
            </div>

            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={phrase}
              autoFocus
              disabled={busy}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  if (!canConfirm) {
                    setShake(true);
                    window.setTimeout(() => setShake(false), 350);
                    return;
                  }
                  await onConfirm();
                }
              }}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={!canConfirm || busy}
              onClick={async () => {
                if (!canConfirm) {
                  setShake(true);
                  window.setTimeout(() => setShake(false), 350);
                  return;
                }
                await onConfirm();
              }}
            >
              {busy ? <Spinner /> : null}
              {busy ? "Deleting..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Animations (no Tailwind plugin needed) */}
      <style jsx global>{`
        .veilora-fade-in {
          animation: veiloraFadeIn 160ms ease-out both;
        }
        .veilora-pop-in {
          animation: veiloraPopIn 180ms ease-out both;
        }
        .veilora-shake {
          animation: veiloraShake 320ms ease-in-out both;
        }

        @keyframes veiloraFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes veiloraPopIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes veiloraShake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

export default function ProductsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | Status>("all");

  const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllText, setDeleteAllText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
const [deleteSelectedText, setDeleteSelectedText] = useState("");
const [deleteOneOpen, setDeleteOneOpen] = useState(false);
const [deleteOneId, setDeleteOneId] = useState<string | null>(null);
const [deleteOneTitle, setDeleteOneTitle] = useState("");
const [deleteOneText, setDeleteOneText] = useState("");
const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

const selectedIds = useMemo(
  () => Object.keys(selected).filter((id) => selected[id]),
  [selected]
);

function toggleSelected(id: string) {
  setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
}

function clearSelected() {
  setSelected({});
}


  // ✅ selection state MUST be inside component


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
    clearSelected();
    load();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((p) => p.status === tab);
  }, [rows, tab]);

 useEffect(() => {
  if (deleteSelectedOpen && selectedIds.length === 0) {
    setDeleteSelectedOpen(false);
  }
}, [deleteSelectedOpen, selectedIds.length]);

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
        setError(j?.fields?.length ? `${j.error}\n• ${j.fields.join("\n• ")}` : (j?.error ?? `Failed (${r.status})`));
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>}

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

      {/* Bulk actions */}
            {/* Bulk actions (right aligned) */}
      <div className="flex items-center justify-end gap-2">
      <button
  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
  disabled={selectedIds.length === 0 || bulkBusy}
  onClick={() => {
    setDeleteSelectedText("");
    setDeleteSelectedOpen(true);
  }}
>
  Delete selected ({selectedIds.length})
</button>

        <button
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
          disabled={rows.length === 0 || bulkBusy}
          onClick={() => {
            setDeleteAllText("");
            setDeleteAllOpen(true);
          }}
        >
          Delete all
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-2xl border overflow-hidden">
            <div className="relative aspect-[4/5] bg-black/5">
              {/* ✅ checkbox overlay must be inside this relative container */}
              <div className="absolute top-2 right-2 z-10">
                <label className="inline-flex items-center gap-2 rounded-lg bg-white/90 px-2 py-1 text-xs border">
                  <input
                    type="checkbox"
                    checked={!!selected[p.id]}
                    onChange={() => toggleSelected(p.id)}
                  />
                  Select
                </label>
              </div>

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
                    p.status === "APPROVED" ||
                    p.status === "REJECTED"
                  }
                  onClick={() => submit(p.id)}
                >
                  {busyId === p.id ? "Submitting..." : "Submit for review"}
                </button>

               <button
  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
  disabled={deleteBusyId === p.id || bulkBusy}
  onClick={() => {
    setDeleteOneId(p.id);
    setDeleteOneTitle(p.title);
    setDeleteOneText("");
    setDeleteOneOpen(true);
  }}
>
  Delete
</button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && !error && (
          <div className="text-sm text-black/60">No products in this tab.</div>
        )}
      </div>

  
{/* ✅ Delete selected modal */}
<DangerConfirmModal
  open={deleteSelectedOpen}
  title="Delete selected products"
  description={
    <>
      This will permanently delete <b>{selectedIds.length}</b> selected product(s). This cannot be undone.
    </>
  }
  phrase="DELETE"
  confirmLabel={`Delete selected (${selectedIds.length})`}
  busy={bulkBusy}
  value={deleteSelectedText}
  setValue={setDeleteSelectedText}
  onClose={() => !bulkBusy && setDeleteSelectedOpen(false)}
  onConfirm={async () => {
    setBulkBusy(true);
    setError(null);

    try {
      const r = await fetch("/api/brand/products/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setError(j?.error ?? "Failed to delete");
        return;
      }

      clearSelected();
      await load();
      setDeleteSelectedOpen(false);
    } finally {
      setBulkBusy(false);
    }
  }}
/>

{/* ✅ Delete ONE modal */}
<DangerConfirmModal
  open={deleteOneOpen && !!deleteOneId}
  title="Delete product"
  description={
    <>
      This will permanently delete <b>{deleteOneTitle}</b>. This cannot be undone.
    </>
  }
  phrase="DELETE"
  confirmLabel="Delete"
  busy={deleteBusyId === deleteOneId}
  value={deleteOneText}
  setValue={setDeleteOneText}
  onClose={() => {
  if (deleteBusyId === deleteOneId) return;
  setDeleteOneOpen(false);
  setDeleteOneId(null);
  setDeleteOneTitle("");
  setDeleteOneText("");
}}
  onConfirm={async () => {
    if (!deleteOneId) return;

    setDeleteBusyId(deleteOneId);
    setError(null);

    try {
      const r = await fetch(`/api/brand/products/${deleteOneId}/delete`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setError(j?.error ?? "Failed to delete");
        return;
      }

      setSelected((prev) => {
        const next = { ...prev };
        delete next[deleteOneId];
        return next;
      });

      await load();
      setDeleteOneOpen(false);
    } finally { setDeleteBusyId(null); }
  }}
/>

{/* ✅ Delete ALL modal */}
<DangerConfirmModal
  open={deleteAllOpen}
  title="Delete ALL products"
  description={
    <>
      This will permanently delete <b>ALL</b> products for this brand. This cannot be undone.
    </>
  }
  phrase="DELETE ALL"
  confirmLabel="Delete all"
  busy={bulkBusy}
  value={deleteAllText}
  setValue={setDeleteAllText}
  onClose={() => !bulkBusy && setDeleteAllOpen(false)}
  onConfirm={async () => {
    setBulkBusy(true);
    setError(null);

    try {
      const r = await fetch("/api/brand/products/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setError(j?.error ?? "Failed to delete all");
        return;
      }

      clearSelected();
      await load();
      setDeleteAllOpen(false);
    } finally {
      setBulkBusy(false);
    }
  }}
/>
    </div>
  );
}