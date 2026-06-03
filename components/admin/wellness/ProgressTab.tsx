"use client";

import { useState } from "react";

const MILESTONES = [
  { week: "Start", weight: "88.5 kg", phase: "" },
  { week: "End of week 2", weight: "~85–86 kg", phase: "Foundation" },
  { week: "End of week 4", weight: "~82–83 kg", phase: "Build" },
  { week: "End of week 6", weight: "~78–80 kg", phase: "Push" },
  { week: "End of week 8", weight: "~75–76 kg", phase: "Finish strong" },
];

const DAILY_TARGETS = [
  { label: "Calories", value: "1,700–1,900 kcal" },
  { label: "Protein", value: "120–140 g" },
  { label: "Fiber", value: "30–35 g" },
  { label: "Water", value: "2.5–3 L" },
  { label: "Steps", value: "10,000+ (boxing walk)" },
  { label: "Fasting window", value: "~17 hrs (10 PM → 3 PM)" },
];

const CHECKIN_QUESTIONS = [
  "Hit 5 workouts this week?",
  "Stuck to the fasting window?",
  "Hit 120 g+ protein daily?",
  "Averaged 10k steps?",
  "Energy levels good (7+/10)?",
  "Digestion improved?",
];

type WeighIn = { date: string; weight: string };

export default function ProgressTab() {
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [checks, setChecks] = useState<boolean[]>(
    new Array(CHECKIN_QUESTIONS.length).fill(false)
  );

  function logWeight() {
    const trimmed = newWeight.trim();
    if (!trimmed) return;
    const entry: WeighIn = {
      date: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      weight: trimmed.includes("kg") ? trimmed : `${trimmed} kg`,
    };
    setWeighIns((prev) => [entry, ...prev]);
    setNewWeight("");
  }

  function toggleCheck(i: number) {
    setChecks((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  const checkScore = checks.filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Start weight", value: "88.5 kg" },
          { label: "Goal weight", value: "75 kg" },
          { label: "To lose", value: "13.5 kg" },
          { label: "Timeframe", value: "8 weeks" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[#e8ddd4] bg-white px-4 py-4 text-center"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a89280]">
              {s.label}
            </div>
            <div className="mt-1.5 text-xl font-semibold text-[#7B2D3E]">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Milestones */}
        <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
              Milestones
            </div>
            <div className="mt-0.5 text-sm font-medium text-[#1a0a0e]">
              Expected weight milestones
            </div>
          </div>
          <div className="divide-y divide-[#f2ece4]">
            {MILESTONES.map((m, i) => (
              <div
                key={m.week}
                className={[
                  "flex items-center justify-between px-5 py-3.5",
                  i === 0 ? "bg-[#fdf7f4]" : "",
                ].join(" ")}
              >
                <div>
                  <div
                    className={[
                      "text-[13px]",
                      i === 0 ? "font-semibold text-[#1a0a0e]" : "text-[#9a7e6f]",
                    ].join(" ")}
                  >
                    {m.week}
                  </div>
                  {m.phase && (
                    <div className="mt-0.5 text-[10px] text-[#c4a898]">
                      {m.phase} phase
                    </div>
                  )}
                </div>
                <span
                  className={[
                    "text-[13px] font-semibold",
                    i === 0
                      ? "text-[#7B2D3E]"
                      : i === MILESTONES.length - 1
                      ? "text-[#1D9E75]"
                      : "text-[#1a0a0e]",
                  ].join(" ")}
                >
                  {m.weight}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily targets */}
        <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
              Targets
            </div>
            <div className="mt-0.5 text-sm font-medium text-[#1a0a0e]">
              Daily non-negotiables
            </div>
          </div>
          <div className="divide-y divide-[#f2ece4]">
            {DAILY_TARGETS.map((t) => (
              <div
                key={t.label}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-[13px] text-[#9a7e6f]">{t.label}</span>
                <span className="text-[13px] font-medium text-[#1a0a0e]">
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly weigh-in log */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
            Weigh-in
          </div>
          <div className="mt-0.5 text-sm font-medium text-[#1a0a0e]">
            Monday morning log — before eating
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex gap-3">
            <input
              id="weight-input"
              type="number"
              step="0.1"
              min="40"
              max="200"
              title="Enter your weight in kg"
              placeholder="e.g. 86.5"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && logWeight()}
              className="flex-1 rounded-xl border border-[#e8ddd4] bg-[#fdf7f4] px-4 py-2.5 text-[13px] text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]/40 placeholder:text-[#c4a898]"
            />
            <button
              onClick={logWeight}
              disabled={!newWeight.trim()}
              className="rounded-xl bg-[#7B2D3E] px-5 py-2.5 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Log kg
            </button>
          </div>
          {weighIns.length > 0 && (
            <div className="mt-4 divide-y divide-[#f2ece4] rounded-xl border border-[#e8ddd4]">
              {weighIns.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-[12px] text-[#a89280]">{w.date}</span>
                  <span className="text-[13px] font-semibold text-[#7B2D3E]">
                    {w.weight}
                  </span>
                </div>
              ))}
            </div>
          )}
          {weighIns.length === 0 && (
            <p className="mt-3 text-[12px] text-[#c4a898]">
              No weigh-ins yet. Log your first one above — Monday mornings, fasted.
            </p>
          )}
        </div>
      </div>

      {/* Weekly check-in */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
                Weekly check-in
              </div>
              <div className="mt-0.5 text-sm font-medium text-[#1a0a0e]">
                How was this week?
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-[#7B2D3E]">
                {checkScore} / {CHECKIN_QUESTIONS.length}
              </div>
              <div className="text-[10px] text-[#a89280]">ticked off</div>
            </div>
          </div>
        </div>
        <div className="divide-y divide-[#f2ece4]">
          {CHECKIN_QUESTIONS.map((q, i) => (
            <button
              key={q}
              onClick={() => toggleCheck(i)}
              className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-[#fdf7f4]"
            >
              <div
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition",
                  checks[i]
                    ? "border-[#7B2D3E] bg-[#7B2D3E]"
                    : "border-[#e8ddd4] bg-white",
                ].join(" ")}
              >
                {checks[i] && (
                  <i
                    className="ti ti-check text-[10px] text-white"
                    aria-hidden="true"
                  />
                )}
              </div>
              <span
                className={[
                  "text-[13px]",
                  checks[i]
                    ? "text-[#a89280] line-through"
                    : "text-[#1a0a0e]",
                ].join(" ")}
              >
                {q}
              </span>
            </button>
          ))}
        </div>
        {checkScore === CHECKIN_QUESTIONS.length && (
          <div className="border-t border-[#e8ddd4] bg-[#f2ece4] px-5 py-3 text-center text-[13px] font-medium text-[#7B2D3E]">
            Perfect week — keep it up!
          </div>
        )}
      </div>
    </div>
  );
}
