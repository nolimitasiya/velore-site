"use client";

import { useState } from "react";

type Note = {
  id: string;
  content: string;
  createdAt: Date | string; // ✅ changed
};

export default function BrandNotesEditor({
  brandId,
  initialNotes,
}: {
  brandId: string;
  initialNotes: Note[];
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!text.trim()) return;

    setSaving(true);

    const res = await fetch(`/api/admin/brands/${brandId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: text }),
    });

    const j = await res.json();
    if (j.ok) {
      setNotes([j.note as Note, ...notes]);
      setText("");
    }

    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <h2 className="text-lg font-semibold">Internal Notes</h2>

      {/* New Note Box */}
      <div className="mt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-black/10 p-3 text-sm"
          placeholder="Add a new note..."
        />
        <button
          onClick={addNote}
          disabled={saving}
          className="mt-3 rounded-xl bg-black px-4 py-2 text-sm text-white"
        >
          {saving ? "Adding..." : "Add Note"}
        </button>
      </div>

      {/* Notes History */}
      <div className="mt-6 space-y-4">
        {notes.length === 0 && (
          <div className="text-sm text-black/50">No notes yet.</div>
        )}

        {notes.map((note) => {
          const dt =
            typeof note.createdAt === "string"
              ? new Date(note.createdAt)
              : note.createdAt;

          return (
            <div key={note.id} className="rounded-xl border border-black/10 p-4">
              <div className="text-xs text-black/50 mb-2">
                {dt.toLocaleString()}
              </div>
              <div className="text-sm whitespace-pre-wrap">{note.content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}