"use client";

import { useState } from "react";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function NotesClient({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selected, setSelected] = useState<Note | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function openNote(note: Note) {
    setSelected(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setShowNew(false);
    setError("");
  }

  function closeNote() {
    setSelected(null);
    setEditTitle("");
    setEditContent("");
  }

  async function createNote() {
    if (!newTitle.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/personal/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), content: "" }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setNotes(prev => [data.note, ...prev]);
      setShowNew(false);
      setNewTitle("");
      openNote(data.note);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function saveNote(id: string, title: string, content: string) {
    try {
      const res = await fetch(`/api/admin/personal/notes/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setNotes(prev => prev.map(n => n.id === id ? data.note : n));
      if (selected?.id === id) setSelected(data.note);
    } catch {
      // silent autosave failure
    }
  }

  function onContentChange(val: string) {
    setEditContent(val);
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(() => {
      if (selected) saveNote(selected.id, editTitle, val);
    }, 1000);
    setSaveTimer(t);
  }

  function onTitleChange(val: string) {
    setEditTitle(val);
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(() => {
      if (selected) saveNote(selected.id, val, editContent);
    }, 1000);
    setSaveTimer(t);
  }

  async function deleteNote(id: string) {
    setDeleting(true);
    try {
      await fetch(`/api/admin/personal/notes/${id}`, { method: "DELETE" });
      setNotes(prev => prev.filter(n => n.id !== id));
      closeNote();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1400px] space-y-8 p-6 md:p-8">

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Personal</div>
              <h1 className="mt-1 font-heading text-3xl font-semibold text-white">My notes</h1>
              <p className="mt-1 text-sm text-white/60">Named notes with dates — ideas, thoughts, anything worth keeping.</p>
            </div>
            <button
              onClick={() => { setShowNew(true); setSelected(null); setError(""); setNewTitle(""); }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#7B2D3E] transition hover:bg-white/90"
            >
              + New note
            </button>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[300px_1fr]">

          {/* Sidebar — note list */}
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] h-fit">
            <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">All notes</div>
              <div className="mt-0.5 text-sm font-medium text-black">{notes.length} note{notes.length !== 1 ? "s" : ""}</div>
            </div>

            {/* New note form */}
            {showNew && (
              <div className="border-b border-[#e8ddd4] bg-[#fdf7f4]/50 px-4 py-3 space-y-2">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => { setNewTitle(e.target.value); setError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") createNote(); if (e.key === "Escape") setShowNew(false); }}
                  placeholder="Note title..."
                  className="w-full rounded-xl border border-[#e8ddd4] bg-white px-3 py-2 text-sm outline-none focus:border-[#7B2D3E]/40"
                />
                {error && <div className="text-xs text-red-500">{error}</div>}
                <div className="flex gap-2">
                  <button onClick={createNote} disabled={saving} className="rounded-full bg-[#7B2D3E] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60">
                    {saving ? "Creating..." : "Create"}
                  </button>
                  <button onClick={() => setShowNew(false)} className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-black/60 hover:bg-black/[0.03]">Cancel</button>
                </div>
              </div>
            )}

            <div className="divide-y divide-[#e8ddd4]">
              {notes.length === 0 && !showNew && (
                <div className="px-5 py-8 text-center text-sm text-neutral-400">No notes yet.</div>
              )}
              {notes.map(n => (
                <button
                  key={n.id}
                  onClick={() => openNote(n)}
                  className={[
                    "w-full px-5 py-4 text-left transition hover:bg-[#fdf7f4]",
                    selected?.id === n.id ? "bg-[#fdf7f4] border-l-[3px] border-l-[#7B2D3E]" : "",
                  ].join(" ")}
                >
                  <div className="text-sm font-medium text-[#1a0a0e] truncate">{n.title}</div>
                  <div className="mt-0.5 text-xs text-[#a89280]">{formatDate(n.updatedAt)}</div>
                  {n.content && (
                    <div className="mt-1 text-xs text-neutral-400 truncate">{n.content.slice(0, 60)}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Editor pane */}
          {selected ? (
            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Editing</div>
                  <div className="mt-0.5 text-xs text-neutral-400">
                    Created {formatDate(selected.createdAt)} · Last updated {formatDate(selected.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={() => deleteNote(selected.id)}
                  disabled={deleting}
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete note"}
                </button>
              </div>
              <div className="p-6 space-y-4">
                <input
                  value={editTitle}
                  onChange={e => onTitleChange(e.target.value)}
                  className="w-full rounded-xl border border-[#e8ddd4] bg-[#fdf7f4] px-4 py-3 text-lg font-medium text-[#1a0a0e] outline-none focus:border-[#7B2D3E]/40"
                  placeholder="Note title"
                />
                <textarea
                  value={editContent}
                  onChange={e => onContentChange(e.target.value)}
                  placeholder="Start writing..."
                  rows={18}
                  className="w-full rounded-xl border border-[#e8ddd4] bg-white px-4 py-3 text-sm text-[#1a0a0e] outline-none focus:border-[#7B2D3E]/40 resize-none leading-relaxed"
                />
                <div className="text-xs text-neutral-400">Autosaves as you type.</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-[28px] border border-dashed border-[#e8ddd4] bg-white p-12 text-center">
              <div>
                <div className="text-2xl mb-3">📝</div>
                <div className="text-sm font-medium text-neutral-500">Select a note to edit</div>
                <div className="mt-1 text-xs text-neutral-400">or create a new one</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}