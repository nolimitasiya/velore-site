"use client";

export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { AdminTable } from "@/components/admin/AdminTable";
import { formatDateTime, formatRelativeTime, getUserLocale, getUserTimeZone } from "@/lib/adminTime";
import { AdminHeader } from "@/components/admin/AdminHeader";



type Row = Record<string, string>;

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);

  const [syncMissing, setSyncMissing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);


  const [previewRows, setPreviewRows] = useState<Row[]>([]);
  const [previewCols, setPreviewCols] = useState<string[]>([]);

  const [validation, setValidation] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState("en-GB");
  const [tz, setTz] = useState("UTC");


  const token = process.env.NEXT_PUBLIC_ADMIN_IMPORT_TOKEN ?? "";


 const templateCsv = useMemo(() => {
  const header = [
    "brand_slug","brand_name","product_slug","product_name","product_url",
    "image_url_1","image_url_2","image_url_3","image_url_4",
    "category_slug","occasion_slug","material_slug",
    "tags","badges","note","price","currency","colour","stock","shipping_region",
  ];

  const example = [
    {
      brand_slug: "velore",
      brand_name: "Vélore",
      product_slug: "abaya_satin_black",
      product_name: "Satin Abaya (Black)",
      product_url: "https://brand.com/products/abaya",
      image_url_1: "https://brand.com/img/1.jpg",
      image_url_2: "https://brand.com/img/2.jpg",
      image_url_3: "",
      image_url_4: "",
      category_slug: "abayas",
      occasion_slug: "everyday",
      material_slug: "satin",
      tags: "fully-modest,workwear",
      badges: "new_in,editor_pick",
      note: "Short note",
      price: "89.99",
      currency: "GBP",
      colour: "Black",
      stock: "10",
      shipping_region: "UK,EU,CH",
    },
  ];

  // ✅ This will quote comma-containing fields correctly
  return Papa.unparse(example, { columns: header, quotes: true });
}, []);


  function downloadTemplate() {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dalra_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadHistory() {
    const r = await fetch("/api/admin/import/history");
    const j = await r.json();
    if (j?.ok) setHistory(j.jobs ?? []);
  }

  useEffect(() => {
    loadHistory();
  }, []);
  useEffect(() => {
  setLocale(getUserLocale());
  setTz(getUserTimeZone());
}, []);


  async function validateFile(f: File) {
    setBusy(true);
    setError(null);
    setValidation(null);
    setImportResult(null);

    const fd = new FormData();
    fd.append("file", f);

    const r = await fetch("/api/admin/import/validate", {
      method: "POST",
      headers: { "x-admin-token": token },
      body: fd,
    });

    const j = await r.json();
    if (!r.ok) {
      setError(j?.error ?? "Validation failed");
      setBusy(false);
      return;
    }

    setValidation(j);
    setBusy(false);
  }

  async function runImport() {
  if (!file) return;

  setBusy(true);
  setError(null);
  setImportResult(null);

  const fd = new FormData();
  fd.append("file", file);
  fd.append("syncMissing", syncMissing ? "1" : "0");

  const r = await fetch("/api/admin/import", {
    method: "POST",
    headers: { "x-admin-token": token },
    body: fd,
  });

  const j = await r.json();
  setImportResult(j);

  if (!r.ok) setError(j?.error ?? "Import failed");

  if (j?.ok) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  setBusy(false);
  loadHistory();
}


  function handleFile(f: File) {
    setFile(f);
    setConfirmOpen(false);
    setSyncMissing(false);
    setError(null);
    setValidation(null);
    setImportResult(null);

    // local preview
    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data ?? []).slice(0, 20);
        setPreviewRows(rows);
        setPreviewCols(rows[0] ? Object.keys(rows[0]) : []);
      },
    });

    // server validation (authoritative)
    validateFile(f);
  }

  const canImport =
    validation?.ok && (validation.summary?.invalid ?? 1) === 0 && !!file;

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <AdminHeader />
        <h1 className="text-2xl font-semibold"> Import</h1>
        <button
          onClick={downloadTemplate}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Download CSV Template
        </button>
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        
  <label
  htmlFor="csvFile"
  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-black/5"
>
  📂 Upload CSV
</label>

<input
  id="csvFile"
  type="file"
  accept=".csv"
  className="hidden"
  onChange={(e) => {
  const f = e.target.files?.[0] ?? null;
  if (f) handleFile(f);
}}

/>

{file && (
  <>
    <div className="text-sm text-black/60">
      Selected file: <span className="font-medium">{file.name}</span>
    </div>
    <div className="text-xs text-black/50">
      Tip: if you edited the CSV in Excel, <span className="font-medium">save and close it</span> before Re-validate or Import. Otherwise upload can fail.
    </div>
  </>
)}




        <div className="flex flex-wrap gap-2">
  <button
    onClick={() => canImport && setConfirmOpen(true)}
    disabled={!canImport || busy}
    className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
  >
    {busy ? "Working..." : "Import to DB"}
  </button>

  <button
    onClick={() => file && validateFile(file)}
    disabled={!file || busy}
    className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
  >
    Re-validate
  </button>
</div>

