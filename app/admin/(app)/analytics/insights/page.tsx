import Link from "next/link";
import { Fragment } from "react";
import { cookies, headers} from "next/headers";

import AnalyticsNav from "@/components/analytics/AnalyticsNav";

export const dynamic = "force-dynamic";

type AudienceCountryRow = {
  countryCode: string;
  shoppers: number;
  exposedSessions: number;
  share: number;
};

type AudienceAgeRow = {
  ageBand: string;
  shoppers: number;
  exposedSessions: number;
  share: number;
};

type MarketExposureRow = {
  countryCode: string;
  exposedSessions: number;
};

type ResponseSignalRow = {
  signal: string;

  exposedSessions: number;

  viewSessions: number;
  saveSessions: number;
  shopSessions: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  strength: number;
  strengthScore: number;

  eligible: boolean;

  status:
    | "QUALIFYING"
    | "LOW_SAMPLE";
};

type AgeProductTypeCell = {
  ageBand: string;
  productType: string;

  exposedSessions: number;

  viewSessions: number;
  saveSessions: number;
  shopSessions: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  strength: number;
  strengthScore: number;

  eligible: boolean;

  status:
    | "QUALIFYING"
    | "LOW_SAMPLE";
};

type MarketShopperCountryCell = {
  marketCode: string;
  countryCode: string;

  exposedSessions: number;

  viewSessions: number;
  saveSessions: number;
  shopSessions: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  strength: number;
  strengthScore: number;

  eligible: boolean;

  status:
    | "QUALIFYING"
    | "LOW_SAMPLE";
};

type DiscoveryProductTypeCell = {
  discoverySource: string;
  productType: string;

  exposedSessions: number;

  viewSessions: number;
  saveSessions: number;
  shopSessions: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  strength: number;
  strengthScore: number;

  eligible: boolean;

  status:
    | "QUALIFYING"
    | "LOW_SAMPLE";
};
type OpportunityRow = {
  countryCode: string;
  ageBand: string;
  marketCode: string;
  discoverySource: string;
  productType: string;

  exposedSessions: number;

  viewSessions: number;
  saveSessions: number;
  shopSessions: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  strength: number;
  strengthScore: number;
};

type InsightsResponse = {
  ok: boolean;

  filters: {
    market: string;
    country: string;
    age: string;
    source: string;

    markets: string[];
    countries: string[];
    ageBands: string[];
    discoverySources: string[];
  };

  range: {
    start: string;
    endExclusive: string;
  };

  overview: {
  exposedSessions: number;

  identifiedShoppers: number;

  sessionsPerShopper: number;

  returningShoppers: number;

  returningShopperRate: number;

  knownCountryShoppers: number;

  knownAgeShoppers: number;

  knownCountrySessions: number;

  knownAgeSessions: number;
};

  audienceByCountry: AudienceCountryRow[];
  audienceByAge: AudienceAgeRow[];
  marketExposure: MarketExposureRow[];

  responseSignals: {
  productTypes:
    ResponseSignalRow[];

  occasions:
    ResponseSignalRow[];

  colours:
    ResponseSignalRow[];

  styles:
    ResponseSignalRow[];

  materials:
    ResponseSignalRow[];
};

crossIntelligence: {
  ageByProductType:
    AgeProductTypeCell[];

  marketByShopperCountry:
    MarketShopperCountryCell[];

  discoveryByProductType:
    DiscoveryProductTypeCell[];
};

opportunities: {
  strongest:
    OpportunityRow[];
};
};

const VALID_RANGES = [
  "today",
  "7d",
  "30d",
  "90d",
  "1y",
  "custom",
] as const;

const regionNames =
  new Intl.DisplayNames(
    ["en"],
    {
      type: "region",
    }
  );

  function heatmapIntensity(
  score: number
) {
  if (score >= 80) {
    return 0.95;
  }

  if (score >= 60) {
    return 0.78;
  }

  if (score >= 40) {
    return 0.60;
  }

  if (score >= 20) {
    return 0.40;
  }

  return 0.20;
}

function countryLabel(
  code: string
) {
  return (
    regionNames.of(
      code.toUpperCase()
    ) ?? code
  );
}

function ageLabel(
  value: string
) {
  return value.replace(
    "-",
    "–"
  );
}

function sourceLabel(
  source: string
) {
  if (
    source === "STYLE_FEED"
  ) {
    return "Style Feed";
  }

  if (
    source === "CONTINENT"
  ) {
    return "Discover the World";
  }

  if (
    source ===
    "EMERGING_BRANDS"
  ) {
    return "Emerging Brands";
  }

  return source
    .toLowerCase()
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function signalLabel(
  value: string
) {
  if (
    value ===
    "COATS_JACKETS"
  ) {
    return "Coats & Jackets";
  }

  if (
    value ===
    "HOODIE_SWEATSHIRT"
  ) {
    return "Hoodie & Sweatshirt";
  }

  if (
    /^[A-Z0-9_]+$/.test(
      value
    )
  ) {
    return value
      .toLowerCase()
      .replaceAll(
        "_",
        " "
      )
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  }

  return value;
}

function percent(
  value:
    | number
    | null
    | undefined
) {
  if (
    value == null ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return `${(
    value * 100
  ).toFixed(1)}%`;
}

function formatNumber(
  value:
    | number
    | null
    | undefined
) {
  return Number(
    value ?? 0
  ).toLocaleString();
}

async function absoluteUrl(path: string) {
  const headerStore = await headers();

  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host");

  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production"
      ? "https"
      : "http");

  if (!host) {
    throw new Error(
      `Unable to determine request host for ${path}`
    );
  }

  return `${protocol}://${host}${path}`;
}

async function getJSON(
  path: string
): Promise<InsightsResponse> {
  const jar = await cookies();
  const url = await absoluteUrl(path);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      cookie: jar.toString(),
    },
  });

  const contentType =
    response.headers.get("content-type") ?? "";

  if (!response.ok) {
    const text =
      await response.text().catch(() => "");

    throw new Error(
      `Insights request failed: ${path} (${response.status}) ${text.slice(0, 500)}`
    );
  }

  if (!contentType.includes("application/json")) {
    const text =
      await response.text().catch(() => "");

    throw new Error(
      `Insights API returned non-JSON: ${path} (${response.status}) ` +
        `content-type=${contentType} body=${text.slice(0, 500)}`
    );
  }

  return response.json() as Promise<InsightsResponse>;
}

