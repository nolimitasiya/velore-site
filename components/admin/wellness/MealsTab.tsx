"use client";

import { useState } from "react";
import { MEALS, type Meal } from "./wellnessData";

function MealDetail({ meal, onBack }: { meal: Meal; onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-[13px] text-[#a89280] transition hover:text-[#7B2D3E]"
      >
        <i className="ti ti-arrow-left text-[14px]" aria-hidden="true" />
        Back to meals
      </button>

      {/* Hero */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-[#e8ddd4] bg-[#fdf7f4]">
        <div className="border-b border-[#e8ddd4] bg-[#f2ece4] px-6 py-6 text-center">
          <div className="emoji text-4xl">{meal.icon}</div>
          <h2 className="mt-3 font-heading text-lg font-semibold text-[#1a0a0e]">
            {meal.name}
          </h2>
          <div className="mt-1 text-xs text-[#a89280]">
            {meal.slot} · ~{meal.kcal} kcal
          </div>
          <div className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[#7B2D3E]">
            {meal.tag}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Ingredients */}
        <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
              What you need
            </div>
            <div className="mt-0.5 text-sm font-medium text-[#1a0a0e]">
              Ingredients
            </div>
          </div>
          <div className="divide-y divide-[#f2ece4]">
            {meal.ingredients.map((ing) => (
              <div
                key={ing.name}
                className="flex items-center justify-between px-5 py-3"
              >
                <span className="text-[13px] text-[#1a0a0e]">{ing.name}</span>
                <span className="text-[12px] text-[#a89280]">{ing.qty}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
            <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
                Macros
              </div>
              <div className="mt-0.5 text-sm font-medium text-[#1a0a0e]">
                Nutrition breakdown
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-y divide-[#f2ece4]">
              {meal.nutrition.map((n) => (
                <div key={n.label} className="px-4 py-3 text-center">
                  <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#a89280]">
                    {n.label}
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-[#1a0a0e]">
                    {n.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-[#e8ddd4] bg-white px-5 py-4">
            <div className="mb-2 flex items-center gap-2">
              <i
                className="ti ti-bulb text-[15px] text-[#7B2D3E]"
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B2D3E]/70">
                How to make it
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-[#9a7e6f]">
              {meal.tips}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MealsTab() {
  const [activeMeal, setActiveMeal] = useState<Meal | null>(null);

  if (activeMeal) {
    return (
      <MealDetail meal={activeMeal} onBack={() => setActiveMeal(null)} />
    );
  }

  const meal1 = MEALS.filter((m) => m.slot === "Meal 1");
  const meal2 = MEALS.filter((m) => m.slot === "Meal 2");

  return (
    <div className="space-y-6">
      {/* Protein drink card */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#e8ddd4] bg-white px-5 py-4">
        <div className="emoji text-2xl">💧</div>
        <div>
          <div className="text-[13px] font-medium text-[#1a0a0e]">
            Clear protein drink — 8:00 PM
          </div>
          <div className="mt-0.5 text-[11px] text-[#a89280]">
            ~130 kcal · 35 g protein · drink immediately after boxing
          </div>
        </div>
        <div className="ml-auto rounded-full bg-[#f2ece4] px-3 py-1 text-[11px] font-medium text-[#7B2D3E]">
          every day
        </div>
      </div>

      {/* Meal 1 */}
      <div>
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
          Meal 1 — break fast · 3:00 PM · pick one
        </div>
        <div className="space-y-2">
          {meal1.map((meal) => (
            <button
              key={meal.id}
              onClick={() => setActiveMeal(meal)}
              className="group flex w-full items-center gap-4 rounded-2xl border border-[#e8ddd4] bg-white px-5 py-4 text-left transition hover:border-[#7B2D3E]/40 hover:bg-[#fdf7f4]"
            >
              <div className="emoji text-2xl">{meal.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1a0a0e]">
                  {meal.name}
                </div>
                <div className="mt-0.5 text-[11px] text-[#a89280]">
                  ~{meal.kcal} kcal · {meal.nutrition[1].value} protein ·{" "}
                  {meal.tag.split("·")[0].trim()}
                </div>
              </div>
              <i
                className="ti ti-chevron-right text-[14px] text-[#c4a898] transition group-hover:text-[#7B2D3E]"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Meal 2 */}
      <div>
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
          Meal 2 — post-workout dinner · 9:00 PM · pick one
        </div>
        <div className="space-y-2">
          {meal2.map((meal) => (
            <button
              key={meal.id}
              onClick={() => setActiveMeal(meal)}
              className="group flex w-full items-center gap-4 rounded-2xl border border-[#e8ddd4] bg-white px-5 py-4 text-left transition hover:border-[#7B2D3E]/40 hover:bg-[#fdf7f4]"
            >
              <div className="emoji text-2xl">{meal.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1a0a0e]">
                  {meal.name}
                </div>
                <div className="mt-0.5 text-[11px] text-[#a89280]">
                  ~{meal.kcal} kcal · {meal.nutrition[1].value} protein ·{" "}
                  {meal.tag.split("·")[0].trim()}
                </div>
              </div>
              <i
                className="ti ti-chevron-right text-[14px] text-[#c4a898] transition group-hover:text-[#7B2D3E]"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
