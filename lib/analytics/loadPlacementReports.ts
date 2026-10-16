import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_REPORTING_DAYS = 30;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_REPORT_PAGE = 100_000;

function safePositiveInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  if (
    value === undefined ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    return fallback;
  }

  return Math.min(value, maximum);
}

function safeCount(value: bigint, label: string): number {
  if (
    value < BigInt(0) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error(
      `${label} exceeds the supported safe integer range`,
    );
  }

  return Number(value);
}

function paginationMetadata(
  totalRows: number,
  requestedPage: number,
  pageSize: number,
) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return {
    totalRows,
    totalPages,
    page: requestedPage,
    pageSize,
  };
}

type ReportingDb = Pick<
  PrismaClient,
  "$queryRaw" | "product"
>;

type ReportOptions = {
  days?: 7 | 30 | 90;
  page?: number;
  pageSize?: number;

  /**
   * Allows a verified local Prisma client to be injected
   * during integration testing.
   */
  db?: ReportingDb;
};

type PlacementSqlRow = {
  productId: string;
  discoverySource: string | null;
  sectionKey: string | null;
  position: number | null;
  pageNumber: number | null;
  contextType: string | null;

  impressions: bigint;
  directClicks: bigint;
  pdpClicks: bigint;
  unknownOriginClicks: bigint;
  totalClicks: bigint;
  uniqueClickingSessions: bigint;
};
type PlacementPageSqlRow = {
  totalRows: bigint;

  productId: string | null;
  discoverySource: string | null;
  sectionKey: string | null;
  position: number | null;
  pageNumber: number | null;
  contextType: string | null;

  impressions: bigint | null;
  directClicks: bigint | null;
  pdpClicks: bigint | null;
  unknownOriginClicks: bigint | null;
  totalClicks: bigint | null;
  uniqueClickingSessions: bigint | null;
};

type JourneySqlRow = {
  entrySource: string | null;
  entrySectionKey: string | null;
  entryPosition: number | null;
  entryPageNumber: number | null;
  entryContextType: string | null;

  discoverySource: string | null;
  sectionKey: string | null;
  position: number | null;
  pageNumber: number | null;
  contextType: string | null;

  clickOrigin: string;
  shopClicks: bigint;
  uniqueClickingSessions: bigint;
};
type JourneyPageSqlRow = {
  totalRows: bigint;

  entrySource: string | null;
  entrySectionKey: string | null;
  entryPosition: number | null;
  entryPageNumber: number | null;
  entryContextType: string | null;

  discoverySource: string | null;
  sectionKey: string | null;
  position: number | null;
  pageNumber: number | null;
  contextType: string | null;

  clickOrigin: string | null;
  shopClicks: bigint | null;
  uniqueClickingSessions: bigint | null;
};

