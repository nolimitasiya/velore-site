import fs from "node:fs";
import path from "node:path";
import allCities from "all-the-cities";

type CityRow = {
  name: string;
  country: string; // ISO2
  population: number;
};

function normName(s: string) {
  return String(s ?? "").trim();
}

// Optional “always include” safety list (helps even if dataset has quirks)
const PRIORITY: Record<string, string[]> = {
  GB: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Edinburgh", "Liverpool", "Bristol"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg"],
  CH: ["Zürich", "Geneva", "Basel", "Lausanne", "Bern"],
  AE: ["Dubai", "Abu Dhabi", "Sharjah"],
};

function main() {
  const byCountry = new Map<string, CityRow[]>();

  for (const row of allCities as any[]) {
    const country = String(row.country ?? "").toUpperCase();
    const name = normName(row.name);
    if (!country || country.length !== 2 || !name) continue;

    const population = Number(row.population ?? 0) || 0;
    if (population <= 0) continue; // key difference: ignore “unknown pop” rows

    const arr = byCountry.get(country) ?? [];
    arr.push({ name, country, population });
    byCountry.set(country, arr);
  }

  const out: Record<string, string[]> = {};

  for (const [cc, arr] of byCountry.entries()) {
    // sort strictly by population desc
    arr.sort((a, b) => b.population - a.population);

    // dedupe + take top 50
    const seen = new Set<string>();
    const top: string[] = [];

    // 1) priority cities first (if present in dataset)
    const pr = PRIORITY[cc] ?? [];
    for (const name of pr) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        top.push(name);
        seen.add(key);
      }
    }

    // 2) then fill by population
    for (const c of arr) {
      const n = c.name;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      top.push(n);
      if (top.length >= 50) break;
    }

    // 3) always allow Other
    if (!top.includes("Other")) top.push("Other");
    out[cc] = top;
  }

  const outPath = path.join(process.cwd(), "lib", "cities-by-country.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`✅ Wrote cities for ${Object.keys(out).length} countries to lib/cities-by-country.json`);
}

main();
