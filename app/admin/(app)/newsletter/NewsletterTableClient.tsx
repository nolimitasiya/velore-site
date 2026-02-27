"use client";

import { useState } from "react";

type Sub = {
  id: string;
  email: string;
  name?: string | null;
  source?: string | null;
  status: string;
  createdAt: string; // ISO string
};

export default function NewsletterTableClient({ subs }: { subs: Sub[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [error, setError] = useState<string>("");

  async function sendReminder(id: string) {
    setError("");
    setBusyId(id);

    try {
      const r = await fetch("/api/admin/newsletter/remind", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j?.error ?? `Failed to send reminder (${r.status})`);
        return;
      }

      alert("Reminder sent ✅");
    } finally {
      setBusyId(null);
    }
  }

  async function remindAllPending() {
    setError("");
    setBusyAll(true);

    try {
      const r = await fetch("/api/admin/newsletter/remind-all", { method: "POST" });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setError(j?.error ?? "Failed to remind pending");
        return;
      }

      alert(`Reminders sent ✅ (sent: ${j.sent ?? "?"}, failed: ${j.failed ?? "?"})`);
    } finally {
      setBusyAll(false);
    }
  }

  function exportCsv() {
    // triggers file download
    window.location.href = "/api/admin/newsletter/export";
  }

  return (
    <div className="mt-6">
      {/* Header + bulk actions */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">admin/newsletter</h1>
          <p className="text-sm text-zinc-600">Manage newsletter subscribers.</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2">
          <button onClick={exportCsv} className="rounded-md border px-3 py-2 text-sm">
            Export CSV
          </button>

          <button
            onClick={remindAllPending}
            disabled={busyAll}
            className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busyAll ? "Reminding..." : "Remind all pending"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-black/10">
        <table className="w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-t border-black/5">
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3">{s.source ?? "-"}</td>
                <td className="px-4 py-3">{s.status}</td>
                <td className="px-4 py-3">
                  {new Date(s.createdAt).toLocaleString("en-GB")}
                </td>

                <td className="px-4 py-3">
                  {s.status === "pending" ? (
                    <button
                      onClick={() => sendReminder(s.id)}
                      disabled={busyId === s.id}
                      className="rounded-lg border px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50"
                    >
                      {busyId === s.id ? "Sending..." : "Send reminder"}
                    </button>
                  ) : (
                    <span className="text-xs text-black/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
