"use client";

import { useEffect, useState } from "react";

type ReqType = "MATERIAL" | "COLOUR" | "SIZE";
type ProductType = "ABAYA" | "DRESS" | "SKIRT" | "TOP" | "HIJAB" | "ACTIVEWEAR";

const PRODUCT_TYPES: ProductType[] = ["HIJAB", "ABAYA", "DRESS", "TOP", "SKIRT", "ACTIVEWEAR"];

type Item = {
  id: string;
  type: ReqType;
  name: string;
  slug: string;
  reason: string | null;
  createdAt: string;
  brand: { id: string; name: string; slug: string };
  user: { id: string; email: string; name: string | null };

  reviewedAt?: string | null;
  reviewNote?: string | null;
  reviewedByAdmin?: { id: string; email: string; name: string | null } | null;
};

type TaxItem = { id: string; name: string; slug: string };

// ------------------------
// Duplicate helpers
// ------------------------
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokens(s: string) {
  return norm(s).split(" ").filter(Boolean);
}
function jaccard(a: string[], b: string[]) {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = new Set([...A, ...B]).size;
  return uni ? inter / uni : 0;
}
function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
function findDupes(existing: { name: string; slug: string }[], needleName: string, needleSlug: string) {
  const nName = norm(needleName);
  const nSlug = norm(needleSlug);
  const nt = tokens(needleName);

  const scored = existing.map((x) => {
    const xName = norm(x.name);
    const xSlug = norm(x.slug);
    const xt = tokens(x.name);

    let score = 0;
    if (xSlug === nSlug && nSlug) score += 100;
    if (xName.includes(nName) || nName.includes(xName)) score += 20;
    score += jaccard(nt, xt) * 30;

    const d = levenshtein(xName.replace(/ /g, ""), nName.replace(/ /g, ""));
    if (d <= 2) score += 15;
    if (d === 0) score += 20;

    return { ...x, score };
  });

  return scored
    .filter((x) => x.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ------------------------
// Suggest product types for material approval
// ------------------------
function suggestProductTypes(input: { name: string; reason?: string | null }): ProductType[] {
  const text = `${input.name} ${input.reason ?? ""}`.toLowerCase();

  const score: Record<ProductType, number> = {
    HIJAB: 0,
    ABAYA: 0,
    DRESS: 0,
    TOP: 0,
    SKIRT: 0,
    ACTIVEWEAR: 0,
  };

  const add = (pt: ProductType, n = 1) => (score[pt] += n);

  if (/(hijab|scarf|khimar|shayla)/.test(text)) add("HIJAB", 3);
  if (/(abaya|jilbab|kaftan)/.test(text)) add("ABAYA", 3);
  if (/(dress|maxi|gown)/.test(text)) add("DRESS", 2);
  if (/(skirt)/.test(text)) add("SKIRT", 2);
  if (/(top|blouse|shirt|tunic)/.test(text)) add("TOP", 2);
  if (/(activewear|gym|sport|workout|training)/.test(text)) add("ACTIVEWEAR", 3);

  if (/(chiffon|crinkle chiffon)/.test(text)) add("HIJAB", 2), add("DRESS", 1);
  if (/(jersey)/.test(text)) add("HIJAB", 2), add("ACTIVEWEAR", 1);
  if (/(modal|viscose)/.test(text)) add("HIJAB", 1), add("DRESS", 1), add("TOP", 1);
  if (/(cotton)/.test(text)) add("HIJAB", 1), add("DRESS", 1), add("TOP", 1);
  if (/(silk|satin)/.test(text)) add("HIJAB", 1), add("DRESS", 2), add("ABAYA", 1);

  const ranked = (Object.keys(score) as ProductType[])
    .sort((a, b) => score[b] - score[a])
    .filter((pt) => score[pt] > 0);

  return ranked.length ? ranked.slice(0, 3) : ["HIJAB"];
}

export default function RequestsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // approve modal state (only used for MATERIAL)
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveItem, setApproveItem] = useState<Item | null>(null);
  const [selectedPTs, setSelectedPTs] = useState<ProductType[]>(["HIJAB"]);

  // reject modal state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<Item | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // dupe cache
  const [taxCache, setTaxCache] = useState<Record<ReqType, TaxItem[]>>({
    MATERIAL: [],
    COLOUR: [],
    SIZE: [],
  });

  async function load() {
    setErr(null);
    const r = await fetch(`/api/admin/taxonomy/requests?status=${status}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      setErr(j?.error ?? `Failed (${r.status})`);
      return;
    }
    setItems(Array.isArray(j.items) ? j.items : []);
  }

  async function loadTaxCache() {
    try {
      const [m, c, s] = await Promise.all([
        fetch("/api/admin/taxonomy/lookup?type=MATERIAL", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/taxonomy/lookup?type=COLOUR", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/taxonomy/lookup?type=SIZE", { cache: "no-store" }).then((r) => r.json()),
      ]);

      setTaxCache({
        MATERIAL: Array.isArray(m?.items) ? m.items : [],
        COLOUR: Array.isArray(c?.items) ? c.items : [],
        SIZE: Array.isArray(s?.items) ? s.items : [],
      });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    loadTaxCache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approveSimple(id: string) {
    setBusyId(id);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/taxonomy/requests/${id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setErr(j?.error ?? `Failed (${r.status})`);
        return;
      }
      await load();
      await loadTaxCache(); // keep dupes accurate after approve
    } finally {
      setBusyId(null);
    }
  }

  async function approveMaterialWithPTs() {
    if (!approveItem) return;
    const id = approveItem.id;

    setBusyId(id);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/taxonomy/requests/${id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productTypes: selectedPTs }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setErr(j?.error ?? `Failed (${r.status})`);
        return;
      }
      setApproveOpen(false);
      setApproveItem(null);
      await load();
      await loadTaxCache(); // keep dupes accurate after approve
    } finally {
      setBusyId(null);
    }
  }

  function openApprove(item: Item) {
    if (item.type === "MATERIAL") {
      setApproveItem(item);
      setSelectedPTs(suggestProductTypes({ name: item.name, reason: item.reason }));
      setApproveOpen(true);
      return;
    }
    approveSimple(item.id);
  }

  function openReject(item: Item) {
    setRejectItem(item);
    setRejectNote("");
    setRejectOpen(true);
  }

  async function rejectWithNote() {
    if (!rejectItem) return;
    const id = rejectItem.id;

    setBusyId(id);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/taxonomy/requests/${id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewNote: rejectNote.trim() || null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setErr(j?.error ?? `Failed (${r.status})`);
        return;
      }
      setRejectOpen(false);
      setRejectItem(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {err && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      <div className="flex gap-2">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setSelected({});
            }}
            className={`rounded-lg border px-3 py-2 text-xs ${
              status === s ? "bg-black text-white border-black" : "hover:bg-black/5"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-black/5 p-3 text-xs font-medium">
          <div className="col-span-2">Type</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Brand</div>
          <div className="col-span-2">Requested by</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {items.length === 0 ? (
          <div className="p-4 text-sm text-black/60">No requests.</div>
        ) : (
          items.map((it) => {
            const dupes =
              status === "PENDING" ? findDupes(taxCache[it.type] || [], it.name, it.slug) : [];

            return (
              <div key={it.id} className="grid grid-cols-12 gap-2 p-3 text-sm border-t">
                <div className="col-span-2">
                  <span className="inline-flex rounded-full border px-2 py-1 text-xs">{it.type}</span>
                </div>

                <div className="col-span-3">
                  <div className="font-medium">{it.name}</div>
                  {it.reason && <div className="text-xs text-black/60">{it.reason}</div>}

                  {dupes.length > 0 && (
                    <div className="mt-1 text-xs text-amber-800">
                      Possible duplicate{dupes.length > 1 ? "s" : ""}:{" "}
                      <span className="font-medium">{dupes.map((d) => d.name).join(", ")}</span>
                    </div>
                  )}

                  {status !== "PENDING" && (
                    <div className="mt-2 text-xs text-black/60">
                      {it.reviewNote ? (
                        <>
                          <span className="font-medium">Admin note:</span> {it.reviewNote}
                        </>
                      ) : (
                        <span className="text-black/40">No admin note.</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="col-span-3">
                  <div className="font-medium">{it.brand.name}</div>
                  <div className="text-xs text-black/60">{it.brand.slug}</div>
                </div>

                <div className="col-span-2">
                  <div className="text-xs text-black/60">{it.user.email}</div>
                  {it.user.name && <div className="text-xs text-black/60">{it.user.name}</div>}
                </div>

                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    className="rounded-lg bg-black px-3 py-2 text-xs text-white disabled:opacity-60"
                    disabled={busyId === it.id || status !== "PENDING"}
                    onClick={() => openApprove(it)}
                  >
                    {busyId === it.id ? "..." : "Approve"}
                  </button>

                  <button
                    className="rounded-lg border px-3 py-2 text-xs hover:bg-black/5 disabled:opacity-60"
                    disabled={busyId === it.id || status !== "PENDING"}
                    onClick={() => openReject(it)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MATERIAL approve modal */}
      {approveOpen && approveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Approve material</div>
                <div className="text-xs text-black/60">
                  Choose which product types can use: <span className="font-medium">{approveItem.name}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setApproveOpen(false);
                  setApproveItem(null);
                }}
                className="text-sm text-black/60 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {PRODUCT_TYPES.map((pt) => {
                const checked = selectedPTs.includes(pt);
                return (
                  <label key={pt} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPTs((xs) => Array.from(new Set([...xs, pt])));
                        else setSelectedPTs((xs) => xs.filter((x) => x !== pt));
                      }}
                    />
                    {pt}
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-black/5"
                onClick={() => {
                  setApproveOpen(false);
                  setApproveItem(null);
                }}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
                disabled={busyId === approveItem.id || selectedPTs.length === 0}
                onClick={approveMaterialWithPTs}
              >
                {busyId === approveItem.id ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectOpen && rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Reject request</div>
                <div className="text-xs text-black/60">
                  Add a note (optional) that you and the brand can see later.
                </div>
              </div>
              <button
                onClick={() => {
                  setRejectOpen(false);
                  setRejectItem(null);
                }}
                className="text-sm text-black/60 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-sm">
                <span className="font-medium">{rejectItem.type}</span>: {rejectItem.name}
              </div>

              <textarea
                className="w-full rounded-lg border p-3 text-sm"
                rows={4}
                placeholder="e.g. Already exists as 'Blue', please use the existing option."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-lg border px-4 py-2 text-sm hover:bg-black/5"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectItem(null);
                }}
                disabled={busyId === rejectItem.id}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
                onClick={rejectWithNote}
                disabled={busyId === rejectItem.id}
              >
                {busyId === rejectItem.id ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}