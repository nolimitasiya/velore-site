"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { AdminTable } from "@/components/admin/AdminTable";
import {
  formatDateTime,
  formatRelativeTime,
  getUserLocale,
  getUserTimeZone,
} from "@/lib/adminTime";

type Row = Record<string, string>;

type Props = {
  title?: string;
  mode: "admin" | "brand";
  validateUrl: string;
  importUrl: string;
  historyUrl: string;
  requireToken?: boolean;
  tokenEnvVarName?: string; // only used for admin
};

export default function ImportClient({
  title = "Import",
  mode,
  validateUrl,
  importUrl,
  historyUrl,
  requireToken = false,
  tokenEnvVarName = "NEXT_PUBLIC_ADMIN_IMPORT_TOKEN",
}: Props) {
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewNote, setPreviewNote] = useState<string | null>(null);

  const token =
    requireToken && mode === "admin"
      ? (process.env as any)[tokenEnvVarName] ?? process.env.NEXT_PUBLIC_ADMIN_IMPORT_TOKEN ?? ""
      : "";

      const templateCsv = useMemo(() => {
    // ✅ BRAND SIMPLE TEMPLATE (4 columns only)
    const brandHeader = ["product_slug", "product_name", "source_url", "image_url"];

    const brandExample = [
      {
        product_slug: "abaya_satin_black",
        product_name: "Satin Abaya (Black)",
        source_url: "https://brand.com/products/abaya",
        image_url: "https://brand.com/img/1.jpg",
      },
    ];

    // ✅ ADMIN: keep current advanced template so you don't break admin imports
    const commonAdvanced = [
      "product_slug",
      "product_name",
      "source_url",
      "image_url_1",
      "image_url_2",
      "image_url_3",
      "image_url_4",
      "category_slug",
      "occasion_slug",
      "material_slug",
      "tags",
      "badges",
      "note",
      "price",
      "currency",
      "colour",
      "stock",
      "shipping_region",
      "affiliate_url",
    ];

    const adminHeader = ["brand_slug", "brand_name", ...commonAdvanced];

    const adminExample = [
      {
        brand_slug: "veilora_club",
        brand_name: "Veilora Club",
        product_slug: "abaya_satin_black",
        product_name: "Satin Abaya (Black)",
        source_url: "https://brand.com/products/abaya",
        image_url_1: "https://brand.com/img/1.jpg",
        image_url_2: "",
        image_url_3: "",
        image_url_4: "",
        category_slug: "abayas",
        occasion_slug: "",
        material_slug: "satin",
        tags: "fully-modest,workwear",
        badges: "new_in,editor_pick",
        note: "Short note",
        price: "89.99",
        currency: "GBP",
        colour: "Black",
        stock: "10",
        shipping_region: "UK,EU,CH",
        affiliate_url: "",
      },
    ];

    if (mode === "admin") {
      return Papa.unparse(adminExample, { columns: adminHeader, quotes: true });
    }

    return Papa.unparse(brandExample, { columns: brandHeader, quotes: true });
  }, [mode]);


  function downloadTemplate() {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "admin"
  ? "veilora_admin_import_template.csv"
  : "veilora_brand_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildHeaders() {
    const headers: Record<string, string> = {};
    if (requireToken && token) headers["x-admin-token"] = token;
    return headers;
  }

  async function loadHistory() {
    const r = await fetch(historyUrl, { headers: buildHeaders() });
    const j = await r.json().catch(() => ({}));
    if (j?.ok) setHistory(j.jobs ?? []);
  }

  useEffect(() => {
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    const r = await fetch(validateUrl, {
      method: "POST",
      headers: buildHeaders(),
      body: fd,
    });

    const j = await r.json().catch(() => ({}));
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

    const r = await fetch(importUrl, {
      method: "POST",
      headers: buildHeaders(),
      body: fd,
    });

    const j = await r.json().catch(() => ({}));
    setImportResult(j);

    if (!r.ok) setError(j?.error ?? "Import failed");

    if (j?.ok) window.scrollTo({ top: 0, behavior: "smooth" });

    setBusy(false);
    loadHistory();
  }

  function isXlsxFile(f: File) {
  const name = (f?.name ?? "").toLowerCase();
  return name.endsWith(".xlsx");
}

  function handleFile(f: File) {
  setFile(f);
  setConfirmOpen(false);
  setSyncMissing(false);
  setError(null);
  setValidation(null);
  setImportResult(null);

  // ✅ Preview handling
  if (isXlsxFile(f)) {
    // XLSX cannot be Papa-parsed; skip preview
    setPreviewRows([]);
    setPreviewCols([]);
    setPreviewNote("Preview is only available for CSV files. XLSX upload is supported and will still validate/import.");
  } else {
    setPreviewNote(null);

    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (res) => {
        const rows = (res.data ?? []).slice(0, 20);
        setPreviewRows(rows);
        setPreviewCols(rows[0] ? Object.keys(rows[0]) : []);
      },
    });
  }

  validateFile(f);
}

