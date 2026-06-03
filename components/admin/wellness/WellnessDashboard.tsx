"use client";

import { useState } from "react";
import ScheduleTab from "./ScheduleTab";
import MealsTab from "./MealsTab";
import PrayerTab from "./PrayerTab";
import WorkoutsTab from "./WorkoutsTab";
import ProgressTab from "./ProgressTab";

type Tab = "schedule" | "meals" | "prayer" | "workouts" | "progress";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "schedule", label: "Schedule", icon: "ti-clock" },
  { id: "meals", label: "Meals", icon: "ti-bowl" },
  { id: "prayer", label: "Prayer & Quran", icon: "ti-moon" },
  { id: "workouts", label: "Workouts", icon: "ti-barbell" },
  { id: "progress", label: "Progress", icon: "ti-chart-line" },
];

export default function WellnessDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("schedule");

  return (
    <div className="min-h-screen bg-[#faf8f4]">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6 md:p-8">

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Personal
              </div>
              <h1 className="mt-1 font-heading text-3xl font-semibold text-white">
                My wellness
              </h1>
              <p className="mt-1 text-sm text-white/60">
                8-week transformation — schedule, meals, prayer & progress.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-2.5 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Start
                </div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  88.5 kg
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-2.5 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Goal
                </div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  75 kg
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-2.5 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Time
                </div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  8 weeks
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab nav */}
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[#e8ddd4] bg-white p-1.5 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition",
                activeTab === tab.id
                  ? "bg-[#7B2D3E] text-white"
                  : "text-[#9a7e6f] hover:bg-[#f2ece4] hover:text-[#7B2D3E]",
              ].join(" ")}
            >
              <i
                className={`ti ${tab.icon} text-[15px]`}
                aria-hidden="true"
              />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "schedule" && <ScheduleTab />}
          {activeTab === "meals" && <MealsTab />}
          {activeTab === "prayer" && <PrayerTab />}
          {activeTab === "workouts" && <WorkoutsTab />}
          {activeTab === "progress" && <ProgressTab />}
        </div>

      </div>
    </div>
  );
}