function normalizeOptions(options: ReportOptions = {}) {
  const days = [7, 30, 90].includes(options.days ?? 30)
    ? (options.days ?? DEFAULT_REPORTING_DAYS)
    : DEFAULT_REPORTING_DAYS;

  const page = safePositiveInteger(
    options.page,
    1,
    MAX_REPORT_PAGE,
  );

  const pageSize = safePositiveInteger(
    options.pageSize,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );

  return {
    days,
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

function percentage(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator === 0) return null;

  return (numerator / denominator) * 100;
}

export async function loadPlacementPerformance(
  options: ReportOptions = {},
) {
  const db = options.db ?? prisma;

  const { days, page, pageSize, offset } =
    normalizeOptions(options);

  const endDate = new Date();

  const startDate = new Date(
    endDate.getTime() - days * 24 * 60 * 60 * 1000,
  );

  const pageResults = await db.$queryRaw<PlacementPageSqlRow[]>`
    WITH attributed_events AS (
      SELECT
        "productId",
        "sessionId",
        "eventType",

        CASE
          WHEN "eventType" = 'PRODUCT_IMPRESSION'
          THEN COALESCE(
            "sourcePage"::text,
            NULLIF(TRIM(metadata->>'discoverySource'), '')
          )
          ELSE NULLIF(
            TRIM(metadata->>'discoverySource'),
            ''
          )
        END AS discovery_source,

        COALESCE(
          NULLIF(TRIM(metadata->>'sectionKey'), ''),
          NULLIF(TRIM("sectionKey"), '')
        ) AS section_key,

       COALESCE(
  CASE
    WHEN jsonb_typeof(metadata->'position') = 'number'
      AND metadata->>'position' ~ '^[1-9][0-9]{0,8}$'
    THEN (metadata->>'position')::integer
    ELSE NULL
  END,
  "position"
) AS position,

COALESCE(
  CASE
    WHEN jsonb_typeof(metadata->'pageNumber') = 'number'
      AND metadata->>'pageNumber' ~ '^[1-9][0-9]{0,8}$'
    THEN (metadata->>'pageNumber')::integer
    ELSE NULL
  END,
  "pageNumber"
) AS page_number,

        COALESCE(
          NULLIF(TRIM(metadata->>'contextType'), ''),
          NULLIF(TRIM("contextType"), '')
        ) AS context_type,

        CASE
          WHEN metadata->>'clickOrigin'
            IN ('PRODUCT_CARD', 'PRODUCT_DETAIL')
          THEN metadata->>'clickOrigin'
          ELSE 'UNKNOWN'
        END AS click_origin

      FROM "AnalyticsEvent"

      WHERE
        "createdAt" >= ${startDate}
        AND "createdAt" < ${endDate}
        AND "productId" IS NOT NULL
        AND "eventType" IN (
          'PRODUCT_IMPRESSION',
          'SHOP_CLICK'
        )
    ),

    grouped AS (
      SELECT
        "productId" AS "productId",
        discovery_source AS "discoverySource",
        section_key AS "sectionKey",
        position AS "position",
        page_number AS "pageNumber",
        context_type AS "contextType",

        COUNT(*) FILTER (
          WHERE "eventType" = 'PRODUCT_IMPRESSION'
        ) AS impressions,

        COUNT(*) FILTER (
          WHERE "eventType" = 'SHOP_CLICK'
            AND click_origin = 'PRODUCT_CARD'
        ) AS "directClicks",

        COUNT(*) FILTER (
          WHERE "eventType" = 'SHOP_CLICK'
            AND click_origin = 'PRODUCT_DETAIL'
        ) AS "pdpClicks",

        COUNT(*) FILTER (
          WHERE "eventType" = 'SHOP_CLICK'
            AND click_origin = 'UNKNOWN'
        ) AS "unknownOriginClicks",

        COUNT(*) FILTER (
          WHERE "eventType" = 'SHOP_CLICK'
        ) AS "totalClicks",

        COUNT(DISTINCT "sessionId") FILTER (
          WHERE "eventType" = 'SHOP_CLICK'
        ) AS "uniqueClickingSessions"

      FROM attributed_events

      GROUP BY
        "productId",
        discovery_source,
        section_key,
        position,
        page_number,
        context_type
    )

        ,
        total AS (
      SELECT COUNT(*) AS "totalRows"
      FROM grouped
    ),

    paged AS (
      SELECT *
      FROM grouped
      ORDER BY
        "totalClicks" DESC,
        impressions DESC,
        "productId" ASC,
        "discoverySource" ASC NULLS LAST,
        "sectionKey" ASC NULLS LAST,
        "position" ASC NULLS LAST,
        "pageNumber" ASC NULLS LAST,
        "contextType" ASC NULLS LAST
      LIMIT ${pageSize}
      OFFSET ${offset}
    )

    SELECT
      total."totalRows",
      paged."productId",
      paged."discoverySource",
      paged."sectionKey",
      paged."position",
      paged."pageNumber",
      paged."contextType",
      paged.impressions,
      paged."directClicks",
      paged."pdpClicks",
      paged."unknownOriginClicks",
      paged."totalClicks",
      paged."uniqueClickingSessions"
    FROM total
    LEFT JOIN paged ON TRUE
  `;

  const totalRows = safeCount(
  pageResults[0]?.totalRows ?? BigInt(0),
  "Placement report total rows",
);

const pagination = paginationMetadata(
  totalRows,
  page,
  pageSize,
);

  const rows: PlacementSqlRow[] = pageResults.flatMap((result) => {
  if (
    result.productId === null ||
    result.impressions === null ||
    result.directClicks === null ||
    result.pdpClicks === null ||
    result.unknownOriginClicks === null ||
    result.totalClicks === null ||
    result.uniqueClickingSessions === null
  ) {
    return [];
  }

  return [{
    productId: result.productId,
    discoverySource: result.discoverySource,
    sectionKey: result.sectionKey,
    position: result.position,
    pageNumber: result.pageNumber,
    contextType: result.contextType,
    impressions: result.impressions,
    directClicks: result.directClicks,
    pdpClicks: result.pdpClicks,
    unknownOriginClicks: result.unknownOriginClicks,
    totalClicks: result.totalClicks,
    uniqueClickingSessions: result.uniqueClickingSessions,
  }];
});
  const productIds = rows.map((row) => row.productId);

  const products = productIds.length
    ? await db.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
          title: true,
        },
      })
    : [];

  const productNames = Object.fromEntries(
    products.map((product) => [
      product.id,
      product.title,
    ]),
  );

 return {
  startDate,
  endDate,
  days,
  page,
  pageSize,
  totalRows: pagination.totalRows,
  totalPages: pagination.totalPages,
  productNames,

    rows: rows.map((row) => {
const impressions = safeCount(row.impressions, "Impressions");
const directClicks = safeCount(row.directClicks, "Direct clicks");
const pdpClicks = safeCount(row.pdpClicks, "PDP clicks");
const unknownOriginClicks = safeCount(
  row.unknownOriginClicks,
  "Unknown-origin clicks",
);
const totalClicks = safeCount(row.totalClicks, "Total clicks");

      return {
        ...row,

        impressions,
        directClicks,
        pdpClicks,
        unknownOriginClicks,
        totalClicks,

       uniqueClickingSessions: safeCount(
          row.uniqueClickingSessions,
          "Unique clicking sessions",
          ),

        shopCtr: percentage(
          totalClicks,
          impressions,
        ),

        directCtr: percentage(
          directClicks,
          impressions,
        ),

        pdpCtr: percentage(
          pdpClicks,
          impressions,
        ),
      };
    }),
  };
}

