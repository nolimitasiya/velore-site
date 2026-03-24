"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Region } from "@prisma/client";
import countries from "world-countries";

import ContinentFilters from "@/components/ContinentFilters";

type Opt = { value: string; label: string };

type FiltersResponse = {
  ok: boolean;
  countries: string[];
  regions: Region[];
  brands: Opt[];
  types: Opt[];
  styles: Opt[];
  sizes: Opt[];
  colors: Opt[];
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

function prettyEnumLabel(v: string) {
  const s = String(v ?? "").replaceAll("_", " ").toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function getAllParams(sp: URLSearchParams, key: string) {
  return Array.from(
    new Set(
      sp
        .getAll(key)
        .flatMap((v) => String(v).split(","))
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

export default function StorefrontFilters({
  showLocation = true,
  showCountries = true,
}: {
  showLocation?: boolean;
  showCountries?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [data, setData] = useState<FiltersResponse | null>(null);

  const region = (sp.get("region") ?? "").toUpperCase();
  const country = (sp.get("country") ?? "").toUpperCase();

  const selectedTypes = getAllParams(sp, "type").map((v) => v.toUpperCase());

  const nameByIso2 = useMemo(() => iso2NameMap(), []);

  useEffect(() => {
    const qs = new URLSearchParams();

    for (const type of selectedTypes) {
      qs.append("type", type);
    }

    fetch(`/api/storefront/filters?${qs.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() =>
        setData({
          ok: true,
          countries: [],
          regions: [],
          brands: [],
          types: [],
          styles: [],
          sizes: [],
          colors: [],
        })
      );
  }, [selectedTypes.join("|")]);

  function setParam(key: string, value: string) {
    const url = new URL(window.location.href);
    if (!value) url.searchParams.delete(key);
    else url.searchParams.set(key, value);

    router.push(`${pathname}?${url.searchParams.toString()}`);
    router.refresh();
  }

  function clearAll() {
    const url = new URL(window.location.href);
    [
      "region",
      "country",
      "type",
      "style",
      "brand",
      "color",
      "size",
      "min",
      "max",
      "sale",
      "next_day",
    ].forEach((k) => url.searchParams.delete(k));

    router.push(`${pathname}?${url.searchParams.toString()}`);
    router.refresh();
  }

  const regions = data?.regions ?? [];
  const countriesIso2 = data?.countries ?? [];

  const countryOptions: Opt[] = useMemo(() => {
    return countriesIso2
      .slice()
      .sort()
      .map((cc) => ({
        value: cc,
        label: nameByIso2.get(cc) ?? cc,
      }));
  }, [countriesIso2, nameByIso2]);

  const typeOptions: Opt[] = useMemo(() => {
    return (data?.types ?? []).map((t) => ({
      value: t.value,
      label: prettyEnumLabel(t.value),
    }));
  }, [data?.types]);

    return (
    <div className="space-y-4">
      {showLocation && (
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
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
                value={regions.includes(region as any) ? region : ""}
                onChange={(e) => setParam("region", e.target.value)}
              >
                <option value="">All regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {prettyEnumLabel(r)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-xs text-black/60">Country</div>
              <select
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
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
      )}

      <ContinentFilters
  brands={data?.brands ?? []}
  countries={showCountries ? countryOptions : []}
  types={typeOptions}
  styles={data?.styles ?? []}
  colors={data?.colors ?? []}
  sizes={data?.sizes ?? []}
  showCountries={showCountries}
/>
    </div>
  );
}