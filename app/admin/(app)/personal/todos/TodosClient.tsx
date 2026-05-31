"use client";

import { useState, useMemo } from "react";

type Todo = {
  id: string;
  text: string;
  tag: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
};

const TAG_OPTIONS = ["Urgent", "Platform", "Content", "Brand", "Finance", "Personal"];

const TAG_COLORS: Record<string, string> = {
  Urgent:   "bg-red-50 text-red-600 border-red-200",
  Platform: "bg-[#fdf7f4] text-[#7B2D3E] border-[#e8ddd4]",
  Content:  "bg-purple-50 text-purple-600 border-purple-200",
  Brand:    "bg-amber-50 text-amber-600 border-amber-200",
  Finance:  "bg-green-50 text-green-700 border-green-200",
  Personal: "bg-neutral-50 text-neutral-600 border-neutral-200",
};

function TagPill({ tag }: { tag: string }) {
  const cls = TAG_COLORS[tag] ?? "bg-neutral-50 text-neutral-500 border-neutral-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${cls}`}>
      {tag}
    </span>
  );
}

export default function TodosClient({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  const open   = useMemo(() => todos.filter(t => !t.completed), [todos]);
  const done   = useMemo(() => todos.filter(t => t.completed),  [todos]);

  const filtered = useMemo(() => {
    if (filter === "active") return open;
    if (filter === "done")   return done;
    return todos;
  }, [filter, todos, open, done]);

  async function addTodo() {
    if (!text.trim()) { setError("Task text is required."); return; }
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/personal/todos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), tag: tag || null }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setTodos(prev => [data.todo, ...prev]);
      setText("");
      setTag("");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleTodo(id: string, completed: boolean) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null } : t));
    await fetch(`/api/admin/personal/todos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed }),
    });
  }

  async function deleteTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/admin/personal/todos/${id}`, { method: "DELETE" });
  }

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[900px] space-y-8 p-6 md:p-8">

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Personal</div>
              <h1 className="mt-1 font-heading text-3xl font-semibold text-white">My to-dos</h1>
              <p className="mt-1 text-sm text-white/60">Tasks, follow-ups, and things to get done.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/15 px-4 py-2 text-sm text-white">
                {open.length} open · {done.length} done
              </div>
            </div>
          </div>
        </section>

        {/* Add task */}
        <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">New task</div>
            <div className="mt-0.5 text-sm font-medium text-black">Add to your list</div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex gap-3">
              <input
                value={text}
                onChange={e => { setText(e.target.value); setError(""); }}
                onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
                placeholder="What needs doing?"
                className="flex-1 rounded-xl border border-[#e8ddd4] bg-[#fdf7f4] px-4 py-2.5 text-sm text-[#1a0a0e] outline-none focus:border-[#7B2D3E]/40"
              />
              <select
  value={tag}
  onChange={e => setTag(e.target.value)}
  aria-label="Task tag"
  className="rounded-xl border border-[#e8ddd4] bg-[#fdf7f4] px-3 py-2.5 text-sm text-[#1a0a0e] outline-none focus:border-[#7B2D3E]/40"
>
                <option value="">No tag</option>
                {TAG_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={addTodo}
                disabled={adding}
                className="rounded-full bg-[#7B2D3E] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 transition"
              >
                {adding ? "Adding..." : "Add task"}
              </button>
            </div>
            {error && <div className="text-xs text-red-500">{error}</div>}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          {(["all", "active", "done"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "rounded-full border px-4 py-1.5 text-sm font-medium transition capitalize",
                filter === f
                  ? "border-[#7B2D3E] bg-[#7B2D3E] text-white"
                  : "border-black/10 bg-white text-black/60 hover:bg-black/[0.03]",
              ].join(" ")}
            >
              {f === "all" ? `All (${todos.length})` : f === "active" ? `Active (${open.length})` : `Done (${done.length})`}
            </button>
          ))}
        </div>

        {/* Todo list */}
        <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-neutral-400">
              {filter === "done" ? "No completed tasks yet." : "No tasks yet — add one above!"}
            </div>
          ) : (
            <div className="divide-y divide-[#e8ddd4]">
              {filtered.map(todo => (
                <div key={todo.id} className="flex items-center gap-4 px-5 py-4 group hover:bg-[#fdf7f4]/50 transition">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.id, !todo.completed)}
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition",
                      todo.completed
                        ? "border-[#7B2D3E] bg-[#7B2D3E]"
                        : "border-[#e8ddd4] hover:border-[#7B2D3E]/40",
                    ].join(" ")}
                    aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {todo.completed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <span className={[
                      "text-sm",
                      todo.completed ? "line-through text-neutral-400" : "text-[#1a0a0e] font-medium",
                    ].join(" ")}>
                      {todo.text}
                    </span>
                    {todo.completedAt && (
                      <div className="mt-0.5 text-xs text-neutral-400">
                        Completed {new Date(todo.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </div>
                    )}
                  </div>

                  {/* Tag */}
                  {todo.tag && <TagPill tag={todo.tag} />}

                  {/* Delete */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="shrink-0 text-xs text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
                    aria-label="Delete task"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear completed */}
        {done.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={async () => {
                const ids = done.map(t => t.id);
                setTodos(prev => prev.filter(t => !t.completed));
                await Promise.all(ids.map(id => fetch(`/api/admin/personal/todos/${id}`, { method: "DELETE" })));
              }}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-neutral-500 hover:border-red-200 hover:text-red-500 transition"
            >
              Clear all completed ({done.length})
            </button>
          </div>
        )}

      </div>
    </div>
  );
}