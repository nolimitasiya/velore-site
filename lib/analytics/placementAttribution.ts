import type { Prisma } from "@prisma/client";

export type ShopClickOrigin =
  | "PRODUCT_CARD"
  | "PRODUCT_DETAIL"
  | "UNKNOWN";

export type PlacementAttribution = {
  discoverySource: string | null;
  sectionKey: string | null;
  position: number | null;
  pageNumber: number | null;
  contextType: string | null;

  entrySource: string | null;
  entrySectionKey: string | null;
  entryPosition: number | null;
  entryPageNumber: number | null;
  entryContextType: string | null;

  clickOrigin: ShopClickOrigin;
};

function metadataObject(
  value: Prisma.JsonValue | null | undefined
): Record<string, Prisma.JsonValue> {
  if (
    value === null ||
    value === undefined ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, Prisma.JsonValue>;
}

function nullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function nullablePositiveInteger(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

export function readPlacementAttribution(event: {
  metadata: Prisma.JsonValue | null;
  sectionKey: string | null;
  position: number | null;
  pageNumber: number | null;
  contextType: string | null;
}): PlacementAttribution {
  const metadata = metadataObject(event.metadata);

  const origin = nullableString(metadata.clickOrigin);

  return {
    discoverySource: nullableString(metadata.discoverySource),

    sectionKey:
      nullableString(metadata.sectionKey) ??
      nullableString(event.sectionKey),

    position:
      nullablePositiveInteger(metadata.position) ??
      nullablePositiveInteger(event.position),

    pageNumber:
      nullablePositiveInteger(metadata.pageNumber) ??
      nullablePositiveInteger(event.pageNumber),

    contextType:
      nullableString(metadata.contextType) ??
      nullableString(event.contextType),

    entrySource: nullableString(metadata.entrySource),

    entrySectionKey: nullableString(metadata.entrySectionKey),

    entryPosition: nullablePositiveInteger(metadata.entryPosition),

    entryPageNumber: nullablePositiveInteger(metadata.entryPageNumber),

    entryContextType: nullableString(metadata.entryContextType),

    clickOrigin:
      origin === "PRODUCT_CARD" || origin === "PRODUCT_DETAIL"
        ? origin
        : "UNKNOWN",
  };
}

export function placementKey(
  productId: string,
  placement: PlacementAttribution
): string {
  return JSON.stringify([
    productId,
    placement.discoverySource,
    placement.sectionKey,
    placement.position,
    placement.pageNumber,
    placement.contextType,
  ]);
}