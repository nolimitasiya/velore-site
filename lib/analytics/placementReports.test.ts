import { describe, expect, it } from "vitest";

import {
  buildDiscoveryJourneys,
  buildPlacementPerformance,
  type ReportingEvent,
} from "./placementReports";

function makeEvent(
  overrides: Partial<ReportingEvent> = {},
): ReportingEvent {
  return {
    sessionId: "session-1",
    eventType: "PRODUCT_IMPRESSION",
    productId: "dress-a",
    sourcePage: "HOME",
    sectionKey: "shop_trendy",
    position: 2,
    pageNumber: 1,
    contextType: "SHOP_TRENDY",
    metadata: {
      discoverySource: "HOME",
    },
    ...overrides,
  };
}

describe("Placement Performance", () => {
  it("calculates impressions, clicks and CTR", () => {
    const events: ReportingEvent[] = [
      ...Array.from({ length: 10 }, (_, index) =>
        makeEvent({
          sessionId: `impression-${index}`,
        }),
      ),

      makeEvent({
        eventType: "SHOP_CLICK",
        sessionId: "shopper-1",
        sourcePage: "PRODUCT",
        metadata: {
          discoverySource: "HOME",
          clickOrigin: "PRODUCT_CARD",
        },
      }),

      makeEvent({
        eventType: "SHOP_CLICK",
        sessionId: "shopper-2",
        sourcePage: "PRODUCT",
        metadata: {
          discoverySource: "HOME",
          clickOrigin: "PRODUCT_DETAIL",
        },
      }),
    ];

    const rows = buildPlacementPerformance(events);

    expect(rows).toHaveLength(1);

    expect(rows[0]).toMatchObject({
      productId: "dress-a",
      impressions: 10,
      directClicks: 1,
      pdpClicks: 1,
      unknownOriginClicks: 0,
      totalClicks: 2,
      uniqueClickingSessions: 2,
      shopCtr: 20,
      directCtr: 10,
      pdpCtr: 10,
    });
  });

  it("keeps different product placements separate", () => {
    const events = [
      makeEvent(),

      makeEvent({
        sectionKey: "new_in",
        position: 4,
        contextType: "NEW_IN",
      }),
    ];

    const rows = buildPlacementPerformance(events);

    expect(rows).toHaveLength(2);

    expect(rows.map((row) => row.impressions)).toEqual([1, 1]);
  });

  it("counts repeat clicks but deduplicates clicking sessions", () => {
    const click = makeEvent({
      eventType: "SHOP_CLICK",
      sourcePage: "PRODUCT",
      sessionId: "same-shopper",
      metadata: {
        discoverySource: "HOME",
        clickOrigin: "PRODUCT_CARD",
      },
    });

    const rows = buildPlacementPerformance([
      makeEvent(),
      click,
      { ...click },
    ]);

    expect(rows[0].totalClicks).toBe(2);
    expect(rows[0].uniqueClickingSessions).toBe(1);
  });

  it("keeps missing discovery attribution unassigned", () => {
    const rows = buildPlacementPerformance([
      makeEvent({
        eventType: "SHOP_CLICK",
        sourcePage: "PRODUCT",
        metadata: {
          clickOrigin: "PRODUCT_DETAIL",
        },
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].placement.discoverySource).toBeNull();
    expect(rows[0].impressions).toBe(0);
    expect(rows[0].shopCtr).toBeNull();
  });

  it("preserves clicks with unknown origin", () => {
    const rows = buildPlacementPerformance([
      makeEvent(),
      makeEvent({
        eventType: "SHOP_CLICK",
        sourcePage: "PRODUCT",
        metadata: {
          discoverySource: "HOME",
        },
      }),
    ]);

    expect(rows[0]).toMatchObject({
      impressions: 1,
      directClicks: 0,
      pdpClicks: 0,
      unknownOriginClicks: 1,
      totalClicks: 1,
      shopCtr: 100,
    });
  });

  it("does not calculate CTR without impressions", () => {
    const rows = buildPlacementPerformance([
      makeEvent({
        eventType: "SHOP_CLICK",
        sourcePage: "PRODUCT",
        metadata: {
          discoverySource: "HOME",
          clickOrigin: "PRODUCT_CARD",
        },
      }),
    ]);

    expect(rows[0].shopCtr).toBeNull();
    expect(rows[0].directCtr).toBeNull();
    expect(rows[0].pdpCtr).toBeNull();
  });
});

describe("Discovery Journeys", () => {
  it("groups earlier entry, placement and click origin", () => {
    const rows = buildDiscoveryJourneys([
      makeEvent({
        eventType: "SHOP_CLICK",
        sourcePage: "PRODUCT",
        sectionKey: "brand_product_grid",
        position: 3,
        contextType: "BRAND_PRODUCT_GRID",
        metadata: {
          entrySource: "EMERGING_BRANDS",
          discoverySource: "BRAND",
          clickOrigin: "PRODUCT_DETAIL",
        },
      }),
    ]);

    expect(rows).toHaveLength(1);

    expect(rows[0]).toMatchObject({
      entrySource: "EMERGING_BRANDS",
      discoverySource: "BRAND",
      sectionKey: "brand_product_grid",
      position: 3,
      clickOrigin: "PRODUCT_DETAIL",
      shopClicks: 1,
      uniqueClickingSessions: 1,
      attributionEvidence: "URL_REPORTED",
    });
  });

  it("keeps unknown earlier entries unknown", () => {
    const rows = buildDiscoveryJourneys([
      makeEvent({
        eventType: "SHOP_CLICK",
        sourcePage: "PRODUCT",
        metadata: {
          discoverySource: "SEARCH",
          clickOrigin: "PRODUCT_CARD",
        },
      }),
    ]);

    expect(rows[0].entrySource).toBeNull();
    expect(rows[0].attributionEvidence).toBe("UNKNOWN");
  });

  it("separates Direct and PDP journeys", () => {
    const base = {
      eventType: "SHOP_CLICK",
      sourcePage: "PRODUCT",
    };

    const rows = buildDiscoveryJourneys([
      makeEvent({
        ...base,
        metadata: {
          discoverySource: "HOME",
          clickOrigin: "PRODUCT_CARD",
        },
      }),
      makeEvent({
        ...base,
        metadata: {
          discoverySource: "HOME",
          clickOrigin: "PRODUCT_DETAIL",
        },
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.clickOrigin).sort()).toEqual([
      "PRODUCT_CARD",
      "PRODUCT_DETAIL",
    ]);
  });

  it("counts unique clicking sessions within a journey", () => {
    const click = makeEvent({
      eventType: "SHOP_CLICK",
      sourcePage: "PRODUCT",
      sessionId: "session-1",
      metadata: {
        entrySource: "SEARCH",
        discoverySource: "BRAND",
        clickOrigin: "PRODUCT_DETAIL",
      },
    });

    const rows = buildDiscoveryJourneys([
      click,
      { ...click },
      {
        ...click,
        sessionId: "session-2",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].shopClicks).toBe(3);
    expect(rows[0].uniqueClickingSessions).toBe(2);
  });

  it("ignores impressions when calculating Shop journeys", () => {
    const rows = buildDiscoveryJourneys([
      makeEvent(),
    ]);

    expect(rows).toHaveLength(0);
  });
});