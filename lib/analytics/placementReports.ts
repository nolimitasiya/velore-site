import type { Prisma } from "@prisma/client";

import {
  placementKey,
  readPlacementAttribution,
  type PlacementAttribution,
} from "@/lib/analytics/placementAttribution";

export type ReportingEvent = {
  sessionId: string;
  eventType: string;
  productId: string | null;
  sourcePage: string | null;
  sectionKey: string | null;
  position: number | null;
  pageNumber: number | null;
  contextType: string | null;
  metadata: Prisma.JsonValue | null;
};

export type PlacementPerformanceRow = {
  key: string;
  productId: string;
  placement: PlacementAttribution;
  impressions: number;
  directClicks: number;
  pdpClicks: number;
  unknownOriginClicks: number;
  totalClicks: number;
  uniqueClickingSessions: number;
  shopCtr: number | null;
  directCtr: number | null;
  pdpCtr: number | null;
};

type MutablePlacementRow = PlacementPerformanceRow & {
  clickingSessions: Set<string>;
};

function percentage(
  numerator: number,
  denominator: number
): number | null {
  if (denominator === 0) return null;

  return (numerator / denominator) * 100;
}

export function buildPlacementPerformance(
  events: ReportingEvent[]
): PlacementPerformanceRow[] {
  const rows = new Map<string, MutablePlacementRow>();

  for (const event of events) {
    if (!event.productId) continue;

    if (
      event.eventType !== "PRODUCT_IMPRESSION" &&
      event.eventType !== "SHOP_CLICK"
    ) {
      continue;
    }

    const attribution = readPlacementAttribution(event);

    // Impressions have an actual sourcePage column.
    // SHOP_CLICK sourcePage is the action location (PRODUCT),
    // so its discovery source must come from metadata.
    const placement: PlacementAttribution =
      event.eventType === "PRODUCT_IMPRESSION"
        ? {
            ...attribution,
            discoverySource:
              event.sourcePage ??
              attribution.discoverySource,
          }
        : attribution;

    const key = placementKey(event.productId, placement);

    let row = rows.get(key);

    if (!row) {
      row = {
        key,
        productId: event.productId,
        placement,
        impressions: 0,
        directClicks: 0,
        pdpClicks: 0,
        unknownOriginClicks: 0,
        totalClicks: 0,
        uniqueClickingSessions: 0,
        shopCtr: null,
        directCtr: null,
        pdpCtr: null,
        clickingSessions: new Set<string>(),
      };

      rows.set(key, row);
    }

    if (event.eventType === "PRODUCT_IMPRESSION") {
      row.impressions += 1;
      continue;
    }

    row.totalClicks += 1;
    row.clickingSessions.add(event.sessionId);

    switch (placement.clickOrigin) {
      case "PRODUCT_CARD":
        row.directClicks += 1;
        break;

      case "PRODUCT_DETAIL":
        row.pdpClicks += 1;
        break;

      default:
        row.unknownOriginClicks += 1;
    }
  }

  return [...rows.values()]
    .map(({ clickingSessions, ...row }) => ({
      ...row,
      uniqueClickingSessions: clickingSessions.size,
      shopCtr: percentage(row.totalClicks, row.impressions),
      directCtr: percentage(row.directClicks, row.impressions),
      pdpCtr: percentage(row.pdpClicks, row.impressions),
    }))
    .sort((a, b) => {
      return (
        b.totalClicks - a.totalClicks ||
        b.impressions - a.impressions
      );
    });
}
export type DiscoveryJourneyRow = {
  key: string;

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

  clickOrigin: PlacementAttribution["clickOrigin"];

  shopClicks: number;
  uniqueClickingSessions: number;

  attributionEvidence: "URL_REPORTED" | "UNKNOWN";
};

type MutableJourneyRow = DiscoveryJourneyRow & {
  clickingSessions: Set<string>;
};

export function buildDiscoveryJourneys(
  events: ReportingEvent[]
): DiscoveryJourneyRow[] {
  const rows = new Map<string, MutableJourneyRow>();

  for (const event of events) {
    if (
      event.eventType !== "SHOP_CLICK" ||
      !event.productId
    ) {
      continue;
    }

    const attribution = readPlacementAttribution(event);

    const key = JSON.stringify([
      attribution.entrySource,
      attribution.entrySectionKey,
      attribution.entryPosition,
      attribution.entryPageNumber,
      attribution.entryContextType,

      attribution.discoverySource,
      attribution.sectionKey,
      attribution.position,
      attribution.pageNumber,
      attribution.contextType,

      attribution.clickOrigin,
    ]);

    let row = rows.get(key);

    if (!row) {
      row = {
        key,

        entrySource: attribution.entrySource,
        entrySectionKey: attribution.entrySectionKey,
        entryPosition: attribution.entryPosition,
        entryPageNumber: attribution.entryPageNumber,
        entryContextType: attribution.entryContextType,

        discoverySource: attribution.discoverySource,
        sectionKey: attribution.sectionKey,
        position: attribution.position,
        pageNumber: attribution.pageNumber,
        contextType: attribution.contextType,

        clickOrigin: attribution.clickOrigin,

        shopClicks: 0,
        uniqueClickingSessions: 0,

        attributionEvidence: attribution.entrySource
          ? "URL_REPORTED"
          : "UNKNOWN",

        clickingSessions: new Set<string>(),
      };

      rows.set(key, row);
    }

    row.shopClicks += 1;
    row.clickingSessions.add(event.sessionId);
  }

  return [...rows.values()]
    .map(({ clickingSessions, ...row }) => ({
      ...row,
      uniqueClickingSessions: clickingSessions.size,
    }))
    .sort((a, b) => b.shopClicks - a.shopClicks);
}