export async function loadDiscoveryJourneys(
  options: ReportOptions = {},
) {
  const db = options.db ?? prisma;

  const { days, page, pageSize, offset } =
    normalizeOptions(options);

  const endDate = new Date();

  const startDate = new Date(
    endDate.getTime() - days * 24 * 60 * 60 * 1000,
  );

  const pageResults = await db.$queryRaw<JourneyPageSqlRow[]>`
    WITH attributed_clicks AS (
      SELECT
        "sessionId",

        NULLIF(
          TRIM(metadata->>'entrySource'),
          ''
        ) AS entry_source,

        NULLIF(
          TRIM(metadata->>'entrySectionKey'),
          ''
        ) AS entry_section_key,

        CASE
          WHEN jsonb_typeof(metadata->'entryPosition') = 'number'
            AND metadata->>'entryPosition' ~ '^[1-9][0-9]{0,8}$'
          THEN (metadata->>'entryPosition')::integer
          ELSE NULL
        END AS entry_position,

        CASE
          WHEN jsonb_typeof(metadata->'entryPageNumber') = 'number'
            AND metadata->>'entryPageNumber' ~ '^[1-9][0-9]{0,8}$'
          THEN (metadata->>'entryPageNumber')::integer
          ELSE NULL
        END AS entry_page_number,

        NULLIF(
          TRIM(metadata->>'entryContextType'),
          ''
        ) AS entry_context_type,

        NULLIF(
          TRIM(metadata->>'discoverySource'),
          ''
        ) AS discovery_source,

        COALESCE(
          NULLIF(TRIM(metadata->>'sectionKey'), ''),
          NULLIF(TRIM("sectionKey"), '')
        ) AS section_key,

        COALESCE(
          CASE
            WHEN jsonb_typeof(metadata->'position') = 'number'
              AND metadata->>'position' ~ '^[1-9][0-9]{0,8}$'
            THEN (metadata->>'position')::integer
            ELSE NULL
          END,
          "position"
        ) AS position,

        COALESCE(
          CASE
            WHEN jsonb_typeof(metadata->'pageNumber') = 'number'
              AND metadata->>'pageNumber' ~ '^[1-9][0-9]{0,8}$'
            THEN (metadata->>'pageNumber')::integer
            ELSE NULL
          END,
          "pageNumber"
        ) AS page_number,

        COALESCE(
          NULLIF(TRIM(metadata->>'contextType'), ''),
          NULLIF(TRIM("contextType"), '')
        ) AS context_type,

        CASE
          WHEN metadata->>'clickOrigin'
            IN ('PRODUCT_CARD', 'PRODUCT_DETAIL')
          THEN metadata->>'clickOrigin'
          ELSE 'UNKNOWN'
        END AS click_origin

      FROM "AnalyticsEvent"

      WHERE
        "createdAt" >= ${startDate}
        AND "createdAt" < ${endDate}
        AND "productId" IS NOT NULL
        AND "eventType" = 'SHOP_CLICK'
    ),

    grouped AS (
      SELECT
        entry_source AS "entrySource",
        entry_section_key AS "entrySectionKey",
        entry_position AS "entryPosition",
        entry_page_number AS "entryPageNumber",
        entry_context_type AS "entryContextType",

        discovery_source AS "discoverySource",
        section_key AS "sectionKey",
        position AS "position",
        page_number AS "pageNumber",
        context_type AS "contextType",

        click_origin AS "clickOrigin",

        COUNT(*) AS "shopClicks",

        COUNT(DISTINCT "sessionId")
          AS "uniqueClickingSessions"

      FROM attributed_clicks

      GROUP BY
        entry_source,
        entry_section_key,
        entry_position,
        entry_page_number,
        entry_context_type,
        discovery_source,
        section_key,
        position,
        page_number,
        context_type,
        click_origin
    ),

    total AS (
      SELECT COUNT(*) AS "totalRows"
      FROM grouped
    ),

    paged AS (
      SELECT *
      FROM grouped
      ORDER BY
        "shopClicks" DESC,
        "entrySource" ASC NULLS LAST,
        "entrySectionKey" ASC NULLS LAST,
        "entryPosition" ASC NULLS LAST,
        "entryPageNumber" ASC NULLS LAST,
        "entryContextType" ASC NULLS LAST,
        "discoverySource" ASC NULLS LAST,
        "sectionKey" ASC NULLS LAST,
        "position" ASC NULLS LAST,
        "pageNumber" ASC NULLS LAST,
        "contextType" ASC NULLS LAST,
        "clickOrigin" ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
    )

    SELECT
      total."totalRows",

      paged."entrySource",
      paged."entrySectionKey",
      paged."entryPosition",
      paged."entryPageNumber",
      paged."entryContextType",

      paged."discoverySource",
      paged."sectionKey",
      paged."position",
      paged."pageNumber",
      paged."contextType",

      paged."clickOrigin",
      paged."shopClicks",
      paged."uniqueClickingSessions"

    FROM total
    LEFT JOIN paged ON TRUE
  `;

  const totalRows = safeCount(
  pageResults[0]?.totalRows ?? BigInt(0),
  "Discovery Journeys total rows",
);

const rows: JourneySqlRow[] = pageResults.flatMap((result) => {
  if (
    result.clickOrigin === null ||
    result.shopClicks === null ||
    result.uniqueClickingSessions === null
  ) {
    return [];
  }

  return [{
    entrySource: result.entrySource,
    entrySectionKey: result.entrySectionKey,
    entryPosition: result.entryPosition,
    entryPageNumber: result.entryPageNumber,
    entryContextType: result.entryContextType,

    discoverySource: result.discoverySource,
    sectionKey: result.sectionKey,
    position: result.position,
    pageNumber: result.pageNumber,
    contextType: result.contextType,

    clickOrigin: result.clickOrigin,
    shopClicks: result.shopClicks,
    uniqueClickingSessions: result.uniqueClickingSessions,
  }];
});

const pagination = paginationMetadata(
  totalRows,
  page,
  pageSize,
);

return {
  startDate,
  endDate,
  days,
  page,
  pageSize,
  totalRows: pagination.totalRows,
  totalPages: pagination.totalPages,

    rows: rows.map((row) => ({
      ...row,

      shopClicks: safeCount(row.shopClicks, "Journey shop clicks"),

      uniqueClickingSessions: safeCount(
         row.uniqueClickingSessions,
        "Journey unique clicking sessions",
      ),

      attributionEvidence: row.entrySource
        ? ("URL_REPORTED" as const)
        : ("UNKNOWN" as const),
    })),
  };
}