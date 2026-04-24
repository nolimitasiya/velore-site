"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";


type Opt = { value: string; label: string };

type Props = {
  brands: Opt[];
  countries: Opt[];
  types: Opt[];
  styles?: Opt[];
  colors: Opt[];
  sizes?: Opt[];
  showCountries?: boolean;
};

type PanelKey =
  | "root"
  | "type"
  | "style"
  | "brand"
  | "country"
  | "color"
  | "size"
  | "price"
  | "offers";


  const PANEL_LABELS: Record<PanelKey, string> = {
  root: "FILTER",
  type: "CATEGORY",
  style: "STYLE",
  brand: "BRAND",
  country: "COUNTRY",
  color: "COLOUR",
  size: "SIZE",
  price: "PRICE",
  offers: "OFFERS",
};

type Draft = {
  types: string[];
  styles: string[];
  brands: string[];
  countries: string[];
  colors: string[];
  sizes: string[];
  min: string;
  max: string;
  sort: string;
  sale: string;
};

function qpAll(sp: URLSearchParams, key: string) {
  return sp
    .getAll(key)
    .flatMap((v) => String(v).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildLookup(options: Opt[]) {
  const m = new Map<string, string>();
  for (const o of options) {
    m.set(o.value.toUpperCase(), o.label);
  }
  return m;
}

function labelFor(opts: Opt[] | undefined, value: string) {
  if (!opts || !value) return "";
  return opts.find((o) => o.value === value)?.label ?? value;
}

function labelsFor(opts: Opt[] | undefined, values: string[]) {
  return values.map((v) => labelFor(opts, v) || v);
}

function summaryLabel(opts: Opt[] | undefined, values: string[], maxVisible = 3) {
  if (!values.length) return "All";

  const labels = labelsFor(opts, values);

  if (labels.length <= maxVisible) {
    return labels.join(", ");
  }

  return `${labels.slice(0, maxVisible).join(", ")} +${labels.length - maxVisible} more`;
}

function offersLabel(sale: string) {
  return sale ? "Sale" : "All";
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

function unique(xs: string[]) {
  return Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean)));
}

function appendMulti(next: URLSearchParams, key: string, values: string[]) {
  next.delete(key);
  for (const value of unique(values)) {
    next.append(key, value);
  }
}

