"use client";

import { SCHEDULE_ITEMS } from "./wellnessData";

export default function ScheduleTab() {
  return (
    <div>
      {/* Fasting banner */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Fast starts", value: "10:00 PM" },
          { label: "Fast ends", value: "3:00 PM" },
          { label: "Duration", value: "~17 hours" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[#e8ddd4] bg-white px-4 py-3 text-center"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a89280]">
              {s.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-[#7B2D3E]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
            Daily rhythm
          </div>
          <div className="mt-0.5 text-sm font-medium text-[#1a0a0e]">
            Your full day, structured
          </div>
        </div>
        <div className="divide-y divide-[#f2ece4]">
          {SCHEDULE_ITEMS.map((item, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="w-[88px] shrink-0 pt-0.5 text-right text-[11px] font-medium text-[#a89280]">
                {item.time}
              </div>
              <div className="mt-1.5 shrink-0">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: item.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1a0a0e]">
                  {item.title}
                </div>
                <div className="mt-0.5 text-xs leading-relaxed text-[#9a7e6f]">
                  {item.desc}
                </div>
                {item.badge && (
                  <span className="mt-1.5 inline-block rounded-full bg-[#f2ece4] px-2.5 py-0.5 text-[10px] font-medium text-[#7B2D3E]">
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
