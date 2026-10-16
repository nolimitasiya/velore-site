import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import {
  loadDiscoveryJourneys,
  loadPlacementPerformance,
} from "../lib/analytics/loadPlacementReports";

let db: PrismaClient;

function getApprovedLocalUrl(): string {
  const raw = process.env.LOCAL_ANALYTICS_TEST_DATABASE_URL;

  if (!raw) {
    throw new Error("Missing LOCAL_ANALYTICS_TEST_DATABASE_URL");
  }

  const url = new URL(raw);

  const approved =
    ["postgresql:", "postgres:"].includes(url.protocol) &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    url.port === "5432" &&
    decodeURIComponent(url.pathname) ===
      "/veilora_security_migration_test_20261013";

  if (!approved) {
    throw new Error("STOP: Unapproved database destination.");
  }

  return raw;
}

describe("Local placement reporting SQL", () => {
  beforeAll(async () => {
    db = new PrismaClient({
      datasources: {
        db: {
          url: getApprovedLocalUrl(),
        },
      },
    });

    const identity = await db.$queryRaw<
      Array<{ approved: boolean }>
    >`
      SELECT current_database() =
        'veilora_security_migration_test_20261013'
        AS approved
    `;

    if (identity[0]?.approved !== true) {
      throw new Error("Database identity verification failed.");
    }
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  it("executes the complete placement query", async () => {
    const report = await loadPlacementPerformance({
      db,
      days: 30,
      page: 1,
      pageSize: 10,
    });

    expect(Array.isArray(report.rows)).toBe(true);
    expect(report.days).toBe(30);
    expect(report.page).toBe(1);
  });

  it("executes the complete journey query", async () => {
    const report = await loadDiscoveryJourneys({
      db,
      days: 30,
      page: 1,
      pageSize: 10,
    });

    expect(Array.isArray(report.rows)).toBe(true);
    expect(report.days).toBe(30);
    expect(report.page).toBe(1);
  });

  it("accepts a Prisma transaction client", async () => {
  const rollbackMarker = "ROLLBACK_REPORTING_TEST";

  await expect(
    db.$transaction(async (tx) => {
      const placements = await loadPlacementPerformance({
        db: tx,
        days: 30,
        page: 1,
        pageSize: 10,
      });

      const journeys = await loadDiscoveryJourneys({
        db: tx,
        days: 30,
        page: 1,
        pageSize: 10,
      });

      expect(Array.isArray(placements.rows)).toBe(true);
      expect(Array.isArray(journeys.rows)).toBe(true);

      // Deliberately roll back the transaction.
      throw new Error(rollbackMarker);
    }),
  ).rejects.toThrow(rollbackMarker);
});
it("calculates accurate placement metrics and discovery journeys", async () => {
  const rollbackMarker = "ROLLBACK_ANALYTICS_FIXTURES";

  await expect(
    db.$transaction(
      async (tx) => {
        // 1. Create a temporary brand and product.
        const brand = await tx.brand.create({
          data: {
            name: "Analytics Fixture Brand",
            slug: `analytics-fixture-${crypto.randomUUID()}`,
          },
        });

        const product = await tx.product.create({
          data: {
            brandId: brand.id,
            title: "Fixture Maxi Dress",
            slug: `fixture-dress-${crypto.randomUUID()}`,
            sourceUrl: `https://example.com/fixture-${crypto.randomUUID()}`,
          },
        });

        // 2. Create independent analytics sessions.
        const sessions = await Promise.all(
          Array.from({ length: 15 }, () =>
            tx.analyticsSession.create({
              data: {},
            }),
          ),
        );

        const shopTrendy = {
          sourcePage: "HOME" as const,
          sectionKey: "shop_trendy",
          position: 2,
          pageNumber: 1,
          contextType: "SHOP_TRENDY",
        };

        const newIn = {
          sourcePage: "NEW_IN" as const,
          sectionKey: "new_in",
          position: 4,
          pageNumber: 1,
          contextType: "NEW_IN",
        };

        // 3. Insert 10 Shop Trendy impressions.
        for (let i = 0; i < 10; i++) {
          await tx.analyticsEvent.create({
            data: {
              sessionId: sessions[i].id,
              productId: product.id,
              eventType: "PRODUCT_IMPRESSION",
              ...shopTrendy,
              metadata: {
                discoverySource: "HOME",
              },
            },
          });
        }

        // 4. Insert 2 Direct and 3 PDP Shop clicks.
        // Five clicks across four unique sessions.
        const clickOrigins = [
          "PRODUCT_CARD",
          "PRODUCT_CARD",
          "PRODUCT_DETAIL",
          "PRODUCT_DETAIL",
          "PRODUCT_DETAIL",
        ] as const;

        const clickSessions = [0, 1, 2, 3, 3];

        for (let i = 0; i < clickOrigins.length; i++) {
          await tx.analyticsEvent.create({
            data: {
              sessionId: sessions[clickSessions[i]].id,
              productId: product.id,
              eventType: "SHOP_CLICK",
              sourcePage: "PRODUCT",
              sectionKey: shopTrendy.sectionKey,
              position: shopTrendy.position,
              pageNumber: shopTrendy.pageNumber,
              contextType: shopTrendy.contextType,
              metadata: {
                discoverySource: "HOME",
                clickOrigin: clickOrigins[i],
              },
            },
          });
        }

        // 5. Insert separate New In impressions and click.
        for (let i = 0; i < 3; i++) {
          await tx.analyticsEvent.create({
            data: {
              sessionId: sessions[i + 10].id,
              productId: product.id,
              eventType: "PRODUCT_IMPRESSION",
              ...newIn,
              metadata: {
                discoverySource: "NEW_IN",
              },
            },
          });
        }

        await tx.analyticsEvent.create({
          data: {
            sessionId: sessions[10].id,
            productId: product.id,
            eventType: "SHOP_CLICK",
            sourcePage: "PRODUCT",
            sectionKey: newIn.sectionKey,
            position: newIn.position,
            pageNumber: newIn.pageNumber,
            contextType: newIn.contextType,
            metadata: {
              discoverySource: "NEW_IN",
              clickOrigin: "PRODUCT_CARD",
            },
          },
        });

        // 6. Insert Emerging Brands → Brand → PDP journey.
        await tx.analyticsEvent.create({
          data: {
            sessionId: sessions[14].id,
            productId: product.id,
            eventType: "SHOP_CLICK",
            sourcePage: "PRODUCT",
            sectionKey: "brand_product_grid",
            position: 3,
            pageNumber: 1,
            contextType: "BRAND_PRODUCT_GRID",
            metadata: {
              entrySource: "EMERGING_BRANDS",
              discoverySource: "BRAND",
              clickOrigin: "PRODUCT_DETAIL",
            },
          },
        });

        // 7. Execute the real reporting queries.
        const placements = await loadPlacementPerformance({
          db: tx,
          days: 30,
          page: 1,
          pageSize: 100,
        });

        const journeys = await loadDiscoveryJourneys({
          db: tx,
          days: 30,
          page: 1,
          pageSize: 100,
        });

        // 8. Verify placement metrics.
        const trendy = placements.rows.find(
          (row) =>
            row.productId === product.id &&
            row.discoverySource === "HOME" &&
            row.sectionKey === "shop_trendy",
        );

        expect(trendy).toBeDefined();

        expect(trendy).toMatchObject({
          impressions: 10,
          directClicks: 2,
          pdpClicks: 3,
          totalClicks: 5,
          uniqueClickingSessions: 4,
          shopCtr: 50,
          directCtr: 20,
          pdpCtr: 30,
        });

        const newInRow = placements.rows.find(
          (row) =>
            row.productId === product.id &&
            row.discoverySource === "NEW_IN" &&
            row.sectionKey === "new_in",
        );

        expect(newInRow).toBeDefined();

        expect(newInRow).toMatchObject({
          impressions: 3,
          directClicks: 1,
          pdpClicks: 0,
          totalClicks: 1,
          uniqueClickingSessions: 1,
        });

        expect(newInRow?.shopCtr).toBeCloseTo(33.333, 2);

        // 9. Verify Discovery Journeys attribution.
        const emergingJourney = journeys.rows.find(
          (row) =>
            row.entrySource === "EMERGING_BRANDS" &&
            row.discoverySource === "BRAND" &&
            row.sectionKey === "brand_product_grid" &&
            row.position === 3 &&
            row.clickOrigin === "PRODUCT_DETAIL",
        );

        expect(emergingJourney).toBeDefined();

        expect(emergingJourney).toMatchObject({
          shopClicks: 1,
          uniqueClickingSessions: 1,
          attributionEvidence: "URL_REPORTED",
        });

        // 10. Confirm the product name is resolved.
        expect(placements.productNames[product.id]).toBe(
          "Fixture Maxi Dress",
        );

        // Deliberately roll back every fixture.
        throw new Error(rollbackMarker);
      },
      {
        timeout: 20_000,
      },
    ),
  ).rejects.toThrow(rollbackMarker);
});
it("paginates placement and journey groups without duplicates", async () => {
  const rollbackMarker = "ROLLBACK_PAGINATION_FIXTURES";
  const fixtureId = crypto.randomUUID();
  const pageSize = 3;
  const groupCount = 7;

  await expect(
    db.$transaction(
      async (tx) => {
        // Create a temporary brand and product.
        const brand = await tx.brand.create({
          data: {
            name: "Pagination Fixture Brand",
            slug: `pagination-brand-${fixtureId}`,
          },
        });

        const product = await tx.product.create({
          data: {
            brandId: brand.id,
            title: "Pagination Fixture Dress",
            slug: `pagination-dress-${fixtureId}`,
            sourceUrl: `https://example.com/pagination-${fixtureId}`,
          },
        });

        const session = await tx.analyticsSession.create({
          data: {},
        });

        // Create seven distinct placement groups and journey groups.
        // Each group has one impression and one Shop click.
        for (let position = 1; position <= groupCount; position++) {
          const sectionKey = `pagination_${fixtureId}_${position}`;

          await tx.analyticsEvent.create({
            data: {
              sessionId: session.id,
              productId: product.id,
              eventType: "PRODUCT_IMPRESSION",
              sourcePage: "HOME",
              sectionKey,
              position,
              pageNumber: 1,
              contextType: "PAGINATION_TEST",
              metadata: {
                discoverySource: "HOME",
              },
            },
          });

          await tx.analyticsEvent.create({
            data: {
              sessionId: session.id,
              productId: product.id,
              eventType: "SHOP_CLICK",
              sourcePage: "PRODUCT",
              sectionKey,
              position,
              pageNumber: 1,
              contextType: "PAGINATION_TEST",
              metadata: {
                entrySource: `TEST_ENTRY_${fixtureId}_${position}`,
                discoverySource: "HOME",
                clickOrigin: "PRODUCT_CARD",
              },
            },
          });
        }

        // Query all four pagination positions for each dashboard.
        const placementPages = await Promise.all(
          [1, 2, 3, 4].map((page) =>
            loadPlacementPerformance({
              db: tx,
              days: 30,
              page,
              pageSize,
            }),
          ),
        );

        const journeyPages = await Promise.all(
          [1, 2, 3, 4].map((page) =>
            loadDiscoveryJourneys({
              db: tx,
              days: 30,
              page,
              pageSize,
            }),
          ),
        );

        // These fixtures are the only expected analytics groups
        // in the approved disposable test database.
        for (const pages of [placementPages, journeyPages]) {
          expect(pages.map((result) => result.rows.length)).toEqual([
            3,
            3,
            1,
            0,
          ]);

          for (const result of pages) {
            expect(result.totalRows).toBe(groupCount);
            expect(result.totalPages).toBe(3);
          }
        }

        // Verify no placement appears on multiple pages.
        const placementKeys = placementPages
          .flatMap((result) => result.rows)
          .map(
            (row) =>
              `${row.productId}:${row.sectionKey}:${row.position}`,
          );

        expect(new Set(placementKeys).size).toBe(groupCount);

        // Verify no journey appears on multiple pages.
        const journeyKeys = journeyPages
          .flatMap((result) => result.rows)
          .map(
            (row) =>
              `${row.entrySource}:${row.sectionKey}:${row.position}:${row.clickOrigin}`,
          );

        expect(new Set(journeyKeys).size).toBe(groupCount);

        // The fixture has equal click counts, so this also
        // checks that pagination remains stable across ties.
        expect(
          placementPages
            .flatMap((result) => result.rows)
            .map((row) => row.position),
        ).toEqual([1, 2, 3, 4, 5, 6, 7]);

        // Confirm page four contains no results.
        expect(placementPages[3].rows).toEqual([]);
        expect(journeyPages[3].rows).toEqual([]);

        // Roll back all temporary records.
        throw new Error(rollbackMarker);
      },
      {
        timeout: 30_000,
      },
    ),
  ).rejects.toThrow(rollbackMarker);
});
});