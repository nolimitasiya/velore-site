"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import countriesLib from "world-countries";

type Opt = {
  value: string;
  label: string;
};

function unique(xs: string[]) {
  return Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean)));
}

function qpAll(sp: URLSearchParams, key: string) {
  return sp
    .getAll(key)
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function regionToContinent(region: string) {
  switch (region) {
    case "EUROPE":
      return "Europe";
    case "AFRICA":
      return "Africa";
    case "ASIA":
      return "Asia";
    case "NORTH_AMERICA":
      return "North America";
    case "SOUTH_AMERICA":
      return "South America";
    case "OCEANIA":
      return "Oceania";
    case "MIDDLE_EAST":
      return "Asia";
    default:
      return null;
  }
}

function buildRegionCountryMap() {
  const map = new Map<string, Set<string>>();

  for (const c of countriesLib as any[]) {
    const code = String(c.cca2 ?? "").toUpperCase();
    const continent = String(c.region ?? "").trim();

    if (!code || !continent) continue;

    const push = (key: string) => {
      if (!map.has(key)) map.set(key, new Set<string>());
      map.get(key)!.add(code);
    };

    if (continent === "Europe") push("EUROPE");
    if (continent === "Africa") push("AFRICA");
    if (continent === "Asia") push("ASIA");
    if (continent === "North America") push("NORTH_AMERICA");
    if (continent === "South America") push("SOUTH_AMERICA");
    if (continent === "Oceania") push("OCEANIA");
  }

  // Optional: treat Middle East as a subset of Asia by common countries
  [
    "AE", "SA", "QA", "KW", "BH", "OM", "JO", "LB", "SY", "IQ", "YE", "PS"
  ].forEach((code) => {
    if (!map.has("MIDDLE_EAST")) map.set("MIDDLE_EAST", new Set<string>());
    map.get("MIDDLE_EAST")!.add(code);
  });

  return map;
}

function summaryLabel(options: Opt[], values: string[], maxVisible = 2) {
  if (!values.length) return "All countries";

  const labels = values.map(
    (v) => options.find((o) => o.value === v)?.label ?? v
  );

  if (labels.length <= maxVisible) return labels.join(", ");
  return `${labels.slice(0, maxVisible).join(", ")} +${labels.length - maxVisible} more`;
}

export default function BrandFilters({
  regions,
  countries,
}: {
  regions: Opt[];
  countries: Opt[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const regionCountryMap = useMemo(() => buildRegionCountryMap(), []);

  const initialRegion = String(sp.get("region") ?? "").toUpperCase();
  const initialCountries = useMemo(
    () => unique(qpAll(sp, "country").map((v) => v.toUpperCase())),
    [sp]
  );

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"root" | "region" | "country">("root");
  const [draftRegion, setDraftRegion] = useState(initialRegion);
  const [draftCountries, setDraftCountries] = useState<string[]>(initialCountries);

  function openDrawer() {
    setDraftRegion(String(sp.get("region") ?? "").toUpperCase());
    setDraftCountries(unique(qpAll(sp, "country").map((v) => v.toUpperCase())));
    setPanel("root");
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
    setPanel("root");
  }

  const filteredCountryOptions = useMemo(() => {
    if (!draftRegion) return countries;

    const allowed = regionCountryMap.get(draftRegion);
    if (!allowed) return countries;

    return countries.filter((c) => allowed.has(c.value.toUpperCase()));
  }, [countries, draftRegion, regionCountryMap]);

  function apply() {
    const next = new URLSearchParams(sp.toString());

    next.delete("region");
    next.delete("country");

    if (draftRegion) next.set("region", draftRegion);

    const allowedCountrySet = new Set(
      filteredCountryOptions.map((c) => c.value.toUpperCase())
    );

    for (const c of unique(draftCountries).filter((x) => allowedCountrySet.has(x))) {
      next.append("country", c);
    }

    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    closeDrawer();
  }

  function clearAll() {
    setDraftRegion("");
    setDraftCountries([]);
  }

  function clearAllAndApply() {
    const next = new URLSearchParams(sp.toString());
    next.delete("region");
    next.delete("country");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    closeDrawer();
  }

  const chips = [
    ...(initialRegion
      ? [
          {
            key: `region:${initialRegion}`,
            label: regions.find((r) => r.value === initialRegion)?.label ?? initialRegion,
          },
        ]
      : []),
    ...initialCountries.map((c) => ({
      key: `country:${c}`,
      label: countries.find((x) => x.value === c)?.label ?? c,
    })),
  ];

return (
  <>
    <div className="w-full flex flex-wrap items-center justify-between gap-3">
      {chips.length > 0 ? (
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                const next = new URLSearchParams(sp.toString());

                if (c.key.startsWith("region:")) {
                  next.delete("region");
                  next.delete("country");
                } else if (c.key.startsWith("country:")) {
                  const value = c.key.slice("country:".length);
                  const kept = initialCountries.filter((x) => x !== value);
                  next.delete("country");
                  for (const v of kept) next.append("country", v);
                }

                const qs = next.toString();
                router.push(qs ? `${pathname}?${qs}` : pathname);
              }}
              className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.02]"
            >
              <span className="max-w-[220px] truncate">{c.label}</span>
              <span className="text-black/50 group-hover:text-black">×</span>
            </button>
          ))}

          <button
            onClick={clearAllAndApply}
            className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium hover:bg-black/[0.02]"
          >
            Clear all
          </button>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <button
        onClick={openDrawer}
        className="h-10 rounded-full border border-black/10 bg-white px-4 text-sm font-medium hover:bg-black/[0.02]"
      >
        Filter
      </button>
    </div>

    {open && (
      <div className="fixed inset-0 z-[80]">
        <button
          aria-label="Close filters"
          onClick={closeDrawer}
          className="absolute inset-0 bg-black/40"
        />

        <aside className="absolute left-0 top-0 h-full w-[min(420px,92vw)] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
            {panel !== "root" ? (
              <button
                onClick={() => setPanel("root")}
                className="text-sm font-medium"
                aria-label="Back"
              >
                ←
              </button>
            ) : (
              <div className="w-8" />
            )}

            <div className="text-base font-semibold tracking-wide">
              {panel === "root" ? "FILTER" : panel.toUpperCase()}
            </div>

            <button
              onClick={closeDrawer}
              aria-label="Close"
              className="text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="h-[calc(100%-120px)] overflow-y-auto">
            {panel === "root" && (
              <div className="divide-y divide-black/10">
                <FilterRow
                  label="Region"
                  valueLabel={
                    draftRegion
                      ? regions.find((r) => r.value === draftRegion)?.label ?? draftRegion
                      : "All"
                  }
                  onClick={() => setPanel("region")}
                />

                <FilterRow
                  label="Country"
                  valueLabel={summaryLabel(filteredCountryOptions, draftCountries)}
                  onClick={() => setPanel("country")}
                />
              </div>
            )}

            {panel === "region" && (
              <ChoiceListSingle
                options={regions}
                value={draftRegion}
                onPick={(v) => {
                  const nextRegion = v.toUpperCase();
                  setDraftRegion(nextRegion);
                  setDraftCountries([]);
                  setPanel("country");
                }}
                searchable
                searchPlaceholder="Search region…"
              />
            )}

            {panel === "country" && (
              <ChoiceListMulti
                options={filteredCountryOptions}
                value={draftCountries}
                onPick={(v) => setDraftCountries(v.map((x) => x.toUpperCase()))}
                searchable
                searchPlaceholder="Search country…"
              />
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-black/10 bg-white p-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={clearAll}
                className="h-12 rounded-none border border-black/20 bg-white text-sm font-semibold tracking-[0.15em]"
              >
                CLEAR
              </button>
              <button
                onClick={apply}
                className="h-12 rounded-none bg-black text-sm font-semibold tracking-[0.15em] text-white"
              >
                APPLY
              </button>
            </div>
          </div>
        </aside>
      </div>
    )}
  </>
);
}

function FilterRow({
  label,
  valueLabel,
  onClick,
}: {
  label: string;
  valueLabel: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full px-5 py-4 text-left hover:bg-black/[0.02]">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-sm text-black/60">{valueLabel}</div>
      </div>
    </button>
  );
}

function ChoiceListSingle({
  options,
  value,
  onPick,
  searchable,
  searchPlaceholder,
}: {
  options: Opt[];
  value: string;
  onPick: (v: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!searchable || !qq) return options;
    return options.filter((o) => o.label.toLowerCase().includes(qq));
  }, [options, q, searchable]);

  return (
    <div>
      {searchable && (
        <div className="border-b border-black/10 px-5 py-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder || "Search…"}
            className="h-11 w-full rounded-xl border border-black/10 px-3 text-sm"
          />
        </div>
      )}

      <div className="divide-y divide-black/10">
        <button
          onClick={() => onPick("")}
          className="w-full px-5 py-4 text-left hover:bg-black/[0.02]"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm">All</div>
            {!value && <span className="text-sm">✓</span>}
          </div>
        </button>

        {filtered.map((o) => (
          <button
            key={o.value}
            onClick={() => onPick(o.value)}
            className="w-full px-5 py-4 text-left hover:bg-black/[0.02]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">{o.label}</div>
              {value === o.value && <span className="text-sm">✓</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChoiceListMulti({
  options,
  value,
  onPick,
  searchable,
  searchPlaceholder,
}: {
  options: Opt[];
  value: string[];
  onPick: (v: string[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!searchable || !qq) return options;
    return options.filter((o) => o.label.toLowerCase().includes(qq));
  }, [options, q, searchable]);

  const selected = new Set(value);

  function toggle(v: string) {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onPick(Array.from(next));
  }

  return (
    <div>
      {searchable && (
        <div className="border-b border-black/10 px-5 py-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder || "Search…"}
            className="h-11 w-full rounded-xl border border-black/10 px-3 text-sm"
          />
        </div>
      )}

      <div className="divide-y divide-black/10 overflow-y-auto pb-28">
        <button
          onClick={() => onPick([])}
          className="w-full px-5 py-4 text-left hover:bg-black/[0.02]"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm">All</div>
            {value.length === 0 && <span className="text-sm">✓</span>}
          </div>
        </button>

        {filtered.map((o) => (
          <button
            key={o.value}
            onClick={() => toggle(o.value)}
            className="w-full px-5 py-4 text-left hover:bg-black/[0.02]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">{o.label}</div>
              {selected.has(o.value) && <span className="text-sm">✓</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}