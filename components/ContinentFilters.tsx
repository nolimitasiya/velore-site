// C:\Users\Asiya\projects\dalra\components\ContinentFilters.tsx
"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Opt = { value: string; label: string };

type Props = {
  brands: Opt[];
  countries: Opt[];
  types: Opt[];
  colors: Opt[];
  materials?: Opt[];
};

type PanelKey =
  | "root"
  | "type"
  | "brand"
  | "country"
  | "color"
  | "material"
  | "price"
  | "offers"; // ✅ NEW

function qpFirst(sp: URLSearchParams, key: string) {
  return sp.get(key) ?? "";
}

function labelFor(opts: Opt[] | undefined, value: string) {
  if (!opts || !value) return "";
  return opts.find((o) => o.value === value)?.label ?? value;
}

function priceLabel(min: string, max: string) {
  const a = String(min || "").trim();
  const b = String(max || "").trim();
  if (!a && !b) return "All";
  if (a && !b) return `From ${a}`;
  if (!a && b) return `Up to ${b}`;
  return `${a} – ${b}`;
}

function truthyParam(v: string) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export default function ContinentFilters({
  brands,
  countries,
  types,
  colors,
  materials = [],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<PanelKey>("root");

  const [draft, setDraft] = useState(() => ({
    type: qpFirst(sp, "type"),
    brand: qpFirst(sp, "brand"),
    country: qpFirst(sp, "country"),
    color: qpFirst(sp, "color"),
    material: qpFirst(sp, "material"),
    min: qpFirst(sp, "min"),
    max: qpFirst(sp, "max"),
    sort: qpFirst(sp, "sort") || "new",

    // ✅ NEW
    sale: truthyParam(qpFirst(sp, "sale")) ? "1" : "",
    next_day: truthyParam(qpFirst(sp, "next_day")) ? "1" : "",
  }));

  function syncDraftFromUrl() {
    setDraft({
      type: qpFirst(sp, "type"),
      brand: qpFirst(sp, "brand"),
      country: qpFirst(sp, "country"),
      color: qpFirst(sp, "color"),
      material: qpFirst(sp, "material"),
      min: qpFirst(sp, "min"),
      max: qpFirst(sp, "max"),
      sort: qpFirst(sp, "sort") || "new",

      // ✅ NEW
      sale: truthyParam(qpFirst(sp, "sale")) ? "1" : "",
      next_day: truthyParam(qpFirst(sp, "next_day")) ? "1" : "",
    });
  }

  function openDrawer() {
    syncDraftFromUrl();
    setPanel("root");
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
    setPanel("root");
  }

  function apply() {
    const next = new URLSearchParams(sp.toString());

    const setOrDelete = (key: string, value: string) => {
      const v = String(value ?? "").trim();
      if (v) next.set(key, v);
      else next.delete(key);
    };

    setOrDelete("type", draft.type);
    setOrDelete("brand", draft.brand);
    setOrDelete("country", draft.country);
    setOrDelete("color", draft.color);
    setOrDelete("material", draft.material);
    setOrDelete("min", draft.min);
    setOrDelete("max", draft.max);
    setOrDelete("sort", draft.sort);

    // ✅ NEW
    setOrDelete("sale", draft.sale);
    setOrDelete("next_day", draft.next_day);

    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    closeDrawer();
  }

  function clearAll() {
    setDraft({
      type: "",
      brand: "",
      country: "",
      color: "",
      material: "",
      min: "",
      max: "",
      sort: "new",

      // ✅ NEW
      sale: "",
      next_day: "",
    });
  }

  function removeOne(
    key:
      | "type"
      | "brand"
      | "country"
      | "color"
      | "material"
      | "price"
      | "sale"
      | "next_day"
  ) {
    const next = new URLSearchParams(sp.toString());

    if (key === "price") {
      next.delete("min");
      next.delete("max");
      setDraft((d) => ({ ...d, min: "", max: "" }));
    } else {
      next.delete(key);
      setDraft((d) => ({ ...d, [key]: "" } as any));
    }

    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAllAndApply() {
    const next = new URLSearchParams(sp.toString());
    [
      "type",
      "brand",
      "country",
      "color",
      "material",
      "min",
      "max",
      "sale",
      "next_day",
    ].forEach((k) => next.delete(k));
    next.set("sort", "new");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    clearAll();
  }

  const chips = useMemo(() => {
    const out: Array<{ key: any; label: string }> = [];
    if (draft.type) out.push({ key: "type", label: labelFor(types, draft.type) || draft.type });
    if (draft.brand) out.push({ key: "brand", label: labelFor(brands, draft.brand) || draft.brand });
    if (draft.country) out.push({ key: "country", label: draft.country });
    if (draft.color) out.push({ key: "color", label: labelFor(colors, draft.color) || draft.color });
    if (draft.material)
      out.push({ key: "material", label: labelFor(materials, draft.material) || draft.material });
    if (draft.min || draft.max) out.push({ key: "price", label: priceLabel(draft.min, draft.max) });

    // ✅ NEW
    if (draft.sale) out.push({ key: "sale", label: "Sale" });
    if (draft.next_day) out.push({ key: "next_day", label: "Next Day Delivery" });

    return out;
  }, [draft, brands, types, colors, materials]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <label className="sr-only" htmlFor="sort">
            Sort
          </label>
          <select
            id="sort"
            aria-label="Sort"
            className="h-10 rounded-full border border-black/10 bg-white px-3 text-sm"
            value={draft.sort}
            onChange={(e) => {
              const v = e.target.value;
              setDraft((d) => ({ ...d, sort: v }));

              const next = new URLSearchParams(sp.toString());
              next.set("sort", v);
              const qs = next.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname);
            }}
          >
            <option value="new">Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>

          <button
            onClick={openDrawer}
            className="h-10 rounded-full border border-black/10 bg-white px-4 text-sm font-medium hover:bg-black/[0.02]"
          >
            Filter
          </button>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => removeOne(c.key)}
                className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.02]"
                aria-label={`Remove filter ${c.label}`}
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
        )}
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
                <button onClick={() => setPanel("root")} className="text-sm font-medium" aria-label="Back">
                  ←
                </button>
              ) : (
                <div className="w-8" />
              )}

              <div className="text-base font-semibold tracking-wide">
                {panel === "root" ? "FILTER" : panel.toUpperCase()}
              </div>

              <button onClick={closeDrawer} aria-label="Close" className="text-xl leading-none">
                ×
              </button>
            </div>

            <div className="h-[calc(100%-120px)] overflow-y-auto">
              {panel === "root" && (
                <div className="divide-y divide-black/10">
                  <FilterRow label="Product Type" valueLabel={labelFor(types, draft.type) || "All"} onClick={() => setPanel("type")} />
                  <FilterRow label="Brand" valueLabel={labelFor(brands, draft.brand) || "All"} onClick={() => setPanel("brand")} />
                  <FilterRow label="Country" valueLabel={draft.country || "All"} onClick={() => setPanel("country")} />
                  <FilterRow label="Colour" valueLabel={labelFor(colors, draft.color) || "All"} onClick={() => setPanel("color")} />
                  {materials.length > 0 && (
                    <FilterRow label="Material" valueLabel={labelFor(materials, draft.material) || "All"} onClick={() => setPanel("material")} />
                  )}

                  {/* ✅ NEW */}
                  <FilterRow
                    label="Offers & Delivery"
                    valueLabel={
                      [draft.sale ? "Sale" : null, draft.next_day ? "Next day" : null].filter(Boolean).join(" • ") || "All"
                    }
                    onClick={() => setPanel("offers")}
                  />

                  <FilterRow label="Price" valueLabel={priceLabel(draft.min, draft.max)} onClick={() => setPanel("price")} />
                </div>
              )}

              {panel === "type" && (
                <ChoiceList options={types} value={draft.type} onPick={(v) => setDraft((d) => ({ ...d, type: v }))} />
              )}

              {panel === "brand" && (
                <ChoiceList
                  options={brands}
                  value={draft.brand}
                  onPick={(v) => setDraft((d) => ({ ...d, brand: v }))}
                  searchable
                  searchPlaceholder="Search brand…"
                />
              )}

              {panel === "country" && (
                <ChoiceList options={countries} value={draft.country} onPick={(v) => setDraft((d) => ({ ...d, country: v }))} />
              )}

              {panel === "color" && (
                <ChoiceList
                  options={colors}
                  value={draft.color}
                  onPick={(v) => setDraft((d) => ({ ...d, color: v }))}
                  searchable
                  searchPlaceholder="Search colour…"
                />
              )}

              {panel === "material" && (
                <ChoiceList
                  options={materials}
                  value={draft.material}
                  onPick={(v) => setDraft((d) => ({ ...d, material: v }))}
                  searchable
                  searchPlaceholder="Search material…"
                />
              )}

              {/* ✅ NEW offers toggles */}
              {panel === "offers" && (
                <OffersPanel
                  saleOn={!!draft.sale}
                  nextDayOn={!!draft.next_day}
                  onToggleSale={() => setDraft((d) => ({ ...d, sale: d.sale ? "" : "1" }))}
                  onToggleNextDay={() => setDraft((d) => ({ ...d, next_day: d.next_day ? "" : "1" }))}
                />
              )}

              {panel === "price" && (
                <PricePanel min={draft.min} max={draft.max} onChange={(next) => setDraft((d) => ({ ...d, ...next }))} />
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 border-t border-black/10 bg-white p-4">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={clearAll} className="h-12 rounded-none border border-black/20 bg-white text-sm font-semibold tracking-[0.15em]">
                  CLEAR
                </button>
                <button onClick={apply} className="h-12 rounded-none bg-black text-sm font-semibold tracking-[0.15em] text-white">
                  VIEW ITEMS
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

function ChoiceList({
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
        <div className="px-5 py-4 border-b border-black/10">
          <label className="sr-only" htmlFor="filter-search">
            Search
          </label>
          <input
            id="filter-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder || "Search…"}
            className="h-11 w-full rounded-xl border border-black/10 px-3 text-sm"
          />
        </div>
      )}

      <div className="divide-y divide-black/10">
        <button onClick={() => onPick("")} className="w-full px-5 py-4 text-left hover:bg-black/[0.02]">
          <div className="flex items-center justify-between">
            <div className="text-sm">All</div>
            {value === "" && <span className="text-sm">✓</span>}
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

function OffersPanel({
  saleOn,
  nextDayOn,
  onToggleSale,
  onToggleNextDay,
}: {
  saleOn: boolean;
  nextDayOn: boolean;
  onToggleSale: () => void;
  onToggleNextDay: () => void;
}) {
  return (
    <div className="p-5 space-y-3">
      <div className="text-sm text-black/60">Choose offers and delivery options.</div>

      <button
        onClick={onToggleSale}
        className="w-full rounded-xl border border-black/10 px-4 py-3 text-left hover:bg-black/[0.02]"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Sale</div>
          <div className="text-sm">{saleOn ? "✓" : ""}</div>
        </div>
      </button>

      <button
        onClick={onToggleNextDay}
        className="w-full rounded-xl border border-black/10 px-4 py-3 text-left hover:bg-black/[0.02]"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Next Day Delivery</div>
          <div className="text-sm">{nextDayOn ? "✓" : ""}</div>
        </div>
      </button>
    </div>
  );
}

function PricePanel({
  min,
  max,
  onChange,
}: {
  min: string;
  max: string;
  onChange: (next: { min: string; max: string }) => void;
}) {
  return (
    <div className="p-5 space-y-4">
      <div className="text-sm text-black/60">Enter min/max. (Leave blank for no limit)</div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-black/60 mb-1" htmlFor="minPrice">
            Min
          </label>
          <input
            id="minPrice"
            inputMode="numeric"
            value={min}
            onChange={(e) => onChange({ min: e.target.value, max })}
            className="h-11 w-full rounded-xl border border-black/10 px-3 text-sm"
            placeholder="e.g. 20"
          />
        </div>

        <div>
          <label className="block text-xs text-black/60 mb-1" htmlFor="maxPrice">
            Max
          </label>
          <input
            id="maxPrice"
            inputMode="numeric"
            value={max}
            onChange={(e) => onChange({ min, max: e.target.value })}
            className="h-11 w-full rounded-xl border border-black/10 px-3 text-sm"
            placeholder="e.g. 200"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {[
          { label: "Under 50", min: "", max: "50" },
          { label: "50–100", min: "50", max: "100" },
          { label: "100–200", min: "100", max: "200" },
          { label: "200+", min: "200", max: "" },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => onChange({ min: p.min, max: p.max })}
            className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs hover:bg-black/[0.02]"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
