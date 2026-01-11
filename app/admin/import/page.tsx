"use client";

import { useState } from "react";
import Papa from "papaparse";

type Row = Record<string, string>;

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<Row[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const adminKey = ""; // <-- paste your ADMIN_IMPORT_KEY here for now (MVP)
  // Later we’ll replace this with proper auth so you don’t hardcode keys.

  async function validateOnServer(f: File) {
    setBusy(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", f);

    const r = await fetch("/api/admin/import?mode=validate", {
      method: "POST",
      body: fd,
      headers: adminKey ? { "x-admin-key": adminKey } : {},
    });

    const json = await r.json();
    if (!r.ok) {
      setError(json?.error ?? "Validation failed");
      setBusy(false);
      return;
    }
    setResult(json);
    setBusy(false);
  }

  async function commitImport() {
    if (!file) return;
    setBusy(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    const r = await fetch("/api/admin/import?mode=commit", {
      method: "POST",
      body: fd,
      headers: adminKey ? { "x-admin-key": adminKey } : {},
    });

    const json = await r.json();
    if (!r.ok) {
      setError(json?.error ?? "Import failed");
      setResult(json);
      setBusy(false);
      return;
    }
    setResult(json);
    setBusy(false);
  }

  function handleFile(f: File) {
    setFile(f);
    setError(null);
    setResult(null);

    // local preview (fast)
    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setPreviewRows(res.data.slice(0, 20));
      },
    });

    // server validation (authoritative)
    validateOnServer(f);
  }

  const canImport =
    result?.mode === "validate" && result?.invalid === 0 && result?.valid > 0;

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin – CSV Import</h1>

      <div className="rounded-2xl border p-4 space-y-2">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            handleFile(f);
          }}
        />
        <p className="text-sm text-gray-600">
          Upload a CSV → we validate it → then you click Import.
        </p>
      </div>

      {busy && (
        <div className="text-sm text-gray-600">Working…</div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="rounded-2xl border p-4">
          <h2 className="font-medium mb-3">Preview (first {previewRows.length} rows)</h2>
          <div className="overflow-auto">
            <table className="min-w-[900px] text-sm">
              <thead>
                <tr className="border-b">
                  {Object.keys(previewRows[0]).map((k) => (
                    <th key={k} className="p-2 text-left">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-b">
                    {Object.keys(previewRows[0]).map((k) => (
                      <td key={k} className="p-2">{r[k]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">Validation summary</div>
              <div className="text-sm text-gray-600">
                Total: {result.total} • Valid: {result.valid} • Invalid: {result.invalid}
              </div>
            </div>

            {result.mode === "validate" && (
              <button
                disabled={!canImport || busy}
                onClick={commitImport}
                className={`rounded-xl px-4 py-2 text-sm text-white ${
                  canImport ? "bg-black" : "bg-gray-400"
                }`}
              >
                Import to DB
              </button>
            )}
          </div>

          {result.errors?.length > 0 && (
            <div className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
              <div className="font-medium mb-1">Errors (first {result.errors.length})</div>
              <ul className="list-disc pl-5">
                {result.errors.map((e: any, idx: number) => (
                  <li key={idx}>
                    Row {e.row}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer">Raw response</summary>
            <pre className="mt-2 text-xs whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </main>
  );
}
