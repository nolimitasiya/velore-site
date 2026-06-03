"use client";

import { useState } from "react";
import { WORKOUT_WEEKS } from "./wellnessData";

const TYPE_STYLES: Record<string, string> = {
  boxing: "border-[#7B2D3E]",
  strength: "border-[#378ADD]",
  rest: "border-[#e8ddd4]",
};

const TYPE_BADGE: Record<string, string> = {
  boxing: "bg-[#f2ece4] text-[#7B2D3E]",
  strength: "bg-[#E6F1FB] text-[#0C447C]",
  rest: "bg-[#f5f5f0] text-[#a89280]",
};

export default function WorkoutsTab() {
  const [weekIdx, setWeekIdx] = useState(0);
  const week = WORKOUT_WEEKS[weekIdx];

  return (
    <div>
      {/* Phase chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {WORKOUT_WEEKS.map((w, i) => (
          <button
            key={w.label}
            onClick={() => setWeekIdx(i)}
            className={[
              "rounded-full border px-4 py-1.5 text-[12px] font-medium transition",
              i === weekIdx
                ? "border-[#7B2D3E] bg-[#f2ece4] text-[#7B2D3E]"
                : "border-[#e8ddd4] bg-white text-[#9a7e6f] hover:border-[#7B2D3E]/30 hover:text-[#7B2D3E]",
            ].join(" ")}
          >
            {w.label}
            <span className="ml-1.5 text-[10px] opacity-60">
              {w.subtitle}
            </span>
          </button>
        ))}
      </div>

      {/* Days */}
      <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
            {week.label} · {week.subtitle}
          </div>
          <div className="mt-0.5 text-sm font-medium text-[#1a0a0e]">
            Weekly training plan
          </div>
        </div>
        <div className="divide-y divide-[#f2ece4]">
          {week.days.map((d) => (
            <div
              key={d.day}
              className={[
                "flex items-start gap-4 border-l-2 px-5 py-4",
                TYPE_STYLES[d.type],
              ].join(" ")}
            >
              <div className="w-24 shrink-0">
                <div className="text-[11px] font-semibold text-[#1a0a0e]">
                  {d.day}
                </div>
                <span
                  className={[
                    "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                    TYPE_BADGE[d.type],
                  ].join(" ")}
                >
                  {d.type}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1a0a0e]">
                  {d.title}
                </div>
                <div className="mt-0.5 text-[12px] leading-relaxed text-[#9a7e6f]">
                  {d.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step targets */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
            Steps
          </div>
          <div className="mt-0.5 text-sm font-medium text-[#1a0a0e]">
            Daily step targets — handled by your boxing walk
          </div>
        </div>
        <div className="divide-y divide-[#f2ece4]">
          {[
            { phase: "Week 1–2", target: "8,000 / day" },
            { phase: "Week 3–4", target: "9,000 / day" },
            { phase: "Week 5–6", target: "10,000 / day" },
            { phase: "Week 7–8", target: "10,000+ / day" },
          ].map((s) => (
            <div
              key={s.phase}
              className={[
                "flex items-center justify-between px-5 py-3",
                s.phase === week.label ? "bg-[#fdf7f4]" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "text-[13px]",
                  s.phase === week.label
                    ? "font-medium text-[#1a0a0e]"
                    : "text-[#9a7e6f]",
                ].join(" ")}
              >
                {s.phase}
              </span>
              <span
                className={[
                  "text-[13px] font-semibold",
                  s.phase === week.label ? "text-[#7B2D3E]" : "text-[#c4a898]",
                ].join(" ")}
              >
                {s.target}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
