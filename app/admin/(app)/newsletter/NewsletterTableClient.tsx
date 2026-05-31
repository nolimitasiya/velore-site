"use client";

import { useState } from "react";

type Sub = {
  id: string;
  email: string;
  name?: string | null;
  source?: string | null;
  status: string;
  createdAt: string;
};

function statusPill(status: string) {
  if (status === "confirmed")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "pending")
    return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-black/10 bg-neutral-50 text-neutral-600";
}

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
    window.location.href = "/api/admin/newsletter/export";
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Card header */}
      <div className="flex flex-col gap-4 border-b border-[#e8ddd4] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-black">All subscribers</div>
          <div className="mt-1 text-xs text-neutral-500">
            {subs.length} subscriber{subs.length === 1 ? "" : "s"} total
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-[#fdf7f4]"
          >
            Export CSV
          </button>
          <button
            onClick={remindAllPending}
            disabled={busyAll}
            className="inline-flex items-center rounded-2xl bg-[#7B2D3E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyAll ? "Reminding..." : "Remind all pending"}
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
          <tr>
            <th className="px-6 py-3 font-medium">Email</th>
            <th className="px-6 py-3 font-medium">Source</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium">Signed up</th>
            <th className="px-6 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id} className="border-t border-black/6 transition-colors hover:bg-[#fdf7f4]">
              <td className="px-6 py-3.5">
                <a
                  href={`mailto:${s.email}`}
                  className="font-medium text-black underline decoration-black/20 underline-offset-4 hover:decoration-black"
                >
                  {s.email}
                </a>
              </td>
              <td className="px-6 py-3.5 text-neutral-500">
                {s.source ?? "—"}
              </td>
              <td className="px-6 py-3.5">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusPill(s.status)}`}>
                  {s.status}
                </span>
              </td>
              <td className="px-6 py-3.5 text-neutral-500">
                {new Date(s.createdAt).toLocaleString("en-GB")}
              </td>
              <td className="px-6 py-3.5">
                {s.status === "pending" ? (
                  <button
                    onClick={() => sendReminder(s.id)}
                    disabled={busyId === s.id}
                    className="text-[11px] font-medium text-[#7B2D3E] underline decoration-[#7B2D3E]/30 underline-offset-2 transition hover:decoration-[#7B2D3E] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busyId === s.id ? "Sending..." : "Send reminder"}
                  </button>
                ) : (
                  <span className="text-xs text-neutral-300">—</span>
                )}
              </td>
            </tr>
          ))}

          {subs.length === 0 && (
            <tr>
              <td className="px-6 py-10 text-center text-neutral-400" colSpan={5}>
                No subscribers yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}