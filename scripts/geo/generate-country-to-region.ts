// scripts/geo/generate-country-to-region.ts
import fs from "node:fs";
import path from "node:path";
import countries from "world-countries";

type Region =
  | "EUROPE"
  | "AFRICA"
  | "ASIA"
  | "NORTH_AMERICA"
  | "SOUTH_AMERICA"
  | "OCEANIA"
  | "MIDDLE_EAST";

// Map continent string → your Prisma enum
const CONTINENT_TO_REGION: Record<string, Region> = {
  Europe: "EUROPE",
  Africa: "AFRICA",
  Asia: "ASIA",
  "North America": "NORTH_AMERICA",
  "South America": "SOUTH_AMERICA",
  Oceania: "OCEANIA",
};

// Middle East override (subset of Asia)
const MIDDLE_EAST_ISO2 = new Set([
  "AE","SA","QA","KW","BH","OM","YE",
  "JO","LB","SY","IQ","IR","IL","PS","TR",
]);

function main() {
  const out: Record<string, Region> = {};

  for (const c of countries as any[]) {
    const iso2 = String(c.cca2 ?? "").toUpperCase();
    const continent = String(c.region ?? "").trim();

    if (!iso2 || iso2.length !== 2) continue;

    // Override for Middle East
    if (MIDDLE_EAST_ISO2.has(iso2)) {
      out[iso2] = "MIDDLE_EAST";
      continue;
    }

    const region = CONTINENT_TO_REGION[continent];
    if (region) out[iso2] = region;
  }

  const outPath = path.join(process.cwd(), "lib", "country-to-region.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

  console.log(
    `✅ Wrote ${Object.keys(out).length} country→region mappings to lib/country-to-region.json`
  );
}

main();
