"use client";

import { useState } from "react";

type Note = {
  id: string;
  content: string;
  createdAt: Date | string;
};

export default function ApplicationNotesButton({
  applicationId,
  initialNotes,
}: {
  applicationId: string;
  initialNotes: Note[];
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!text.trim()) return;

    setSaving(true);

    try {
      const res = await fetch(
        `/api/admin/brand-applications/${applicationId}/notes`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: text }),
        }
      );

      const j = await res.json().catch(() => ({}));

      if (!res.ok || !j.ok) {
        throw new Error(j?.error || `Failed (${res.status})`);
      }

      setNotes([j.note as Note, ...notes]);
      setText("");
    } catch (e) {
      console.error(e);
      alert("Failed to add note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center rounded-2xl border border-black/10 bg-white px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-700 transition hover:bg-black/[0.03]"
      >
        Notes {notes.length > 0 ? `(${notes.length})` : ""}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Internal notes
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  Pipeline notes
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 px-3 py-1 text-sm text-neutral-500 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-black/10 p-3 text-sm outline-none focus:border-black/20 focus:ring-2 focus:ring-black/5"
                placeholder="Add a note to yourself..."
              />

              <button
                type="button"
                onClick={addNote}
                disabled={saving || !text.trim()}
                className="mt-3 inline-flex h-10 items-center rounded-2xl bg-black px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add note"}
              </button>
            </div>

            <div className="mt-6 max-h-[320px] space-y-3 overflow-y-auto">
              {notes.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 text-sm text-neutral-500">
                  No notes yet.
                </div>
              ) : (
                notes.map((note) => {
                  const dt =
                    typeof note.createdAt === "string"
                      ? new Date(note.createdAt)
                      : note.createdAt;

                  return (
                    <div
                      key={note.id}
                      className="rounded-2xl border border-black/10 p-4"
                    >
                      <div className="mb-2 text-xs text-neutral-500">
                        {dt.toLocaleString()}
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-neutral-800">
                        {note.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}