<label className="flex items-center gap-2 text-sm text-black/70">
  <input
    type="checkbox"
    checked={syncMissing}
    onChange={(e) => setSyncMissing(e.target.checked)}
  />
  Deactivate missing products (brand sync)

</label>


        <div className="text-sm text-black/60">
          Upload → validate → Import button unlocks when invalid = 0.
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="rounded-2xl border p-4">
          <div className="font-medium mb-3">Preview (first {previewRows.length} rows)</div>
          <div className="overflow-auto">
            <table className="min-w-[900px] text-sm">
              <thead>
                <tr className="border-b">
                  {previewCols.map((k) => (
                    <th key={k} className="p-2 text-left">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-b">
                    {previewCols.map((k) => (
                      <td key={k} className="p-2 whitespace-nowrap">{r[k]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation */}
      {validation && (
  <div className="rounded-2xl border p-4 space-y-3">
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">Validation summary</div>
        <div className="text-sm text-gray-600">
          Total: {validation.summary?.total} • Valid: {validation.summary?.valid} • Invalid:{" "}
          {validation.summary?.invalid}
        </div>
      </div>

      <div className="text-sm flex items-center gap-2">
  <span
    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${
      canImport ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
    }`}
  >
    {canImport ? "✅ Ready to import" : "❌ Fix invalid rows first"}
  </span>
</div>

    </div>

    {!!validation?.warnings?.length && (
      <div className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
        <div className="font-medium mb-1">
          Warnings (first {Math.min(20, validation.warnings.length)})
        </div>
        <ul className="list-disc pl-5">
          {validation.warnings.slice(0, 20).map((w: any, i: number) => (
            <li key={i}>
              Row {w.row}: {w.warning}
            </li>
          ))}
        </ul>
      </div>
    )}

    {!!validation.rowErrors?.length && (
      <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
        <div className="font-medium mb-1">
          Errors (showing first {Math.min(20, validation.rowErrors.length)})
        </div>
        <ul className="list-disc pl-5">
          {validation.rowErrors.slice(0, 20).map((e: any, idx: number) => (
            <li key={idx}>
              Row {e.row}: {e.error}
            </li>
          ))}
        </ul>
      </div>
    )}

  
  </div>
)}


      {/* Import Result */}
      {importResult?.ok && (
  <div className="rounded-2xl border p-4 bg-emerald-50">
    <div className="font-medium text-emerald-900">✅ Imported to DB</div>
    <div className="text-sm text-emerald-800 mt-1">
      Total: <b>{importResult.results?.total ?? "-"}</b> • Created:{" "}
      <b>{importResult.results?.createdProducts ?? 0}</b> • Updated:{" "}
      <b>{importResult.results?.updatedProducts ?? 0}</b>
    </div>
  </div>
)}

{importResult && !importResult.ok && (
  <div className="rounded-2xl border p-4 bg-red-50">
    <div className="font-medium text-red-900">❌ Import failed</div>
    <div className="text-sm text-red-800 mt-1">{importResult.error ?? "Unknown error"}</div>
  </div>
)}


      {/* History */}
      <div className="rounded-2xl border p-4">
        <div className="font-medium mb-3">Recent imports</div>
        <AdminTable
  rows={history}
  rowKey={(h) => h.id}
  emptyText="No imports yet."
  columns={[
    {
      header: "Time",
      cell: (h: any) => (
        <div className="leading-tight">
          <div className="font-medium">
            {formatRelativeTime(h.createdAt, locale)}
          </div>
          <div className="text-xs text-black/60">
            {formatDateTime(h.createdAt, {
              locale,
              timeZone: tz,
              dateStyle: "medium",
              timeStyle: "short",
              showTimeZoneLabel: true,
              timeZoneLabelStyle: "pretty",
            })}
          </div>
        </div>
      ),
    },
    { header: "File", cell: (h: any) => h.filename ?? "-" },
    { header: "Status", cell: (h: any) => h.status },
    { header: "Total", cell: (h: any) => String(h.total ?? "-") },
    { header: "Invalid", cell: (h: any) => String(h.invalid ?? "-") },
    { header: "Created", cell: (h: any) => String(h.createdProducts ?? "-") },
    { header: "Updated", cell: (h: any) => String(h.updatedProducts ?? "-") },
  ]}
/>
      </div>

      
      {confirmOpen && validation?.summary?.willCreate !== undefined && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
      <div className="text-lg font-semibold">Confirm import</div>

      <div className="text-sm mt-2 text-black/70">
        You are about to import <b>{validation.summary.total}</b> products:
        <ul className="list-disc pl-5 mt-2">
          <li><b>{validation.summary.willCreate}</b> new</li>
          <li><b>{validation.summary.willUpdate}</b> updates</li>
        </ul>

        {syncMissing && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">
            <div className="font-medium">Brand sync enabled</div>
            <div className="text-sm mt-1">
              Products from this brand that are NOT in the CSV will be set to inactive.
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => setConfirmOpen(false)}
          className="rounded-lg border px-4 py-2 text-sm"
          disabled={busy}
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            setConfirmOpen(false);
            await runImport();
          }}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "Working..." : "Confirm import"}
        </button>
      </div>
    </div>
  </div>
)}

    </main>
  );
}