const canImport =
validation?.ok && (validation.summary?.invalid ?? 1) === 0 && !!file;

const requiredBrandFields = ["product_slug", "product_name", "source_url", "image_url"] as const;

const emptyRequiredFields =
  mode !== "brand" || previewRows.length === 0
    ? []
    : requiredBrandFields.filter((k) =>
        previewRows.some((r) => !String(r[k] ?? "").trim())
      );

     

  
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <button onClick={downloadTemplate} className="rounded-lg border px-3 py-2 text-sm">
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
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f) handleFile(f);
          }}
        />

               {file && (
          <>
            <div className="text-sm text-black/60 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Selected file: <span className="font-medium">{file.name}</span>
              </span>
              <span className="text-black/40">•</span>
              <span>{(file.size / 1024).toFixed(1)} KB</span>
              <span className="text-black/40">•</span>
              <span className="uppercase">{file.name.split(".").pop()}</span>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewRows([]);
                  setPreviewCols([]);
                  setSyncMissing(false);
                  setConfirmOpen(false);
                  setValidation(null);
                  setImportResult(null);
                  setError(null);
                  setShowAdvanced(false);
                }}
                className="ml-auto rounded-lg border px-3 py-1.5 text-xs hover:bg-black/5"
              >
                Clear file
              </button>
            </div>

            <div className="text-xs text-black/50">
              Tip: if you edited the CSV in Excel, <span className="font-medium">save and close it</span>{" "}
              before Re-validate or Import. Otherwise upload can fail.
            </div>
            {previewNote && (
  <div className="rounded-xl bg-neutral-50 p-3 text-sm text-black/70">
    {previewNote}
  </div>
)}
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

                <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-sm underline underline-offset-4 text-black/70 hover:text-black"
          >
            {showAdvanced ? "Hide advanced options" : "Show advanced options"}
          </button>

          {showAdvanced && (
            <div className="mt-3 rounded-xl border bg-neutral-50 p-3 space-y-2">
              <label className="flex items-start gap-2 text-sm text-black/70">
                <input
                type="checkbox"
                disabled={!validation?.ok || busy}
                  checked={syncMissing}
                  onChange={(e) => setSyncMissing(e.target.checked)}
                />
                <span>
                  <span className="font-medium">Deactivate missing products</span>{" "}
                  <span className="text-black/50">
                    (Anything not included in this file will be set inactive for this brand.)
                  </span>
                </span>
              </label>

              <div className="text-xs text-black/50">
                Use only when your CSV is the “source of truth” full catalogue export.
              </div>
            </div>
          )}
        </div>

        <div className="text-sm text-black/60">
          Upload → validate → Import button unlocks when invalid = 0.
        </div>
        {mode === "brand" && previewRows.length > 0 && emptyRequiredFields.length > 0 && (
  <div className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
    <div className="font-medium">Some rows are missing required values</div>

    <div className="mt-1">
      {emptyRequiredFields.map((m) => (
        <span
          key={m}
          className="mr-2 inline-flex items-center rounded-full border border-yellow-200 bg-white px-2 py-0.5 text-xs"
        >
          {m}
        </span>
      ))}
    </div>

    <div className="mt-2 text-xs text-yellow-900/70">
      Fill these fields for every row, then re-upload.
    </div>
  </div>
)}
                
        
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {previewRows.length > 0 && (
        <div className="rounded-2xl border p-4">
          <div className="font-medium mb-3">Preview (first {previewRows.length} rows)</div>
          <div className="overflow-auto">
            <table className="min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  {previewCols.map((k) => (
                    <th key={k} className="p-2 text-left font-semibold">{k}</th>
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

      {validation && (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">Validation summary</div>
              <div className="text-sm text-gray-600">
                Total: {validation.summary?.total} • Valid: {validation.summary?.valid} • Invalid:{" "}
                {validation.summary?.invalid}
              </div>
              {validation?.summary?.willCreate !== undefined && (
  <div className="mt-2 text-sm text-black/70 space-y-1">
    <div>
      Expected changes:{" "}
      <b>{validation.summary.willCreate}</b> new •{" "}
      <b>{validation.summary.willUpdate}</b> updates
      {typeof validation.summary.willDeactivate === "number" && (
        <>
          {" "}
          • <b>{validation.summary.willDeactivate}</b> will deactivate
        </>
      )}
    </div>

    {/* Duplicate safety (warn-only) */}
    {typeof validation.summary.duplicateSourceUrlsInFile === "number" &&
      validation.summary.duplicateSourceUrlsInFile > 0 && (
        <div className="text-xs text-yellow-900/80">
          Duplicate URLs in file: <b>{validation.summary.duplicateSourceUrlsInFile}</b>. We will use the{" "}
          <b>LAST occurrence</b> for each duplicate.
          {Array.isArray(validation.summary.duplicateExamples) &&
            validation.summary.duplicateExamples.length > 0 && (
              <div className="mt-1">
                Examples:{" "}
                {validation.summary.duplicateExamples.map((u: string) => (
                  <span
                    key={u}
                    className="mr-1 inline-flex items-center rounded-full border border-yellow-200 bg-white px-2 py-0.5 text-[11px]"
                  >
                    {u}
                  </span>
                ))}
              </div>
            )}
          {typeof validation.summary.effectiveRowsAfterDeduping === "number" && (
            <div className="mt-1 text-xs text-yellow-900/70">
              Effective rows after dedupe: <b>{validation.summary.effectiveRowsAfterDeduping}</b>
            </div>
          )}
        </div>
      )}
  </div>
)}
            </div>

            <div className="text-sm flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${
                  canImport
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
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
          <div className="text-sm text-red-800 mt-1">
            {importResult.error ?? "Unknown error"}
          </div>
        </div>
      )}

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
                  <div className="font-medium">{formatRelativeTime(h.createdAt, locale)}</div>
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

              {typeof validation.summary.willDeactivate === "number" && validation.summary.willDeactivate > 0 && (
  <div className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">
    <div className="font-medium">Deactivation warning</div>
    <div className="text-sm mt-1">
      This import will deactivate <b>{validation.summary.willDeactivate}</b> currently active products that are NOT
      in this file.
    </div>
  </div>
)}

{typeof validation.summary.duplicateSourceUrlsInFile === "number" &&
  validation.summary.duplicateSourceUrlsInFile > 0 && (
    <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-yellow-900">
      <div className="font-medium">Duplicate URL safety</div>
      <div className="text-sm mt-1">
        Your file contains <b>{validation.summary.duplicateSourceUrlsInFile}</b> duplicate source URLs.
        We will use the <b>LAST occurrence</b> for each duplicate.
      </div>

      {Array.isArray(validation.summary.duplicateExamples) && validation.summary.duplicateExamples.length > 0 && (
        <div className="mt-2 text-xs">
          Examples:{" "}
          {validation.summary.duplicateExamples.map((u: string) => (
            <span
              key={u}
              className="mr-1 inline-flex items-center rounded-full border border-yellow-200 bg-white px-2 py-0.5 text-[11px]"
            >
              {u}
            </span>
          ))}
        </div>
      )}

      {typeof validation.summary.effectiveRowsAfterDeduping === "number" && (
        <div className="mt-2 text-xs text-yellow-900/70">
          Effective rows after dedupe: <b>{validation.summary.effectiveRowsAfterDeduping}</b>
        </div>
      )}
    </div>
  )}

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
