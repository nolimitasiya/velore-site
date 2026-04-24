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
  tokenEnvVarName?: string;
};

function SectionCard({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-black/6 bg-[linear-gradient(180deg,#fff_0%,#fbf8f2_100%)] px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            {eyebrow ? (
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                {eyebrow}
              </div>
            ) : null}
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-neutral-500">{description}</p>
            ) : null}
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>

      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function SoftButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full bg-black px-4 py-2 text-sm text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function InfoPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
      ? "border-yellow-200 bg-yellow-50 text-yellow-800"
      : "border-black/10 bg-white text-neutral-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${toneClass}`}>
      {children}
    </span>
  );
}

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
    const brandHeader = ["product_slug", "product_name", "source_url", "image_url"];

    const brandExample = [
      {
        product_slug: "abaya_satin_black",
        product_name: "Satin Abaya (Black)",
        source_url: "https://brand.com/products/abaya",
        image_url: "https://brand.com/img/1.jpg",
      },
    ];

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
    a.download =
      mode === "admin"
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

    if (isXlsxFile(f)) {
      setPreviewRows([]);
      setPreviewCols([]);
      setPreviewNote(
        "Preview is only available for CSV files. XLSX upload is supported and will still validate/import."
      );
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

  const requiredBrandFields = [
    "product_slug",
    "product_name",
    "source_url",
    "image_url",
  ] as const;

  const emptyRequiredFields =
    mode !== "brand" || previewRows.length === 0
      ? []
      : requiredBrandFields.filter((k) =>
          previewRows.some((r) => !String(r[k] ?? "").trim())
        );

  return (
    <main className="mx-auto max-w-6xl space-y-8 bg-[#fcfbf8] p-6 md:p-8">
      <section className="overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="border-b border-black/6 bg-[linear-gradient(180deg,#fff_0%,#fbf8f2_100%)] px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                Catalogue import
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                {title}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Upload a CSV or XLSX file, validate it, preview the structure, and import it into the catalogue.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SoftButton onClick={downloadTemplate}>Download CSV template</SoftButton>
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        eyebrow="Step 1"
        title="Upload and validate"
        description="Choose a file, check the validation result, then confirm the import once invalid rows are zero."
      >
        <div className="space-y-5">
          <div className="rounded-[26px] border border-dashed border-black/15 bg-[#fbf8f2] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="csvFile"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 shadow-sm transition hover:bg-black/[0.03]"
              >
                📂 Upload CSV / XLSX
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

              <div className="text-sm text-neutral-500">
                Supported formats: CSV and XLSX
              </div>
            </div>

            {file ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[20px] border border-black/8 bg-white px-4 py-3 text-sm text-neutral-600">
                  <span>
                    Selected file: <span className="font-medium text-neutral-900">{file.name}</span>
                  </span>
                  <span className="text-black/20">•</span>
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                  <span className="text-black/20">•</span>
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
                    className="ml-auto rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-black/[0.03]"
                  >
                    Clear file
                  </button>
                </div>

                <div className="text-xs text-neutral-500">
                  Tip: if you edited the file in Excel, save and close it before re-validating or importing.
                </div>

                {previewNote ? (
                  <div className="rounded-[20px] border border-black/8 bg-white px-4 py-3 text-sm text-neutral-700">
                    {previewNote}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrimaryButton
              onClick={() => canImport && setConfirmOpen(true)}
              disabled={!canImport || busy}
            >
              {busy ? "Working..." : "Import to DB"}
            </PrimaryButton>

            <SoftButton
              onClick={() => file && validateFile(file)}
              disabled={!file || busy}
            >
              Re-validate
            </SoftButton>

            <InfoPill tone={canImport ? "success" : "neutral"}>
              {canImport ? "Ready to import" : "Validate file first"}
            </InfoPill>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
            >
              {showAdvanced ? "Hide advanced options" : "Show advanced options"}
            </button>

            {showAdvanced ? (
              <div className="mt-3 rounded-[22px] border border-black/8 bg-[#fcfbf8] p-4">
                <label className="flex items-start gap-3 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    disabled={!validation?.ok || busy}
                    checked={syncMissing}
                    onChange={(e) => setSyncMissing(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-neutral-900">Deactivate missing products</span>{" "}
                    <span className="text-neutral-500">
                      Anything not included in this file will be set inactive for this brand.
                    </span>
                  </span>
                </label>

                <div className="mt-2 text-xs text-neutral-500">
                  Only use this when your file is the full source-of-truth catalogue export.
                </div>
              </div>
            ) : null}
          </div>

          

          {mode === "brand" && previewRows.length > 0 && emptyRequiredFields.length > 0 ? (
            <div className="rounded-[22px] border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <div className="font-medium">Some rows are missing required values</div>

              <div className="mt-2 flex flex-wrap gap-2">
                {emptyRequiredFields.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center rounded-full border border-yellow-200 bg-white px-2.5 py-1 text-xs"
                  >
                    {m}
                  </span>
                ))}
              </div>

              <div className="mt-2 text-xs text-yellow-900/70">
                Fill these fields for every row, then re-upload.
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {error ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {previewRows.length > 0 ? (
        <SectionCard
          eyebrow="Step 2"
          title={`Preview (${previewRows.length} rows)`}
          description="Quick preview of the uploaded structure before import."
        >
          <div className="overflow-auto rounded-[22px] border border-black/8 bg-white">
            <table className="min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-[#faf8f4] text-left text-neutral-600">
                <tr className="border-b border-black/6">
                  {previewCols.map((k) => (
                    <th key={k} className="px-4 py-3 font-medium">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-b border-black/6">
                    {previewCols.map((k) => (
                      <td key={k} className="whitespace-nowrap px-4 py-3 text-neutral-700">
                        {r[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {validation ? (
        <SectionCard
          eyebrow="Step 3"
          title="Validation summary"
          description="Review the import health and expected changes before confirming."
          actions={
            <InfoPill tone={canImport ? "success" : "danger"}>
              {canImport ? "✅ Ready to import" : "❌ Fix invalid rows first"}
            </InfoPill>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-neutral-400">Total</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                  {validation.summary?.total ?? 0}
                </div>
              </div>

              <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-emerald-700/70">Valid</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-emerald-900">
                  {validation.summary?.valid ?? 0}
                </div>
              </div>

              <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-red-700/70">Invalid</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-red-900">
                  {validation.summary?.invalid ?? 0}
                </div>
              </div>
            </div>

            {validation?.summary?.willCreate !== undefined ? (
              <div className="rounded-[22px] border border-black/8 bg-[#fcfbf8] p-4 text-sm text-neutral-700">
                <div>
                  Expected changes: <b>{validation.summary.willCreate}</b> new •{" "}
                  <b>{validation.summary.willUpdate}</b> updates
                  {typeof validation.summary.willDeactivate === "number" ? (
                    <>
                      {" "}
                      • <b>{validation.summary.willDeactivate}</b> will deactivate
                    </>
                  ) : null}
                </div>

                {typeof validation.summary.duplicateSourceUrlsInFile === "number" &&
                validation.summary.duplicateSourceUrlsInFile > 0 ? (
                  <div className="mt-3 rounded-[18px] border border-yellow-200 bg-yellow-50 p-3 text-yellow-900">
                    <div className="font-medium">Duplicate URLs in file</div>
                    <div className="mt-1 text-sm">
                      <b>{validation.summary.duplicateSourceUrlsInFile}</b> duplicate source URLs found.
                      The import will use the <b>last occurrence</b> for each duplicate.
                    </div>

                    {Array.isArray(validation.summary.duplicateExamples) &&
                    validation.summary.duplicateExamples.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {validation.summary.duplicateExamples.map((u: string) => (
                          <span
                            key={u}
                            className="inline-flex items-center rounded-full border border-yellow-200 bg-white px-2.5 py-1 text-[11px]"
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {typeof validation.summary.effectiveRowsAfterDeduping === "number" ? (
                      <div className="mt-2 text-xs text-yellow-900/70">
                        Effective rows after dedupe: <b>{validation.summary.effectiveRowsAfterDeduping}</b>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!!validation?.warnings?.length ? (
              <div className="rounded-[22px] border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <div className="mb-2 font-medium">
                  Warnings (first {Math.min(20, validation.warnings.length)})
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {validation.warnings.slice(0, 20).map((w: any, i: number) => (
                    <li key={i}>
                      Row {w.row}: {w.warning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!!validation.rowErrors?.length ? (
              <div className="rounded-[22px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="mb-2 font-medium">
                  Errors (showing first {Math.min(20, validation.rowErrors.length)})
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {validation.rowErrors.slice(0, 20).map((e: any, idx: number) => (
                    <li key={idx}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

            {importResult?.ok ? (
        <div className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#f3fff7_0%,#ecfdf3_100%)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-700/60">
            Import complete
          </div>

          <div className="mt-2 text-lg font-semibold tracking-tight text-emerald-900">
            ✅ Products imported successfully
          </div>

          <div className="mt-2 text-sm text-emerald-800">
            Total: <b>{importResult.results?.total ?? "-"}</b> • Created:{" "}
            <b>{importResult.results?.createdProducts ?? 0}</b> • Updated:{" "}
            <b>{importResult.results?.updatedProducts ?? 0}</b>
          </div>

          <div className="mt-4 rounded-[20px] border border-emerald-200/70 bg-white/70 p-4">
            <div className="text-sm font-medium text-neutral-900">
              Next step: review and edit your imported products
            </div>
            <div className="mt-1 text-sm text-neutral-600">
              Head to the products tab to check titles, taxonomy, occasions, images, badges, pricing,
              shipping, and then submit each product for review.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="/brand/products"
                className="inline-flex items-center rounded-full bg-black px-4 py-2 text-sm text-white shadow-sm transition hover:opacity-90"
              >
                Go to products
              </a>

              <a
                href="/brand/products"
                className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/[0.03]"
              >
                Review imported items
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {importResult && !importResult.ok ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-4">
          <div className="font-medium text-red-900">❌ Import failed</div>
          <div className="mt-1 text-sm text-red-800">
            {importResult.error ?? "Unknown error"}
          </div>
        </div>
      ) : null}

      <SectionCard
        eyebrow="History"
        title="Recent imports"
        description="Track recent validation/import jobs and their outcomes."
      >
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
      </SectionCard>

      {confirmOpen && validation?.summary?.willCreate !== undefined ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-2xl">
            <div className="border-b border-black/6 bg-[linear-gradient(180deg,#fff_0%,#fbf8f2_100%)] px-5 py-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                Confirm import
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-950">
                Ready to import catalogue
              </div>
              <div className="mt-1 text-sm text-neutral-500">
                Please review the expected changes below before continuing.
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="text-sm text-neutral-700">
                You are about to import <b>{validation.summary.total}</b> products:
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <b>{validation.summary.willCreate}</b> new
                  </li>
                  <li>
                    <b>{validation.summary.willUpdate}</b> updates
                  </li>
                </ul>
              </div>

              {typeof validation.summary.willDeactivate === "number" &&
              validation.summary.willDeactivate > 0 ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 p-3 text-red-700">
                  <div className="font-medium">Deactivation warning</div>
                  <div className="mt-1 text-sm">
                    This import will deactivate <b>{validation.summary.willDeactivate}</b> currently active products that are not in this file.
                  </div>
                </div>
              ) : null}

              {typeof validation.summary.duplicateSourceUrlsInFile === "number" &&
              validation.summary.duplicateSourceUrlsInFile > 0 ? (
                <div className="rounded-[20px] border border-yellow-200 bg-yellow-50 p-3 text-yellow-900">
                  <div className="font-medium">Duplicate URL safety</div>
                  <div className="mt-1 text-sm">
                    Your file contains <b>{validation.summary.duplicateSourceUrlsInFile}</b> duplicate source URLs.
                    The import will use the <b>last occurrence</b> for each duplicate.
                  </div>

                  {Array.isArray(validation.summary.duplicateExamples) &&
                  validation.summary.duplicateExamples.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {validation.summary.duplicateExamples.map((u: string) => (
                        <span
                          key={u}
                          className="inline-flex items-center rounded-full border border-yellow-200 bg-white px-2.5 py-1 text-[11px]"
                        >
                          {u}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {typeof validation.summary.effectiveRowsAfterDeduping === "number" ? (
                    <div className="mt-2 text-xs text-yellow-900/70">
                      Effective rows after dedupe: <b>{validation.summary.effectiveRowsAfterDeduping}</b>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {syncMissing ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 p-3 text-red-700">
                  <div className="font-medium">Brand sync enabled</div>
                  <div className="mt-1 text-sm">
                    Products from this brand that are not in the file will be set to inactive.
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <SoftButton onClick={() => setConfirmOpen(false)} disabled={busy}>
                  Cancel
                </SoftButton>
                <PrimaryButton
                  onClick={async () => {
                    setConfirmOpen(false);
                    await runImport();
                  }}
                  disabled={busy}
                >
                  {busy ? "Working..." : "Confirm import"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}