export default function ContinentFilters({
  brands,
  countries,
  types,
  styles = [],
  colors,
  sizes = [],
  showCountries = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const countryLookup = useMemo(() => buildLookup(countries), [countries]);

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<PanelKey>("root");

  const [liveStyles, setLiveStyles] = useState<Opt[]>(styles);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [stylesReady, setStylesReady] = useState(false);

const [previewCount, setPreviewCount] = useState<number | null>(null);
const [countLoading, setCountLoading] = useState(false);


  const [draft, setDraft] = useState<Draft>(() => ({
    types: unique(qpAll(sp, "type").map((v) => v.toUpperCase())),
    styles: unique(qpAll(sp, "style").map((v) => v.toLowerCase())),
    brands: unique(qpAll(sp, "brand")),
    countries: showCountries
  ? unique(qpAll(sp, "country").map((v) => v.toUpperCase()))
  : [],
    colors: unique(qpAll(sp, "color").map((v) => v.toLowerCase())),
    sizes: unique(qpAll(sp, "size").map((v) => v.toLowerCase())),
    min: sp.get("min") ?? "",
    max: sp.get("max") ?? "",
    sort: sp.get("sort") ?? "new",
    sale: truthyParam(sp.get("sale") ?? "") ? "1" : "",
  }));

 useEffect(() => {
  // Only sync from props when drawer is CLOSED
  if (!open) {
    setLiveStyles(styles);
  }
}, [styles, open]);

 useEffect(() => {
  if (!open) return;

  const controller = new AbortController();

  async function loadStyles() {
    const selectedTypes = unique(draft.types.map((v) => v.toUpperCase()));

    setStylesReady(false);
    setStylesLoading(true);

    if (!selectedTypes.length) {
      setLiveStyles(styles);
      setDraft((d) => ({ ...d, styles: [] }));
      setStylesReady(true);
      setStylesLoading(false);
      return;
    }

    try {
      const qs = new URLSearchParams();
      for (const t of selectedTypes) {
        qs.append("type", t);
      }

      const res = await fetch(`/api/storefront/filters?${qs.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setLiveStyles([]);
        setStylesReady(true);
        return;
      }

      const nextStyles = Array.isArray(json.styles) ? json.styles : [];
      setLiveStyles(nextStyles);

      setDraft((d) => {
        if (!d.styles.length) return d;

        const allowed = new Set(nextStyles.map((s: Opt) => s.value));
        const filteredSelected = d.styles.filter((s) => allowed.has(s));

        if (filteredSelected.length === d.styles.length) return d;
        return { ...d, styles: filteredSelected };
      });

      setStylesReady(true);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setLiveStyles(styles);
        setStylesReady(true);
      }
    } finally {
      setStylesLoading(false);
    }
  }

  loadStyles();
  return () => controller.abort();
}, [open, draft.types, styles]);

  useEffect(() => {
  if (!open) return;

  const controller = new AbortController();

  async function loadPreviewCount() {
    try {
      setCountLoading(true);

      const qs = new URLSearchParams();
      qs.set("pathname", pathname);

      for (const v of draft.types) qs.append("type", v);
      for (const v of draft.styles) qs.append("style", v);
      for (const v of draft.brands) qs.append("brand", v);
      for (const v of draft.countries) qs.append("country", v);
      for (const v of draft.colors) qs.append("color", v);
      for (const v of draft.sizes) qs.append("size", v);

      if (draft.min.trim()) qs.set("min", draft.min.trim());
      if (draft.max.trim()) qs.set("max", draft.max.trim());
      if (draft.sort.trim()) qs.set("sort", draft.sort.trim());
      if (draft.sale.trim()) qs.set("sale", draft.sale.trim());

      const res = await fetch(`/api/storefront/count?${qs.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) return;

      setPreviewCount(typeof json.count === "number" ? json.count : 0);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setPreviewCount(null);
      }
    } finally {
      setCountLoading(false);
    }
  }

  loadPreviewCount();

  return () => controller.abort();
}, [
  open,
  pathname,
  draft.types,
  draft.styles,
  draft.brands,
  draft.countries,
  draft.colors,
  draft.sizes,
  draft.min,
  draft.max,
  draft.sort,
  draft.sale,
 
]);

  function syncDraftFromUrl() {
    setDraft({
      types: unique(qpAll(sp, "type").map((v) => v.toUpperCase())),
      styles: unique(qpAll(sp, "style").map((v) => v.toLowerCase())),
      brands: unique(qpAll(sp, "brand")),
      countries: showCountries
  ? unique(qpAll(sp, "country").map((v) => v.toUpperCase()))
  : [],
      colors: unique(qpAll(sp, "color").map((v) => v.toLowerCase())),
      sizes: unique(qpAll(sp, "size").map((v) => v.toLowerCase())),
      min: sp.get("min") ?? "",
      max: sp.get("max") ?? "",
      sort: sp.get("sort") ?? "new",
      sale: truthyParam(sp.get("sale") ?? "") ? "1" : "",
    });
  }

  function openDrawer() {
    syncDraftFromUrl();
    setPreviewCount(null);
    setPanel("root");
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
    setPanel("root");
  }

     function apply() {
    const next = new URLSearchParams(sp.toString());

    const currentTypes = unique(qpAll(sp, "type").map((v) => v.toUpperCase()));
    const nextTypes = unique(draft.types.map((v) => v.toUpperCase()));

    const typesChanged =
      currentTypes.length !== nextTypes.length ||
      currentTypes.some((v, i) => v !== nextTypes[i]);

    appendMulti(next, "type", draft.types);
    appendMulti(next, "style", draft.styles);
    appendMulti(next, "brand", draft.brands);
    if (showCountries) {
  appendMulti(next, "country", draft.countries);
} else {
  next.delete("country");
}
    appendMulti(next, "color", draft.colors);
    appendMulti(next, "size", draft.sizes);

    const setOrDelete = (key: string, value: string) => {
      const v = String(value ?? "").trim();
      if (v) next.set(key, v);
      else next.delete(key);
    };

    setOrDelete("min", draft.min);
    setOrDelete("max", draft.max);
    setOrDelete("sort", draft.sort);
    setOrDelete("sale", draft.sale);
    

    // ✅ Search page UX:
    // only clear q if the selected product type actually changed
    if (pathname.startsWith("/search") && typesChanged && nextTypes.length > 0) {
      next.delete("q");
    }

    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    closeDrawer();
  }

  function clearAll() {
    setDraft({
      types: [],
      styles: [],
      brands: [],
      countries: [],
      colors: [],
      sizes: [],
      min: "",
      max: "",
      sort: "new",
      sale: "",
     
    });
  }

  function removeOne(key: string) {
    const next = new URLSearchParams(sp.toString());

    if (key === "price") {
      next.delete("min");
      next.delete("max");
      setDraft((d) => ({ ...d, min: "", max: "" }));
    } else if (key === "sale") {
      next.delete("sale");
      setDraft((d) => ({ ...d, sale: "" }));
    } else if (key.startsWith("type:")) {
      const slug = key.slice("type:".length);
      const updated = draft.types.filter((x) => x !== slug);
      appendMulti(next, "type", updated);
      setDraft((d) => ({ ...d, types: updated }));
    } else if (key.startsWith("style:")) {
      const slug = key.slice("style:".length);
      const updated = draft.styles.filter((x) => x !== slug);
      appendMulti(next, "style", updated);
      setDraft((d) => ({ ...d, styles: updated }));
    } else if (key.startsWith("brand:")) {
      const slug = key.slice("brand:".length);
      const updated = draft.brands.filter((x) => x !== slug);
      appendMulti(next, "brand", updated);
      setDraft((d) => ({ ...d, brands: updated }));
    } else if (key.startsWith("country:")) {
      const slug = key.slice("country:".length);
      const updated = draft.countries.filter((x) => x !== slug);
      appendMulti(next, "country", updated);
      setDraft((d) => ({ ...d, countries: updated }));
    } else if (key.startsWith("color:")) {
      const slug = key.slice("color:".length);
      const updated = draft.colors.filter((x) => x !== slug);
      appendMulti(next, "color", updated);
      setDraft((d) => ({ ...d, colors: updated }));
    } else if (key.startsWith("size:")) {
      const slug = key.slice("size:".length);
      const updated = draft.sizes.filter((x) => x !== slug);
      appendMulti(next, "size", updated);
      setDraft((d) => ({ ...d, sizes: updated }));
    }

    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAllAndApply() {
    const next = new URLSearchParams(sp.toString());
    ["type", "style", "brand", "country", "color", "size", "min", "max", "sale", "next_day"].forEach((k) =>
  next.delete(k)
);
    next.set("sort", "new");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    clearAll();
  }

  const chips = useMemo(() => {
    const out: Array<{ key: string; label: string }> = [];

    for (const t of draft.types) {
      out.push({ key: `type:${t}`, label: labelFor(types, t) || t });
    }

    for (const s of draft.styles) {
      out.push({ key: `style:${s}`, label: labelFor(liveStyles, s) || s });
    }

    for (const b of draft.brands) {
      out.push({ key: `brand:${b}`, label: labelFor(brands, b) || b });
    }

    if (showCountries) {
  for (const c of draft.countries) {
    out.push({
      key: `country:${c}`,
      label: countryLookup.get(c.toUpperCase()) ?? c,
    });
  }
}

    for (const c of draft.colors) {
      out.push({ key: `color:${c}`, label: labelFor(colors, c) || c });
    }

    for (const s of draft.sizes) {
      out.push({ key: `size:${s}`, label: labelFor(sizes, s) || s });
    }

    if (draft.min || draft.max) out.push({ key: "price", label: priceLabel(draft.min, draft.max) });
    if (draft.sale) out.push({ key: "sale", label: "Sale" });

    return out;
  }, [draft, brands, types, liveStyles, colors, sizes]);
  
const activeFilterCount = chips.length;
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
  {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter"}
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
                {PANEL_LABELS[panel]}
              </div>

              <button onClick={closeDrawer} aria-label="Close" className="text-xl leading-none">
                ×
              </button>
            </div>

            <div className="h-[calc(100%-120px)] overflow-y-auto">
              {panel === "root" && (
                <div className="divide-y divide-black/10">
  <FilterRow
    label="Category"
    valueLabel={summaryLabel(types, draft.types)}
    onClick={() => setPanel("type")}
  />

  <FilterRow
    label="Size"
    valueLabel={summaryLabel(sizes, draft.sizes)}
    onClick={() => setPanel("size")}
  />

  <FilterRow
    label="Colour"
    valueLabel={summaryLabel(colors, draft.colors)}
    onClick={() => setPanel("color")}
  />

  <FilterRow
    label="Style"
    valueLabel={summaryLabel(liveStyles, draft.styles)}
    onClick={() => setPanel("style")}
  />

  <FilterRow
    label="Brand"
    valueLabel={summaryLabel(brands, draft.brands)}
    onClick={() => setPanel("brand")}
  />

  {showCountries && (
    <FilterRow
      label="Country"
      valueLabel={summaryLabel(countries, draft.countries)}
      onClick={() => setPanel("country")}
    />
  )}

  <FilterRow
    label="Price"
    valueLabel={priceLabel(draft.min, draft.max)}
    onClick={() => setPanel("price")}
  />

  <FilterRow
  label="Offers"
  valueLabel={offersLabel(draft.sale)}
  onClick={() => setPanel("offers")}
/>
</div>
              )}

              {panel === "type" && (
                <ChoiceListMulti
                  options={types}
                  value={draft.types}
                  onPick={(nextTypes) => {
                    setDraft((d) => ({
                      ...d,
                      types: nextTypes.map((v) => v.toUpperCase()),
                    }));
                  }}
                  searchable
                  searchPlaceholder="Search product type…"
                />
              )}

              {panel === "style" && (
                <div>
                  

                  {stylesLoading ? (
  <div className="px-5 py-4 text-sm text-black/50">
    Loading styles…
  </div>
) : stylesReady && draft.types.length > 0 && liveStyles.length === 0 ? (
  <div className="px-5 py-4 text-sm text-black/50">
    No styles available for this product type.
  </div>
) : null}

                  <ChoiceListMulti
                    options={liveStyles}
                    value={draft.styles}
                    onPick={(v) => setDraft((d) => ({ ...d, styles: v }))}
                    searchable
                    searchPlaceholder="Search style…"
                  />
                </div>
              )}

              {panel === "brand" && (
                <ChoiceListMulti
                  options={brands}
                  value={draft.brands}
                  onPick={(v) => setDraft((d) => ({ ...d, brands: v }))}
                  searchable
                  searchPlaceholder="Search brand…"
                />
              )}

              {showCountries && panel === "country" && (
  <ChoiceListMulti
    options={countries}
    value={draft.countries}
    onPick={(v) => setDraft((d) => ({ ...d, countries: v.map((x) => x.toUpperCase()) }))}
    searchable
    searchPlaceholder="Search country…"
  />
)}

              {panel === "color" && (
                <ChoiceListMulti
                  options={colors}
                  value={draft.colors}
                  onPick={(v) => setDraft((d) => ({ ...d, colors: v }))}
                  searchable
                  searchPlaceholder="Search colour…"
                />
              )}

              {panel === "size" && (
                <ChoiceListMulti
                  options={sizes}
                  value={draft.sizes}
                  onPick={(v) => setDraft((d) => ({ ...d, sizes: v }))}
                  searchable
                  searchPlaceholder="Search size…"
                />
              )}

              {panel === "offers" && (
  <OffersPanel
    saleOn={!!draft.sale}
    onToggleSale={() => setDraft((d) => ({ ...d, sale: d.sale ? "" : "1" }))}
  />
)}

              {panel === "price" && (
                <PricePanel
                  min={draft.min}
                  max={draft.max}
                  onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
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
  {previewCount != null
    ? `VIEW ${previewCount} ITEM${previewCount === 1 ? "" : "S"}`
    : countLoading
    ? "VIEW ITEMS"
    : "VIEW ITEMS"}
</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function FilterRow({ label, valueLabel, onClick }: { label: string; valueLabel: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full px-5 py-4 text-left hover:bg-black/[0.02]">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium">{label}</div>
        <div className="max-w-[55%] truncate text-right text-sm text-black/60">{valueLabel}</div>
      </div>
    </button>
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

      <div className="divide-y divide-black/10">
        <button onClick={() => onPick([])} className="w-full px-5 py-4 text-left hover:bg-black/[0.02]">
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

function OffersPanel({
  saleOn,
  onToggleSale,
}: {
  saleOn: boolean;
  onToggleSale: () => void;
}) {
  return (
    <div className="space-y-3 p-5">
      <div className="text-sm text-black/60">Choose available offers.</div>

      <button
        onClick={onToggleSale}
        className="w-full rounded-none"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Sale</div>
          <div className="text-sm">{saleOn ? "✓" : ""}</div>
        </div>
      </button>
    </div>
  );
}

function PricePanel({ min, max, onChange }: { min: string; max: string; onChange: (next: { min: string; max: string }) => void }) {
  return (
    <div className="space-y-4 p-5">
      <div className="text-sm text-black/60">Enter min/max. (Leave blank for no limit)</div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-black/60" htmlFor="minPrice">
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
          <label className="mb-1 block text-xs text-black/60" htmlFor="maxPrice">
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