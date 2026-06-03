"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PRAYERS } from "./wellnessData";

const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── date helpers ──────────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function shortDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getWeekDates(mondayKey: string): string[] {
  const dates: string[] = [];
  const base = new Date(mondayKey + "T12:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ── types ─────────────────────────────────────────────────────────────────────

type PrayerRecord = {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
};

type DayRecord = {
  prayers: PrayerRecord;
  ayat: number;
};

type JournalEntry = {
  date: string;
  text: string;
};

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ── debounce ──────────────────────────────────────────────────────────────────

function useDebounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: T) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function PrayerTab() {
  const todayIso = todayKey();
  const currentMonday = getMondayOf(new Date());

  // ── state ──────────────────────────────────────────────────────────────────

  const [records, setRecords] = useState<Record<string, DayRecord>>({});
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalText, setJournalText] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingPrayer, setSavingPrayer] = useState(false);
  const [savingAyat, setSavingAyat] = useState(false);

  // ── derived week ───────────────────────────────────────────────────────────

  const viewedMonday = (() => {
    const base = new Date(currentMonday + "T12:00:00");
    base.setDate(base.getDate() + weekOffset * 7);
    return base.toISOString().slice(0, 10);
  })();
  const weekDates = getWeekDates(viewedMonday);
  const isCurrentWeek = viewedMonday === currentMonday;

  // ── load from DB on mount + when week changes ──────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // Always seed from localStorage first for instant render
      const cached = lsGet<Record<string, DayRecord>>("wellness-records-v2", {});
      const cachedJournal = lsGet<JournalEntry[]>("wellness-journal-v2", []);
      if (!cancelled) {
        setRecords(cached);
        setJournalEntries(cachedJournal);
      }

      try {
        const from = weekDates[0];
        const to = weekDates[6];

        const [prayerRes, ayatRes, journalRes] = await Promise.all([
          fetch(`/api/admin/personal/wellness/prayers?from=${from}&to=${to}`),
          fetch(`/api/admin/personal/wellness/ayat?from=${from}&to=${to}`),
          fetch(`/api/admin/personal/wellness/journal`),
        ]);

        if (!prayerRes.ok || !ayatRes.ok || !journalRes.ok) throw new Error();

        const [prayerData, ayatData, journalData] = await Promise.all([
          prayerRes.json(),
          ayatRes.json(),
          journalRes.json(),
        ]);

        if (cancelled) return;

        // Merge DB data into records map
        const next = { ...cached };

        for (const r of prayerData.records ?? []) {
          next[r.date] = {
            prayers: {
              fajr: r.fajr,
              dhuhr: r.dhuhr,
              asr: r.asr,
              maghrib: r.maghrib,
              isha: r.isha,
            },
            ayat: next[r.date]?.ayat ?? 0,
          };
        }

        for (const r of ayatData.records ?? []) {
          next[r.date] = {
            prayers: next[r.date]?.prayers ?? {
              fajr: false,
              dhuhr: false,
              asr: false,
              maghrib: false,
              isha: false,
            },
            ayat: r.count,
          };
        }

        setRecords(next);
        lsSet("wellness-records-v2", next);

        const dbJournal: JournalEntry[] = (journalData.entries ?? []).map(
          (e: { date: string; text: string }) => ({
            date: e.date,
            text: e.text,
          })
        );
        setJournalEntries(dbJournal);
        lsSet("wellness-journal-v2", dbJournal);
      } catch {
        // DB unavailable — localStorage already shown, that's fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedMonday]);

  // ── helpers ────────────────────────────────────────────────────────────────

  function getDay(iso: string): DayRecord {
    return (
      records[iso] ?? {
        prayers: {
          fajr: false,
          dhuhr: false,
          asr: false,
          maghrib: false,
          isha: false,
        },
        ayat: 0,
      }
    );
  }

  function updateRecords(iso: string, update: Partial<DayRecord>) {
    const current = getDay(iso);
    const next = {
      ...records,
      [iso]: { ...current, ...update },
    };
    setRecords(next);
    lsSet("wellness-records-v2", next);
    return next[iso];
  }

  // ── prayer toggle ──────────────────────────────────────────────────────────

  async function togglePrayer(iso: string, i: number) {
    if (savingPrayer) return;

    const current = getDay(iso);
    const key = PRAYER_KEYS[i];
    const updatedPrayers: PrayerRecord = {
      ...current.prayers,
      [key]: !current.prayers[key],
    };

    // Optimistic update
    updateRecords(iso, { prayers: updatedPrayers });

    setSavingPrayer(true);
    try {
      await fetch("/api/admin/personal/wellness/prayers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: iso, ...updatedPrayers }),
      });
    } catch {
      // Silently fail — localStorage already updated
    } finally {
      setSavingPrayer(false);
    }
  }

  // ── ayat update (debounced DB write) ───────────────────────────────────────

  const saveAyatToDb = useCallback(
    async (iso: string, count: number) => {
      setSavingAyat(true);
      try {
        await fetch("/api/admin/personal/wellness/ayat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date: iso, count }),
        });
      } catch {
        // Silently fail
      } finally {
        setSavingAyat(false);
      }
    },
    []
  );

  const debouncedSaveAyat = useDebounce(saveAyatToDb, 800);

  function addAyat(iso: string, n: number) {
    const current = getDay(iso);
    const newCount = Math.min(15, current.ayat + n);
    updateRecords(iso, { ayat: newCount });
    debouncedSaveAyat(iso, newCount);
  }

  function resetAyat(iso: string) {
    updateRecords(iso, { ayat: 0 });
    debouncedSaveAyat(iso, 0);
  }

  // ── journal ────────────────────────────────────────────────────────────────

  async function saveJournal() {
    if (!journalText.trim()) return;

    const entry: JournalEntry = { date: todayIso, text: journalText.trim() };

    // Optimistic
    const next = [entry, ...journalEntries.filter((e) => e.date !== todayIso)];
    setJournalEntries(next);
    lsSet("wellness-journal-v2", next);
    setJournalText("");
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 2500);

    try {
      await fetch("/api/admin/personal/wellness/journal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: todayIso, text: entry.text }),
      });
    } catch {
      // Already saved to localStorage — user won't notice
    }
  }

  // ── derived values ─────────────────────────────────────────────────────────

  const todayData = getDay(todayIso);
  const todayPrayerCount = Object.values(todayData.prayers).filter(Boolean).length;
  const todayAyat = todayData.ayat;
  const todayAyatPct = Math.round((todayAyat / 15) * 100);

  const weekStats = weekDates.map((iso) => {
    const d = getDay(iso);
    const prayerCount = Object.values(d.prayers).filter(Boolean).length;
    return {
      iso,
      prayerCount,
      prayers: d.prayers,
      ayat: d.ayat,
      isToday: iso === todayIso,
      isFuture: iso > todayIso,
    };
  });

  const weekDaysPassed = weekStats.filter((d) => !d.isFuture).length;
  const weekPerfectDays = weekStats.filter(
    (d) => !d.isFuture && d.prayerCount === 5
  ).length;
  const weekTotalPrayers = weekStats
    .filter((d) => !d.isFuture)
    .reduce((s, d) => s + d.prayerCount, 0);
  const weekTotalAyat = weekStats
    .filter((d) => !d.isFuture)
    .reduce((s, d) => s + d.ayat, 0);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Today summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Prayers today", value: `${todayPrayerCount} / 5` },
          { label: "Ayat today", value: `${todayAyat} / 15` },
          { label: "Journal entries", value: String(journalEntries.length) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[#e8ddd4] bg-white px-4 py-3 text-center"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a89280]">
              {s.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-[#7B2D3E]">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Weekly summary grid ── */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
        {/* Header + week nav */}
        <div className="flex items-center justify-between border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
              Weekly summary
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-sm font-medium text-[#1a0a0e]">
              {shortDate(weekDates[0])} — {shortDate(weekDates[6])}
              {isCurrentWeek && (
                <span className="rounded-full bg-[#f2ece4] px-2 py-0.5 text-[10px] font-medium text-[#7B2D3E]">
                  this week
                </span>
              )}
              {loading && (
                <span className="text-[11px] text-[#c4a898]">loading…</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="rounded-full border border-[#e8ddd4] bg-white px-3 py-1.5 text-[12px] text-[#9a7e6f] transition hover:border-[#7B2D3E]/40 hover:text-[#7B2D3E]"
            >
              ←
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => setWeekOffset(0)}
                className="rounded-full border border-[#e8ddd4] bg-white px-3 py-1.5 text-[11px] text-[#9a7e6f] transition hover:text-[#7B2D3E]"
              >
                Today
              </button>
            )}
            <button
              onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
              disabled={isCurrentWeek}
              className="rounded-full border border-[#e8ddd4] bg-white px-3 py-1.5 text-[12px] text-[#9a7e6f] transition hover:border-[#7B2D3E]/40 hover:text-[#7B2D3E] disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>

        {/* Week-level stats */}
        <div className="grid grid-cols-3 divide-x divide-[#f2ece4] border-b border-[#f2ece4]">
          {[
            {
              label: "Perfect days",
              value: `${weekPerfectDays} / ${weekDaysPassed}`,
              sub: "all 5 prayers",
            },
            {
              label: "Total prayers",
              value: `${weekTotalPrayers} / ${weekDaysPassed * 5}`,
              sub: `${weekDaysPassed} days tracked`,
            },
            {
              label: "Ayat this week",
              value: String(weekTotalAyat),
              sub: `target ${weekDaysPassed * 15}`,
            },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3 text-center">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#a89280]">
                {s.label}
              </div>
              <div className="mt-1 text-lg font-semibold text-[#7B2D3E]">
                {s.value}
              </div>
              <div className="text-[10px] text-[#c4a898]">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Prayer × day grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-[#f2ece4]">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a89280]">
                  Prayer
                </th>
                {weekDates.map((iso, di) => (
                  <th
                    key={iso}
                    className={[
                      "px-2 py-2.5 text-center text-[11px] font-medium",
                      iso === todayIso
                        ? "text-[#7B2D3E]"
                        : iso > todayIso
                        ? "text-[#c4a898]"
                        : "text-[#9a7e6f]",
                    ].join(" ")}
                  >
                    <div>{DAY_LABELS[di]}</div>
                    <div className="text-[10px] font-normal opacity-70">
                      {shortDate(iso)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRAYER_KEYS.map((key, pi) => (
                <tr
                  key={key}
                  className="border-b border-[#f2ece4] last:border-0"
                >
                  <td className="px-4 py-2.5 text-[12px] font-medium text-[#9a7e6f]">
                    {PRAYER_NAMES[pi]}
                  </td>
                  {weekDates.map((iso) => {
                    const dayRec = getDay(iso);
                    const done = dayRec.prayers[key];
                    const future = iso > todayIso;
                    return (
                      <td key={iso} className="px-2 py-2.5 text-center">
                        <div
                          className={[
                            "mx-auto flex h-6 w-6 items-center justify-center rounded-full border transition",
                            future
                              ? "border-[#f2ece4] bg-[#fdf7f4]"
                              : done
                              ? "border-[#7B2D3E] bg-[#7B2D3E]"
                              : "border-[#e8ddd4] bg-white",
                          ].join(" ")}
                        >
                          {!future && done && (
                            <i
                              className="ti ti-check text-[10px] text-white"
                              aria-hidden="true"
                            />
                          )}
                          {!future && !done && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#e8ddd4]" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Ayat row */}
              <tr className="bg-[#fdf7f4]">
                <td className="px-4 py-2.5 text-[12px] font-medium text-[#9a7e6f]">
                  Ayat
                </td>
                {weekDates.map((iso) => {
                  const dayRec = getDay(iso);
                  const future = iso > todayIso;
                  return (
                    <td key={iso} className="px-2 py-2.5 text-center">
                      {future ? (
                        <span className="text-[11px] text-[#e8ddd4]">—</span>
                      ) : (
                        <span
                          className={[
                            "text-[11px] font-semibold",
                            dayRec.ayat >= 15
                              ? "text-[#7B2D3E]"
                              : dayRec.ayat > 0
                              ? "text-[#9a7e6f]"
                              : "text-[#c4a898]",
                          ].join(" ")}
                        >
                          {dayRec.ayat}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Day totals */}
              <tr className="border-t border-[#e8ddd4] bg-[#f2ece4]">
                <td className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a89280]">
                  Total
                </td>
                {weekDates.map((iso) => {
                  const dayRec = getDay(iso);
                  const count = Object.values(dayRec.prayers).filter(Boolean).length;
                  const future = iso > todayIso;
                  return (
                    <td key={iso} className="px-2 py-2.5 text-center">
                      {future ? (
                        <span className="text-[11px] text-[#c4a898]">—</span>
                      ) : (
                        <span
                          className={[
                            "text-[12px] font-bold",
                            count === 5
                              ? "text-[#7B2D3E]"
                              : count >= 3
                              ? "text-[#9a7e6f]"
                              : "text-[#c4a898]",
                          ].join(" ")}
                        >
                          {count}/5
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {isCurrentWeek &&
          weekPerfectDays === weekDaysPassed &&
          weekDaysPassed > 0 && (
            <div className="border-t border-[#e8ddd4] bg-[#f2ece4] px-5 py-3 text-center text-[12px] font-medium text-[#7B2D3E]">
              Perfect so far this week — may Allah accept your prayers.
            </div>
          )}
      </div>

      {/* ── Today's prayers ── */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
            Salah
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <div className="text-sm font-medium text-[#1a0a0e]">
              Today's prayers
            </div>
            {savingPrayer && (
              <span className="text-[11px] text-[#c4a898]">saving…</span>
            )}
          </div>
        </div>
        <div className="divide-y divide-[#f2ece4]">
          {PRAYERS.map((prayer, i) => {
            const key = PRAYER_KEYS[i];
            const done = todayData.prayers[key];
            return (
              <button
                key={prayer.name}
                onClick={() => togglePrayer(todayIso, i)}
                className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-[#fdf7f4]"
              >
                <div
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                    done
                      ? "border-[#7B2D3E] bg-[#7B2D3E]"
                      : "border-[#e8ddd4] bg-white",
                  ].join(" ")}
                >
                  {done && (
                    <i
                      className="ti ti-check text-[11px] text-white"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={[
                      "text-[13px] font-medium",
                      done ? "text-[#a89280] line-through" : "text-[#1a0a0e]",
                    ].join(" ")}
                  >
                    {prayer.name}
                  </span>
                </div>
                <span className="text-[11px] text-[#c4a898]">{prayer.time}</span>
                {done && (
                  <span className="rounded-full bg-[#f2ece4] px-2.5 py-0.5 text-[10px] font-medium text-[#7B2D3E]">
                    done
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Quran tracker ── */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
            Quran
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <div className="text-sm font-medium text-[#1a0a0e]">
              Daily reading — 15 ayat target
            </div>
            {savingAyat && (
              <span className="text-[11px] text-[#c4a898]">saving…</span>
            )}
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] text-[#9a7e6f]">Today's progress</span>
            <span className="text-[13px] font-semibold text-[#7B2D3E]">
              {todayAyat} / 15
            </span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#f2ece4]">
            <div
              className="h-full rounded-full bg-[#7B2D3E] transition-all duration-300"
              style={{ width: `${todayAyatPct}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15].map((n) => (
              <button
                key={n}
                onClick={() => addAyat(todayIso, n)}
                disabled={todayAyat >= 15}
                className={[
                  "rounded-full border px-4 py-1.5 text-[12px] font-medium transition",
                  todayAyat >= 15
                    ? "cursor-default border-[#e8ddd4] bg-[#f2ece4] text-[#7B2D3E]"
                    : "border-[#e8ddd4] bg-white text-[#9a7e6f] hover:border-[#7B2D3E]/40 hover:text-[#7B2D3E]",
                ].join(" ")}
              >
                +{n} ayat
              </button>
            ))}
            <button
              onClick={() => resetAyat(todayIso)}
              className="rounded-full border border-[#e8ddd4] bg-white px-4 py-1.5 text-[12px] text-[#c4a898] transition hover:text-[#9a7e6f]"
            >
              Reset
            </button>
          </div>
          {todayAyat >= 15 && (
            <div className="mt-3 rounded-xl bg-[#f2ece4] px-4 py-2.5 text-[12px] font-medium text-[#7B2D3E]">
              Target reached — may Allah bless your reading.
            </div>
          )}
        </div>
      </div>

      {/* ── Journal ── */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
            Journal
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <div className="text-sm font-medium text-[#1a0a0e]">
              Daily reflection
            </div>
            <div className="text-[11px] text-[#c4a898]">
              {formatDate(todayIso)}
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <textarea
            id="journal-entry"
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="How are you feeling today? Any wins, struggles, reflections, gratitude..."
            rows={4}
            aria-label="Journal entry"
            className="w-full resize-none rounded-xl border border-[#e8ddd4] bg-[#fdf7f4] px-4 py-3 text-[13px] leading-relaxed text-[#1a0a0e] placeholder:text-[#c4a898] outline-none transition focus:border-[#7B2D3E]/40"
          />
          <div className="mt-3 flex items-center justify-between">
            <div
              className={[
                "text-[12px] text-[#1D9E75] transition-opacity",
                journalSaved ? "opacity-100" : "opacity-0",
              ].join(" ")}
            >
              Saved to database
            </div>
            <button
              onClick={saveJournal}
              disabled={!journalText.trim()}
              className="rounded-full bg-[#7B2D3E] px-5 py-2 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Save reflection
            </button>
          </div>
        </div>
      </div>

      {/* Past journal entries */}
      {journalEntries.length > 0 && (
        <div>
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
            Past reflections — {journalEntries.length}{" "}
            {journalEntries.length === 1 ? "entry" : "entries"}
          </div>
          <div className="space-y-3">
            {journalEntries.map((e) => (
              <div
                key={e.date}
                className="rounded-2xl border border-[#e8ddd4] bg-white px-5 py-4"
              >
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c4a898]">
                  {formatDate(e.date)}
                </div>
                <p className="text-[13px] leading-relaxed text-[#9a7e6f]">
                  {e.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
