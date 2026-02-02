"use client";

import { useState } from "react";

type Sub = {
  id: string;
  email: string;
  name?: string | null;
  source?: string | null;
  status: string;
  createdAt: string; // we'll pass ISO string from server
};

export default function NewsletterTableClient({ subs }: { subs: Sub[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function sendReminder(id: string) {
    setBusyId(id);
    try {
      const r = await fetch("/api/admin/newsletter/remind", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(j?.error ?? `Failed to send reminder (${r.status})`);
        return;
      }
      alert("Reminder sent ✅");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
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
  );
}