function buildInsightsUrl({
  range,
  from,
  to,
  market,
  country,
  age,
  source,
}: {
  range: string;
  from?: string;
  to?: string;
  market: string;
  country: string;
  age: string;
  source: string;
}) {
  const params =
    new URLSearchParams();

  params.set(
    "range",
    range
  );

  if (
    range === "custom"
  ) {
    if (from) {
      params.set(
        "from",
        from
      );
    }

    if (to) {
      params.set(
        "to",
        to
      );
    }
  }

  if (
    market !== "all"
  ) {
    params.set(
      "market",
      market
    );
  }

  if (
    country !== "all"
  ) {
    params.set(
      "country",
      country
    );
  }

  if (
    age !== "all"
  ) {
    params.set(
      "age",
      age
    );
  }

  if (
    source !== "all"
  ) {
    params.set(
      "source",
      source
    );
  }

  return `/admin/analytics/insights?${params.toString()}`;
}

function RangeLink({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center rounded-full border px-4 py-2 text-xs font-medium transition",
        active
          ? "border-[#7B2D3E] bg-[#7B2D3E] text-white"
          : "border-black/10 bg-white text-neutral-700 hover:border-[#7B2D3E]/30 hover:text-[#7B2D3E]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-5">
        <h2 className="text-base font-medium text-neutral-950">
          {title}
        </h2>

        {subtitle ? (
          <p className="mt-1 text-sm text-neutral-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function CoverageCard({
  title,
  known,
  total,
  description,
}: {
  title: string;
  known: number;
  total: number;
  description: string;
}) {
  const coverage =
    total > 0
      ? known / total
      : 0;

  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
        {title}
      </div>

      <div className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
        {known}
        <span className="ml-1 text-base font-medium text-neutral-400">
          / {total}
        </span>
      </div>

      <div className="mt-1 text-sm font-medium text-[#7B2D3E]">
        {percent(
          coverage
        )} coverage
      </div>

      <p className="mt-2 text-xs leading-5 text-neutral-400">
        {description}
      </p>
    </div>
  );
}

function HorizontalBarChart({
  rows,
  maxValue,
  valueLabel,
  emptyText,
}: {
  rows: Array<{
    key: string;
    label: string;
    value: number;
    share?: number;
    exposedSessions?: number;

  }>;
  maxValue: number;
  valueLabel?: (
    row: {
      key: string;
      label: string;
      value: number;
      share?: number;
      exposedSessions?: number;

    }
  ) => string;
  emptyText: string;
}) {
  if (
    rows.length === 0
  ) {
    return (
      <div className="px-6 py-10 text-sm text-neutral-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-5 px-6 py-6">
      {rows.map(
        (row) => {
          const width =
            maxValue > 0
              ? Math.max(
                  2,
                  (row.value /
                    maxValue) *
                    100
                )
              : 0;

          return (
            <div
              key={
                row.key
              }
              className="grid grid-cols-[150px_minmax(0,1fr)_170px] items-center gap-4"
            >
              <div className="truncate text-sm font-medium text-neutral-700">
                {row.label}
              </div>

              <div className="relative h-7 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#7B2D3E]"
                  style={{
                    width: `${width}%`,
                  }}
                />
              </div>

              <div className="whitespace-nowrap text-right text-sm font-normal text-neutral-600">
                {valueLabel
                  ? valueLabel(
                      row
                    )
                  : row.value}
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

function SignalRanking({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: ResponseSignalRow[];
}) {
  const qualifying =
    rows
      .filter(
        (row) =>
          row.eligible
      )
      .slice(
        0,
        5
      );

  const lowSample =
    rows
      .filter(
        (row) =>
          !row.eligible
      )
      .slice(
        0,
        2
      );

  const maxScore =
    Math.max(
      0,
      ...qualifying.map(
        (row) =>
          row.strengthScore
      )
    );

  return (
    <Panel
      title={title}
      subtitle={subtitle}
    >
      {qualifying.length >
      0 ? (
        <div className="space-y-5 px-6 py-6">
          {qualifying.map(
            (
              row,
              index
            ) => {
              const width =
                maxScore > 0
                  ? Math.max(
                      3,
                      (
                        row.strengthScore /
                        maxScore
                      ) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={
                    row.signal
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-xs font-semibold text-[#7B2D3E]/45">
                        {index +
                          1}
                      </span>

                      <span className="truncate text-sm font-medium text-neutral-800">
                        {signalLabel(
                          row.signal
                        )}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-baseline gap-2">
                      <span className="text-base font-semibold text-neutral-950">
                        {row.strengthScore.toFixed(
                          1
                        )}
                      </span>

                      <span className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                        response
                      </span>
                    </div>
                  </div>

                  <div className="ml-8 h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-[#7B2D3E]"
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </div>

                  <div className="ml-8 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-400">
                    <span>
                      {formatNumber(
                        row.exposedSessions
                      )}{" "}
                      exposed
                    </span>

                    <span>
                      {percent(
                        row.viewRate
                      )}{" "}
                      viewed
                    </span>

                    <span>
                      {percent(
                        row.saveRate
                      )}{" "}
                      saved
                    </span>

                    <span>
                      {percent(
                        row.shopIntentRate
                      )}{" "}
                      shop intent
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      ) : (
        <div className="px-6 py-10 text-sm text-neutral-400">
          No qualifying signals for this filtered audience yet.
        </div>
      )}

      {lowSample.length >
      0 ? (
        <div className="border-t border-black/5 px-6 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Low sample
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {lowSample.map(
              (row) => (
                <span
                  key={
                    row.signal
                  }
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700"
                >
                  {signalLabel(
                    row.signal
                  )}{" "}
                  ·{" "}
                  {formatNumber(
                    row.exposedSessions
                  )}{" "}
                  exposed
                </span>
              )
            )}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function AgeProductTypeHeatmap({
  cells,
  productTypes,
  ageBands,
}: {
  cells:
    AgeProductTypeCell[];

  productTypes:
    string[];

  ageBands:
    string[];
}) {
  const cellMap =
    new Map(
      cells.map(
        (cell) => [
          `${cell.ageBand}:${cell.productType}`,
          cell,
        ]
      )
    );

  if (
    cells.length === 0 ||
    productTypes.length === 0 ||
    ageBands.length === 0
  ) {
    return (
      <div className="px-6 py-10 text-sm text-neutral-400">
        No age × product type intelligence for this filtered cohort yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-[900px] p-6"
        style={{
          display:
            "grid",

          gridTemplateColumns:
            `130px repeat(${productTypes.length}, minmax(120px, 1fr))`,

          gap:
            "8px",
        }}
      >
        <div />

        {productTypes.map(
          (productType) => (
            <div
              key={
                productType
              }
              className="px-2 pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
            >
              {signalLabel(
                productType
              )}
            </div>
          )
        )}

        {ageBands.map(
  (ageBand) => (
    <Fragment
      key={ageBand}
    >
              <div
                key={`${ageBand}-label`}
                className="flex items-center text-sm font-medium text-neutral-700"
              >
                {ageLabel(
                  ageBand
                )}
              </div>

              {productTypes.map(
                (
                  productType
                ) => {
                  const cell =
                    cellMap.get(
                      `${ageBand}:${productType}`
                    );

                  if (!cell) {
                    return (
                      <div
                        key={`${ageBand}:${productType}`}
                        className="flex min-h-[92px] items-center justify-center rounded-[18px] border border-black/5 bg-neutral-50 text-xs text-neutral-300"
                      >
                        —
                      </div>
                    );
                  }

                  if (
  !cell.eligible
) {
  return (
    <div
      key={`${ageBand}:${productType}`}
      className="flex min-h-[92px] flex-col items-center justify-center rounded-[18px] border border-[#7B2D3E]/10 bg-[#7B2D3E]/[0.035] px-3 text-center"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7B2D3E]/45">
        Low sample
      </div>

      <div className="mt-1 text-xs text-[#7B2D3E]/45">
        {formatNumber(
          cell.exposedSessions
        )}{" "}
        exposed
      </div>
    </div>
  );
}

                  const intensity =
                    heatmapIntensity(
                          cell.strengthScore
                          );

                  return (
                    <div
                      key={`${ageBand}:${productType}`}
                      className="relative flex min-h-[92px] flex-col items-center justify-center overflow-hidden rounded-[18px] border border-[#7B2D3E]/15 px-3 text-center"
                    >
                      <div
                        className="absolute inset-0 bg-[#7B2D3E]"
                        style={{
                          opacity:
                            intensity,
                        }}
                      />

                      <div
                        className={[
                          "relative text-xl font-semibold",
                          intensity >
                          0.45
                            ? "text-white"
                            : "text-neutral-950",
                        ].join(
                          " "
                        )}
                      >
                        {cell.strengthScore.toFixed(1)} / 100
                      </div>

                      <div
                        className={[
                          "relative mt-1 text-[10px] uppercase tracking-[0.12em]",
                          intensity >
                          0.45
                            ? "text-white/70"
                            : "text-[#7B2D3E]/60",
                        ].join(
                          " "
                        )}
                      >
                        response strength
                      </div>

                      <div
                        className={[
                          "relative mt-2 text-[10px]",
                          intensity >
                          0.45
                            ? "text-white/65"
                            : "text-neutral-400",
                        ].join(
                          " "
                        )}
                      >
                        {formatNumber(
                          cell.exposedSessions
                        )}{" "}
                        exposed
                      </div>
                    </div>
                  );
                }
              )}
            </Fragment>
          )
        )}
      </div>
    </div>
  );
}

function MarketShopperCountryHeatmap({
  cells,
  markets,
  countries,
}: {
  cells:
    MarketShopperCountryCell[];

  markets:
    string[];

  countries:
    string[];
}) {
  const cellMap =
    new Map(
      cells.map(
        (cell) => [
          `${cell.marketCode}:${cell.countryCode}`,
          cell,
        ]
      )
    );

  if (
    cells.length === 0 ||
    markets.length === 0 ||
    countries.length === 0
  ) {
    return (
      <div className="px-6 py-10 text-sm text-neutral-400">
        No market × shopper-country intelligence for this filtered cohort yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-[800px] p-6"
        style={{
          display:
            "grid",

          gridTemplateColumns:
            `150px repeat(${countries.length}, minmax(140px, 1fr))`,

          gap:
            "8px",
        }}
      >
        <div />

        {countries.map(
          (countryCode) => (
            <div
              key={
                countryCode
              }
              className="px-2 pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
            >
              {countryLabel(
                countryCode
              )}
            </div>
          )
        )}

        {markets.map(
  (marketCode) => (
    <Fragment
      key={marketCode}
    >
              <div
                key={`${marketCode}-label`}
                className="flex items-center text-sm font-medium text-neutral-700"
              >
                {countryLabel(
                  marketCode
                )} brands
              </div>

              {countries.map(
                (
                  countryCode
                ) => {
                  const cell =
                    cellMap.get(
                      `${marketCode}:${countryCode}`
                    );

                  if (!cell) {
                    return (
                      <div
                        key={`${marketCode}:${countryCode}`}
                        className="flex min-h-[92px] items-center justify-center rounded-[18px] border border-black/5 bg-neutral-50 text-xs text-neutral-300"
                      >
                        —
                      </div>
                    );
                  }

                  if (
                    !cell.eligible
                  ) {
                    return (
                      <div
                        key={`${marketCode}:${countryCode}`}
                        className="flex min-h-[92px] flex-col items-center justify-center rounded-[18px] border border-black/5 bg-neutral-50 px-3 text-center"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                          Low sample
                        </div>

                        <div className="mt-1 text-xs text-neutral-400">
                          {formatNumber(
                            cell.exposedSessions
                          )}{" "}
                          exposed
                        </div>
                      </div>
                    );
                  }

                  const intensity =
                    heatmapIntensity(
                      cell.strengthScore
                    );

                  return (
                    <div
                      key={`${marketCode}:${countryCode}`}
                      className="relative flex min-h-[92px] flex-col items-center justify-center overflow-hidden rounded-[18px] border border-[#7B2D3E]/15 px-3 text-center"
                    >
                      <div
                        className="absolute inset-0 bg-[#7B2D3E]"
                        style={{
                          opacity:
                            intensity,
                        }}
                      />

                      <div
                        className={[
                          "relative text-xl font-semibold",
                          intensity >
                          0.45
                            ? "text-white"
                            : "text-neutral-950",
                        ].join(
                          " "
                        )}
                      >
                        {cell.strengthScore.toFixed(
                          1
                        )}{" "}
                        / 100
                      </div>

                      <div
                        className={[
                          "relative mt-1 text-[10px] uppercase tracking-[0.12em]",
                          intensity >
                          0.45
                            ? "text-white/70"
                            : "text-[#7B2D3E]/60",
                        ].join(
                          " "
                        )}
                      >
                        response strength
                      </div>

                      <div
                        className={[
                          "relative mt-2 text-[10px]",
                          intensity >
                          0.45
                            ? "text-white/65"
                            : "text-neutral-400",
                        ].join(
                          " "
                        )}
                      >
                        {formatNumber(
                          cell.exposedSessions
                        )}{" "}
                        exposed
                      </div>
                    </div>
                  );
                }
              )}
            </Fragment>
          )
        )}
      </div>
    </div>
  );
}

function DiscoveryProductTypeHeatmap({
  cells,
  discoverySources,
  productTypes,
}: {
  cells:
    DiscoveryProductTypeCell[];

  discoverySources:
    string[];

  productTypes:
    string[];
}) {
  const cellMap =
    new Map(
      cells.map(
        (cell) => [
          `${cell.discoverySource}:${cell.productType}`,
          cell,
        ]
      )
    );

  if (
    cells.length === 0 ||
    discoverySources.length === 0 ||
    productTypes.length === 0
  ) {
    return (
      <div className="px-6 py-10 text-sm text-neutral-400">
        No discovery-source × product-type intelligence for this filtered cohort yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-[900px] p-6"
        style={{
          display:
            "grid",

          gridTemplateColumns:
            `160px repeat(${productTypes.length}, minmax(120px, 1fr))`,

          gap:
            "8px",
        }}
      >
        <div />

        {productTypes.map(
          (productType) => (
            <div
              key={
                productType
              }
              className="px-2 pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
            >
              {signalLabel(
                productType
              )}
            </div>
          )
        )}

        {discoverySources.map(
  (discoverySource) => (
    <Fragment
      key={discoverySource}
    >
              <div
                key={`${discoverySource}-label`}
                className="flex items-center text-sm font-medium text-neutral-700"
              >
                {sourceLabel(
                  discoverySource
                )}
              </div>

              {productTypes.map(
                (
                  productType
                ) => {
                  const cell =
                    cellMap.get(
                      `${discoverySource}:${productType}`
                    );

                  if (!cell) {
                    return (
                      <div
                        key={`${discoverySource}:${productType}`}
                        className="flex min-h-[92px] items-center justify-center rounded-[18px] border border-black/5 bg-neutral-50 text-xs text-neutral-300"
                      >
                        —
                      </div>
                    );
                  }

                  if (
                    !cell.eligible
                  ) {
                    return (
                      <div
                        key={`${discoverySource}:${productType}`}
                        className="flex min-h-[92px] flex-col items-center justify-center rounded-[18px] border border-black/5 bg-neutral-50 px-3 text-center"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                          Low sample
                        </div>

                        <div className="mt-1 text-xs text-neutral-400">
                          {formatNumber(
                            cell.exposedSessions
                          )}{" "}
                          exposed
                        </div>
                      </div>
                    );
                  }

                  const intensity =
                    heatmapIntensity(
                      cell.strengthScore
                    );

                  return (
                    <div
                      key={`${discoverySource}:${productType}`}
                      className="relative flex min-h-[92px] flex-col items-center justify-center overflow-hidden rounded-[18px] border border-[#7B2D3E]/15 px-3 text-center"
                    >
                      <div
                        className="absolute inset-0 bg-[#7B2D3E]"
                        style={{
                          opacity:
                            intensity,
                        }}
                      />

                      <div
                        className={[
                          "relative text-xl font-semibold",
                          intensity >
                          0.45
                            ? "text-white"
                            : "text-neutral-950",
                        ].join(
                          " "
                        )}
                      >
                        {cell.strengthScore.toFixed(
                          1
                        )}{" "}
                        / 100
                      </div>

                      <div
                        className={[
                          "relative mt-1 text-[10px] uppercase tracking-[0.12em]",
                          intensity >
                          0.45
                            ? "text-white/70"
                            : "text-[#7B2D3E]/60",
                        ].join(
                          " "
                        )}
                      >
                        response strength
                      </div>

                      <div
                        className={[
                          "relative mt-2 text-[10px]",
                          intensity >
                          0.45
                            ? "text-white/65"
                            : "text-neutral-400",
                        ].join(
                          " "
                        )}
                      >
                        {formatNumber(
                          cell.exposedSessions
                        )}{" "}
                        exposed
                      </div>
                    </div>
                  );
                }
              )}
            </Fragment>
          )
        )}
      </div>
    </div>
  );
}

function OpportunityRanking({
  rows,
}: {
  rows:
    OpportunityRow[];
}) {
  if (
    rows.length === 0
  ) {
    return (
      <div className="px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/50">
            Building intelligence
          </div>

          <h3 className="mt-3 text-lg font-medium text-neutral-900">
            No qualifying cross-audience opportunity yet
          </h3>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            No combination has reached the minimum
            5 unique exposed sessions required for opportunity ranking.
            As more shopper behaviour is collected, qualifying
            opportunities will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-black/5">
      {rows.map(
        (
          row,
          index
        ) => (
          <div
            key={[
              row.countryCode,
              row.ageBand,
              row.marketCode,
              row.discoverySource,
              row.productType,
            ].join(":")}
            className="grid gap-5 px-6 py-6 lg:grid-cols-[70px_minmax(0,1fr)_180px]"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7B2D3E]/8 text-sm font-semibold text-[#7B2D3E]">
                #{index + 1}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  {countryLabel(
                    row.countryCode
                  )} shoppers
                </span>

                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  {ageLabel(
                    row.ageBand
                  )}
                </span>

                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  {countryLabel(
                    row.marketCode
                  )} brands
                </span>

                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  {sourceLabel(
                    row.discoverySource
                  )}
                </span>
              </div>

              <div className="mt-4 text-lg font-medium text-neutral-950">
                {signalLabel(
                  row.productType
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-500">
                <span>
                  {formatNumber(
                    row.exposedSessions
                  )}{" "}
                  exposed
                </span>

                <span>
                  {percent(
                    row.viewRate
                  )}{" "}
                  viewed
                </span>

                <span>
                  {percent(
                    row.saveRate
                  )}{" "}
                  saved
                </span>

                <span>
                  {percent(
                    row.shopIntentRate
                  )}{" "}
                  shop intent
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-[20px] bg-[#fdf7f4] px-5 py-4 lg:text-right">
              <div className="text-2xl font-semibold tracking-tight text-[#7B2D3E]">
                {row.strengthScore.toFixed(
                  1
                )}{" "}
                / 100
              </div>

              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2D3E]/50">
                Response strength
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    market?: string;
    country?: string;
    age?: string;
    source?: string;
  }>;
}) {
  const sp =
    await searchParams;

  const rawRange =
    sp.range ??
    "30d";

  const range =
    VALID_RANGES.includes(
      rawRange as
        (typeof VALID_RANGES)[number]
    )
      ? rawRange
      : "30d";

  const from =
    sp.from ??
    "";

  const to =
    sp.to ??
    "";

  const rawMarket =
    sp.market?.trim();

  const market =
    !rawMarket ||
    rawMarket.toLowerCase() ===
      "all"
      ? "all"
      : rawMarket.toUpperCase();

  const rawCountry =
    sp.country?.trim();

  const country =
    !rawCountry ||
    rawCountry.toLowerCase() ===
      "all"
      ? "all"
      : rawCountry.toUpperCase();

  const rawAge =
    sp.age?.trim();

  const age =
    !rawAge ||
    rawAge.toLowerCase() ===
      "all"
      ? "all"
      : rawAge;

  const rawSource =
    sp.source?.trim();

  const source =
    !rawSource ||
    rawSource.toLowerCase() ===
      "all"
      ? "all"
      : rawSource.toUpperCase();

  const apiParams =
    new URLSearchParams();

  apiParams.set(
    "range",
    range
  );

  apiParams.set(
    "market",
    market
  );

  apiParams.set(
    "country",
    country
  );

  apiParams.set(
    "age",
    age
  );

  apiParams.set(
    "source",
    source
  );

  if (
    range === "custom"
  ) {
    if (from) {
      apiParams.set(
        "from",
        from
      );
    }

    if (to) {
      apiParams.set(
        "to",
        to
      );
    }
  }

  const data =
    await getJSON(
      `/api/admin/analytics/insights?${apiParams.toString()}`
    );

  const rangeHref = (
    nextRange: string
  ) =>
    buildInsightsUrl({
      range:
        nextRange,

      from:
        nextRange ===
        "custom"
          ? from
          : undefined,

      to:
        nextRange ===
        "custom"
          ? to
          : undefined,

      market,
      country,
      age,
      source,
    });

  const countryRows =
  data.audienceByCountry.map(
    (row) => ({
      key:
        row.countryCode,

      label:
        countryLabel(
          row.countryCode
        ),

      value:
        row.shoppers,

      exposedSessions:
        row.exposedSessions,

      share:
        row.share,
    })
  );

  const ageRows =
  data.audienceByAge
    .filter(
      (row) =>
        row.shoppers > 0
    )
    .map(
      (row) => ({
        key:
          row.ageBand,

        label:
          ageLabel(
            row.ageBand
          ),

        value:
          row.shoppers,

        exposedSessions:
          row.exposedSessions,

        share:
          row.share,
      })
    );

  const marketRows =
    data.marketExposure.map(
      (row) => ({
        key:
          row.countryCode,

        label:
          countryLabel(
            row.countryCode
          ),

        value:
          row.exposedSessions,
      })
    );

    const productTypeSignals =
  data.responseSignals
    .productTypes;

const occasionSignals =
  data.responseSignals
    .occasions;

const colourSignals =
  data.responseSignals
    .colours;

const styleSignals =
  data.responseSignals
    .styles;

const materialSignals =
  data.responseSignals
    .materials;


  const ageProductTypeCells =
  data.crossIntelligence
    .ageByProductType;

  const marketShopperCountryCells =
  data.crossIntelligence
    .marketByShopperCountry;

  const discoveryProductTypeCells =
  data.crossIntelligence
    .discoveryByProductType;

  const strongestOpportunities =
  data.opportunities
    .strongest;

const heatmapProductTypes =
  data.responseSignals
    .productTypes
    .filter(
      (row) =>
        row.eligible
    )
    .slice(
      0,
      6
    )
    .map(
      (row) =>
        row.signal
    );

const heatmapAgeBands =
  age === "all"
    ? data.filters.ageBands.filter(
        (ageBand) =>
          ageProductTypeCells.some(
            (cell) =>
              cell.ageBand ===
              ageBand
          )
      )
    : [age];
    

  const maxCountry =
    Math.max(
      0,
      ...countryRows.map(
        (row) =>
          row.value
      )
    );

  const maxAge =
    Math.max(
      0,
      ...ageRows.map(
        (row) =>
          row.value
      )
    );

  const maxMarket =
    Math.max(
      0,
      ...marketRows.map(
        (row) =>
          row.value
      )
    );

  const selectedMarketLabel =
    market === "all"
      ? "all brand markets"
      : `${countryLabel(
          market
        )} brands`;

        const marketCountryMarkets =
  Array.from(
    new Set(
      marketShopperCountryCells.map(
        (cell) =>
          cell.marketCode
      )
    )
  );

const marketCountryCountries =
  Array.from(
    new Set(
      marketShopperCountryCells.map(
        (cell) =>
          cell.countryCode
      )
    )
  );

  const discoveryHeatmapSources =
  source === "all"
    ? data.filters.discoverySources.filter(
        (
          discoverySource
        ) =>
          discoveryProductTypeCells.some(
            (cell) =>
              cell.discoverySource ===
              discoverySource
          )
      )
    : [source];

const discoveryHeatmapProductTypes =
  Array.from(
    new Set(
      discoveryProductTypeCells
        .filter(
          (cell) =>
            cell.eligible
        )
        .sort(
          (a, b) =>
            b.strengthScore -
              a.strengthScore ||
            b.exposedSessions -
              a.exposedSessions
        )
        .map(
          (cell) =>
            cell.productType
        )
    )
  ).slice(
    0,
    6
  );

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">

        <AnalyticsNav />

        <section className="rounded-[30px] bg-[#7B2D3E] px-7 py-8 text-white shadow-sm md:px-9 md:py-10">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
            Veilora intelligence
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Who wants what?
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
            Connect audience demographics, brand markets and discovery behaviour
            with the fashion signals shoppers respond to most strongly.
          </p>
        </section>

        <section className="space-y-4">
          <div className="rounded-[28px] border border-black/10 bg-white px-5 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
                  Reporting period
                </div>

                <div className="mt-1 text-xs text-neutral-500">
                  All Insights intelligence below uses this period.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <RangeLink
                  label="Today"
                  active={
                    range ===
                    "today"
                  }
                  href={rangeHref(
                    "today"
                  )}
                />

                <RangeLink
                  label="7 Days"
                  active={
                    range ===
                    "7d"
                  }
                  href={rangeHref(
                    "7d"
                  )}
                />

                <RangeLink
                  label="30 Days"
                  active={
                    range ===
                    "30d"
                  }
                  href={rangeHref(
                    "30d"
                  )}
                />

                <RangeLink
                  label="90 Days"
                  active={
                    range ===
                    "90d"
                  }
                  href={rangeHref(
                    "90d"
                  )}
                />

                <RangeLink
                  label="1 Year"
                  active={
                    range ===
                    "1y"
                  }
                  href={rangeHref(
                    "1y"
                  )}
                />

                <RangeLink
                  label="Custom"
                  active={
                    range ===
                    "custom"
                  }
                  href={rangeHref(
                    "custom"
                  )}
                />
              </div>
            </div>

            {range ===
            "custom" ? (
              <form
                method="GET"
                className="mt-5 flex flex-wrap items-end gap-3 border-t border-black/5 pt-5"
              >
                <input
                  type="hidden"
                  name="range"
                  value="custom"
                />

                <input
                  type="hidden"
                  name="market"
                  value={
                    market
                  }
                />

                <input
                  type="hidden"
                  name="country"
                  value={
                    country
                  }
                />

                <input
                  type="hidden"
                  name="age"
                  value={
                    age
                  }
                />

                <input
                  type="hidden"
                  name="source"
                  value={
                    source
                  }
                />

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    From
                  </span>

                  <input
                    type="date"
                    name="from"
                    defaultValue={
                      from
                    }
                    required
                    className="block rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[#7B2D3E]/40"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    To
                  </span>

                  <input
                    type="date"
                    name="to"
                    defaultValue={
                      to
                    }
                    required
                    className="block rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[#7B2D3E]/40"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-full bg-[#7B2D3E] px-5 py-2 text-sm font-semibold text-white"
                >
                  Apply dates
                </button>
              </form>
            ) : null}
          </div>

          <form
            method="GET"
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="hidden"
              name="range"
              value={
                range
              }
            />

            {range ===
            "custom" ? (
              <>
                <input
                  type="hidden"
                  name="from"
                  value={
                    from
                  }
                />

                <input
                  type="hidden"
                  name="to"
                  value={
                    to
                  }
                />
              </>
            ) : null}

            <select
              name="market"
              defaultValue={
                market
              }
              className="min-w-[180px] rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 outline-none focus:border-[#7B2D3E]/40"
            >
              <option value="all">
                All brand markets
              </option>

              {data.filters.markets.map(
                (code) => (
                  <option
                    key={
                      code
                    }
                    value={
                      code
                    }
                  >
                    {countryLabel(
                      code
                    )}
                  </option>
                )
              )}
            </select>

            <select
              name="country"
              defaultValue={
                country
              }
              className="min-w-[190px] rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 outline-none focus:border-[#7B2D3E]/40"
            >
              <option value="all">
                All registered countries
              </option>

              {data.filters.countries.map(
                (code) => (
                  <option
                    key={
                      code
                    }
                    value={
                      code
                    }
                  >
                    {countryLabel(
                      code
                    )}
                  </option>
                )
              )}
            </select>

            <select
              name="age"
              defaultValue={
                age
              }
              className="min-w-[150px] rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 outline-none focus:border-[#7B2D3E]/40"
            >
              <option value="all">
                All age groups
              </option>

              {data.filters.ageBands.map(
                (value) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {ageLabel(
                      value
                    )}
                  </option>
                )
              )}
            </select>

            <select
              name="source"
              defaultValue={
                source
              }
              className="min-w-[190px] rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 outline-none focus:border-[#7B2D3E]/40"
            >
              <option value="all">
                All discovery sources
              </option>

              {data.filters.discoverySources.map(
                (value) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {sourceLabel(
                      value
                    )}
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              className="rounded-full bg-[#7B2D3E] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#682535]"
            >
              Apply
            </button>
            {market !== "all" ||
country !== "all" ||
age !== "all" ||
source !== "all" ? (
  <Link
    href={buildInsightsUrl({
      range,
      from:
        range === "custom"
          ? from
          : undefined,
      to:
        range === "custom"
          ? to
          : undefined,
      market: "all",
      country: "all",
      age: "all",
      source: "all",
    })}
    className="rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-medium text-neutral-600 transition hover:border-[#7B2D3E]/25 hover:text-[#7B2D3E]"
  >
    Clear
  </Link>
) : null}
          </form>
        </section>

        <section className="space-y-4">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
              Audience & engagement
            </div>

            <h2 className="text-lg font-medium text-neutral-950">
              Who is here, and how often are they engaging?
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
  Separate audience size from browsing frequency to understand both reach and repeat engagement.
</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
  <div className="rounded-[24px] border border-black/10 bg-white p-5">
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
      Exposed sessions
    </div>

    <div className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
      {formatNumber(
        data.overview.exposedSessions
      )}
    </div>

    <p className="mt-2 text-xs leading-5 text-neutral-400">
      Unique browsing sessions exposed to {selectedMarketLabel} after the selected filters.
    </p>
  </div>

  <div className="rounded-[24px] border border-black/10 bg-white p-5">
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
      Identified shoppers
    </div>

    <div className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
      {formatNumber(
        data.overview.identifiedShoppers
      )}
    </div>

    <p className="mt-2 text-xs leading-5 text-neutral-400">
      Unique registered shoppers represented within these exposure sessions.
    </p>
  </div>

  <div className="rounded-[24px] border border-black/10 bg-white p-5">
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
      Sessions / shopper
    </div>

    <div className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
      {data.overview.identifiedShoppers > 0
        ? data.overview.sessionsPerShopper.toFixed(1)
        : "—"}
    </div>

    <p className="mt-2 text-xs leading-5 text-neutral-400">
      Average qualifying exposure sessions per identified shopper.
    </p>
  </div>

  <div className="rounded-[24px] border border-black/10 bg-white p-5">
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
      Returning shoppers
    </div>

    <div className="mt-3 flex items-baseline gap-2">
      <span className="text-3xl font-semibold tracking-tight text-neutral-950">
        {formatNumber(
          data.overview.returningShoppers
        )}
      </span>

      <span className="text-sm font-semibold text-[#7B2D3E]">
        {percent(
          data.overview.returningShopperRate
        )}
      </span>
    </div>

    <p className="mt-2 text-xs leading-5 text-neutral-400">
      Identified shoppers with more than one qualifying exposure session in this period.
    </p>
  </div>
</div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Panel
            title={
              market ===
              "all"
                ? "Where are registered shoppers based?"
                : `Who is responding to ${countryLabel(
                    market
                  )} brands?`
            }
            subtitle="Unique registered shoppers by country, with their qualifying exposure sessions."
          >
            <HorizontalBarChart
              rows={
                countryRows
              }
              maxValue={
                maxCountry
              }
              valueLabel={(row) =>
  `${formatNumber(
    row.value
  )} shopper${
    row.value === 1
      ? ""
      : "s"
  } · ${formatNumber(
    row.exposedSessions
  )} sessions`
}
              emptyText="No registered-country data for this filtered cohort yet."
            />

            {data.overview
  .knownCountryShoppers <
5 ? (
              <div className="border-t border-black/5 px-6 py-4 text-xs leading-5 text-amber-700">
                Low demographic sample · only{" "}
                {data.overview.knownCountryShoppers} identified shoppers have known registered-country data.
              </div>
            ) : null}
          </Panel>

          <Panel
            title={
              market ===
              "all"
                ? "Which age groups are represented?"
                : `Age profile of the ${countryLabel(
                    market
                  )} market audience`
            }
            subtitle="Unique registered shoppers by age group, with their qualifying exposure sessions."
          >
            <HorizontalBarChart
              rows={
                ageRows
              }
              maxValue={
                maxAge
              }
              valueLabel={(row) =>
  `${formatNumber(
    row.value
  )} shopper${
    row.value === 1
      ? ""
      : "s"
  } · ${formatNumber(
    row.exposedSessions
  )} sessions`
}
              emptyText="No known-age data for this filtered cohort yet."
            />

            {data.overview
              .knownAgeShoppers <
            5 ? (
              <div className="border-t border-black/5 px-6 py-4 text-xs leading-5 text-amber-700">
                Low demographic sample · only{" "}
                {data.overview.knownAgeShoppers} identified shoppers have known age data.
              </div>
            ) : null}
          </Panel>
        </section>

       <Panel
  title="Brand market exposure"
  subtitle="Unique exposed sessions by brand home market."
>
          <HorizontalBarChart
            rows={
              marketRows
            }
            maxValue={
              maxMarket
            }
            valueLabel={(
              row
            ) =>
              formatNumber(
                row.value
              )
            }
            emptyText="No brand-market exposure for this filter combination."
          />
        </Panel>

        <section className="space-y-5">
  <div>
    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
      Audience response
    </div>

    <h2 className="mt-1 text-xl font-medium text-neutral-950">
      What does this audience respond to?
    </h2>

    <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
      Fashion signals ranked by response strength across views,
      saves and shop intent within this exact filtered audience.
    </p>
  </div>

  <div className="grid gap-5 xl:grid-cols-2">
    <SignalRanking
      title="Product type"
      subtitle="Which product categories generate the strongest response?"
      rows={
        productTypeSignals
      }
    />

    <SignalRanking
      title="Occasion"
      subtitle="Which shopping occasions resonate most strongly?"
      rows={
        occasionSignals
      }
    />

    <SignalRanking
      title="Colour"
      subtitle="Which colours generate the strongest response?"
      rows={
        colourSignals
      }
    />

    <SignalRanking
      title="Style"
      subtitle="Which fashion styles generate the strongest response?"
      rows={
        styleSignals
      }
    />
  </div>

  <SignalRanking
    title="Material"
    subtitle="Which materials generate the strongest response?"
    rows={
      materialSignals
    }
  />
</section>

<section className="space-y-4">
  <div>
    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
      Cross intelligence
    </div>

    <h2 className="mt-1 text-xl font-medium text-neutral-950">
      How does product response differ by age?
    </h2>

    <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
      Compare product-type response strength across age groups
      within the exact audience, market and discovery filters above.
    </p>
  </div>

  <Panel
    title="Age × Product Type"
    subtitle="Each cell uses the same weighted response-strength methodology. Low-sample cells are protected from ranking."
  >
    <AgeProductTypeHeatmap
      cells={
        ageProductTypeCells
      }
      productTypes={
        heatmapProductTypes
      }
      ageBands={
        heatmapAgeBands
      }
    />

    <div className="border-t border-black/5 px-6 py-4 text-xs leading-5 text-neutral-400">
      Response Strength =
      {" "}
      20% view rate +
      {" "}
      30% save rate +
      {" "}
      50% shop-intent rate.
      Cells require at least 5 unique exposed sessions to qualify.
    </div>
  </Panel>
</section>

<section className="space-y-4">
  <div>
    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
      Cross intelligence
    </div>

    <h2 className="mt-1 text-xl font-medium text-neutral-950">
      Which shopper countries respond to each brand market?
    </h2>

    <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
      Compare response strength between registered shopper countries
      and the home markets of the brands they interact with.
    </p>
  </div>

  <Panel
    title="Brand Market × Shopper Country"
    subtitle="Each cell measures response to products from that brand market within that registered-country audience."
  >
    <MarketShopperCountryHeatmap
      cells={
        marketShopperCountryCells
      }
      markets={
        marketCountryMarkets
      }
      countries={
        marketCountryCountries
      }
    />

    <div className="border-t border-black/5 px-6 py-4 text-xs leading-5 text-neutral-400">
      Response Strength =
      {" "}
      20% view rate +
      {" "}
      30% save rate +
      {" "}
      50% shop-intent rate.
      Cells require at least 5 unique exposed sessions to qualify.
    </div>
  </Panel>
</section>

<section className="space-y-4">
  <div>
    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
      Cross intelligence
    </div>

    <h2 className="mt-1 text-xl font-medium text-neutral-950">
      Where is product demand being discovered?
    </h2>

    <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
      Compare product-type response strength across the different discovery
      surfaces that introduced shoppers to those products.
    </p>
  </div>

  <Panel
    title="Discovery Source × Product Type"
    subtitle="Each cell measures product response within the discovery source that originally introduced the shopper to that product."
  >
    <DiscoveryProductTypeHeatmap
      cells={
        discoveryProductTypeCells
      }
      discoverySources={
        discoveryHeatmapSources
      }
      productTypes={
        discoveryHeatmapProductTypes
      }
    />

    <div className="border-t border-black/5 px-6 py-4 text-xs leading-5 text-neutral-400">
      Response Strength =
      {" "}
      20% view rate +
      {" "}
      30% save rate +
      {" "}
      50% shop-intent rate.
      Cells require at least 5 unique exposed sessions to qualify.
    </div>
  </Panel>
</section>

<section className="space-y-4">
  <div>
    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
      Opportunity intelligence
    </div>

    <h2 className="mt-1 text-xl font-medium text-neutral-950">
      Where are the strongest opportunities?
    </h2>

    <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
      Ranked combinations of audience, brand market, discovery source
      and product type showing the strongest qualified response.
    </p>
  </div>

  <Panel
    title="Strongest Opportunities"
    subtitle="Only combinations with at least 5 unique exposed sessions are eligible for ranking."
  >
    <OpportunityRanking
      rows={
        strongestOpportunities
      }
    />

    <div className="border-t border-black/5 px-6 py-4 text-xs leading-5 text-neutral-400">
      Opportunity ranking uses the same Response Strength methodology:
      {" "}
      20% view rate +
      {" "}
      30% save rate +
      {" "}
      50% shop-intent rate.
      Low-sample combinations are excluded entirely.
    </div>
  </Panel>
</section>

      </div>
    </div>
  );
}