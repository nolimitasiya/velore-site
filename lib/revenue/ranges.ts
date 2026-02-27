// lib/revenue/ranges.ts
export type RangeKey = "today" | "7d" | "30d";

export function parseRange(input: string | null | undefined): RangeKey {
  const r = String(input ?? "").toLowerCase();
  if (r === "today" || r === "7d" || r === "30d") return r;
  return "30d";
}

// returns a [gte, lt] window (lt is exclusive)
export function rangeWindow(range: RangeKey) {
  const now = new Date();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d: Date, days: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };

  if (range === "today") {
    const gte = startOfDay(now);
    const lt = addDays(gte, 1);
    return { gte, lt };
  }

  if (range === "7d") {
    const gte = startOfDay(addDays(now, -6)); // today + previous 6 days
    const lt = addDays(startOfDay(now), 1);
    return { gte, lt };
  }

  // 30d
  const gte = startOfDay(addDays(now, -29));
  const lt = addDays(startOfDay(now), 1);
  return { gte, lt };
}

// month window for AffiliateEarning.month (first-of-month)
export function monthWindowForRange(gte: Date, lt: Date) {
  const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const g = monthStart(gte);
  const l = monthStart(lt); // exclusive
  return { gteMonth: g, ltMonth: l };
}