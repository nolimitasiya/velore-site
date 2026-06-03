"use client";

import { useState, useMemo } from "react";

type CalEvent = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  description: string | null;
  color: string;
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

export default function CalendarClient({ initialEvents }: { initialEvents: CalEvent[] }) {
  const today = new Date();
  const [events, setEvents] = useState<CalEvent[]>(initialEvents);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [form, setForm] = useState({ title: "", date: "", time: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-based offset
  const startOffset = (firstDay.getDay() + 6) % 7;

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of events) {
      const key = e.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const todayStr = toDateStr(today);
    return events
      .filter((e) => e.date.slice(0, 10) >= todayStr)
      .slice(0, 8);
  }, [events]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function openForm(dateStr?: string) {
    setForm({ title: "", date: dateStr ?? toDateStr(today), time: "", description: "" });
    setShowForm(true);
    setError("");
  }

  async function saveEvent() {
    if (!form.title || !form.date) { setError("Title and date are required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/personal/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setEvents(prev => [...prev, data.event].sort((a, b) => a.date.localeCompare(b.date)));
      setShowForm(false);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
    await fetch(`/api/admin/personal/calendar?id=${id}`, { method: "DELETE" });
  }

  const todayStr = toDateStr(today);

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1400px] space-y-8 p-6 md:p-8">

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Personal</div>
              <h1 className="mt-1 font-heading text-3xl font-semibold text-white">My calendar</h1>
              <p className="mt-1 text-sm text-white/60">Your events, reminders, and upcoming dates.</p>
            </div>
            <button
              onClick={() => openForm()}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#7B2D3E] transition hover:bg-white/90"
            >
              + Add event
            </button>
          </div>
        </section>

        {/* Add event modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
            <div className="relative z-10 w-full max-w-md rounded-[24px] border border-[#e8ddd4] bg-[#fdf7f4] shadow-2xl overflow-hidden">
              <div className="border-b border-[#e8ddd4] px-6 py-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">New event</div>
                <h2 className="mt-0.5 text-base font-medium text-[#1a0a0e]">Add to calendar</h2>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Event title"
                    className="w-full rounded-xl border border-[#e8ddd4] bg-white px-3 py-2 text-sm outline-none focus:border-[#7B2D3E]/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
  <div>
    <label
      htmlFor="event-date"
      className="mb-1.5 block text-xs font-medium text-neutral-600"
    >
      Date *
    </label>
    <input
      id="event-date"
      type="date"
      title="Event date"
      value={form.date}
      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
      className="w-full rounded-xl border border-[#e8ddd4] bg-white px-3 py-2 text-sm outline-none focus:border-[#7B2D3E]/40"
    />
  </div>
  <div>
    <label
      htmlFor="event-time"
      className="mb-1.5 block text-xs font-medium text-neutral-600"
    >
      Time
    </label>
    <input
      id="event-time"
      type="time"
      title="Event time"
      value={form.time}
      onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
      className="w-full rounded-xl border border-[#e8ddd4] bg-white px-3 py-2 text-sm outline-none focus:border-[#7B2D3E]/40"
    />
  </div>
</div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional notes..."
                    rows={3}
                    className="w-full rounded-xl border border-[#e8ddd4] bg-white px-3 py-2 text-sm outline-none focus:border-[#7B2D3E]/40 resize-none"
                  />
                </div>
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setShowForm(false)} className="rounded-full border border-black/12 bg-white px-4 py-2 text-sm text-black/60 hover:bg-black/[0.03]">Cancel</button>
                  <button onClick={saveEvent} disabled={saving} className="rounded-full bg-[#7B2D3E] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                    {saving ? "Saving..." : "Save event"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar + Upcoming side by side */}
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

          {/* Month grid */}
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Month view</div>
                <div className="mt-0.5 text-sm font-medium text-black">{MONTHS[month]} {year}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm hover:bg-black/[0.03]">←</button>
                <button onClick={nextMonth} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm hover:bg-black/[0.03]">→</button>
              </div>
            </div>
            <div className="p-5">
              {/* Day names */}
              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a89280] py-1">{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${pad(month+1)}-${pad(day)}`;
                  const isToday = dateStr === todayStr;
                  const dayEvents = eventsByDate[dateStr] ?? [];
                  return (
                    <button
                      key={day}
                      onClick={() => openForm(dateStr)}
                      className={[
                        "relative flex flex-col items-center rounded-xl py-2 px-1 text-sm transition hover:bg-[#fdf7f4]",
                        isToday ? "bg-[#7B2D3E] text-white hover:bg-[#7B2D3E]/90" : "text-[#1a0a0e]",
                      ].join(" ")}
                    >
                      <span className="font-medium">{day}</span>
                      {dayEvents.length > 0 && (
                        <span className={[
                          "mt-1 flex gap-0.5",
                        ].join("")}>
                          {dayEvents.slice(0, 3).map((_, ei) => (
                            <span key={ei} className={`h-1 w-1 rounded-full ${isToday ? "bg-white" : "bg-[#7B2D3E]"}`} />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upcoming events */}
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Upcoming</div>
              <div className="mt-0.5 text-sm font-medium text-black">Next events</div>
            </div>
            <div className="divide-y divide-[#e8ddd4]">
              {upcomingEvents.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-neutral-400">No upcoming events. Add one!</div>
              )}
              {upcomingEvents.map(e => (
                <div key={e.id} className="flex items-start gap-3 px-5 py-4 group">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7B2D3E]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1a0a0e] truncate">{e.title}</div>
                    <div className="mt-0.5 text-xs text-[#a89280]">
                      {new Date(e.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      {e.time ? `, ${e.time}` : ""}
                    </div>
                    {e.description && <div className="mt-1 text-xs text-neutral-500 truncate">{e.description}</div>}
                  </div>
                  <button
                    onClick={() => deleteEvent(e.id)}
                    className="shrink-0 text-xs text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All events table */}
        <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">All events</div>
            <div className="mt-0.5 text-sm font-medium text-black">Full event list</div>
          </div>
          {events.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-neutral-400">No events yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                <tr>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Notes</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} className="border-t border-black/6 group">
                    <td className="px-5 py-3.5 font-medium text-[#1a0a0e]">{e.title}</td>
                    <td className="px-5 py-3.5 text-neutral-600">
                      {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600">{e.time ?? "—"}</td>
                    <td className="px-5 py-3.5 text-neutral-500 max-w-xs truncate">{e.description ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => deleteEvent(e.id)} className="text-xs text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-red-400 transition">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}