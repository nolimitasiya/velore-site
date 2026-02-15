// C:\Users\Asiya\projects\dalra\components\StorefrontFilters.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Region } from "@prisma/client";
import countries from "world-countries";

type FiltersResponse = {
  ok: boolean;
  countries: string[];
  regions: Region[];
};

function iso2NameMap() {
  const m = new Map<string, string>();
  for (const c of countries as any[]) {
    const code = String(c.cca2 ?? "").toUpperCase();
    const name = String(c.name?.common ?? "").trim();
    if (code && name) m.set(code, name);
  }
  return m;
}

export default function StorefrontFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [data, setData] = useState<FiltersResponse | null>(null);

  const region = (sp.get("region") ?? "").toUpperCase();
  const country = (sp.get("country") ?? "").toUpperCase();

  const nameByIso2 = useMemo(() => iso2NameMap(), []);

  useEffect(() => {
    fetch("/api/storefront/filters", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => setData({ ok: true, countries: [], regions: [] } as any));
  }, []);

  function setParam(key: "region" | "country", value: string) {
    const url = new URL(window.location.href);
    if (!value) url.searchParams.delete(key);
    else url.searchParams.set(key, value);

    // if country changes, region can remain (fine), but you can also clear region if you prefer:
    // if (key === "country") url.searchParams.delete("region");

    router.push(`${pathname}?${url.searchParams.toString()}`);
    router.refresh();
  }

  function clearAll() {
    const url = new URL(window.location.href);
    url.searchParams.delete("region");
    url.searchParams.delete("country");
    router.push(`${pathname}?${url.searchParams.toString()}`);
    router.refresh();
  }

  const regions = data?.regions ?? [];
  const countriesIso2 = data?.countries ?? [];

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">Shop by location</div>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs underline text-black/60 hover:text-black"
        >
          Clear
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <div className="text-xs text-black/60">Region</div>
          <select
            className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
            value={regions.includes(region as any) ? region : ""}
            onChange={(e) => setParam("region", e.target.value)}
          >
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs text-black/60">Country</div>
          <select
            className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
            value={countriesIso2.includes(country) ? country : ""}
            onChange={(e) => setParam("country", e.target.value)}
          >
            <option value="">All countries</option>
            {countriesIso2.map((cc) => (
              <option key={cc} value={cc}>
                {(nameByIso2.get(cc) ?? cc)} ({cc})
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
