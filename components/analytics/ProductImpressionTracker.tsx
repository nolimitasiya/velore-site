"use client";

import { useEffect, useRef } from "react";

import type {
  DiscoverySource,
} from "@/lib/analytics/discoverySource";

import {
  ensureAnalyticsSession,
} from "@/lib/analytics/clientSession";

import {
  IMPRESSION_SESSION_RETRY_DELAY_MS,
  shouldRetryImpressionSession,
} from "@/lib/analytics/impressionRetryPolicy";

type ProductImpressionTrackerProps = {
  productId: string;
  sourcePage?: DiscoverySource;
  sectionKey?: string | null;
  position?: number | null;
  pageNumber?: number | null;
  contextType?: string | null;
  searchQuery?: string | null;
  entrySource?: string | null;
  entrySectionKey?: string | null;
  entryPosition?: number | null;
  entryPageNumber?: number | null;
  entryContextType?: string | null;
  children: React.ReactNode;
};

export default function ProductImpressionTracker({
  productId,
  sourcePage,
  sectionKey,
  position,
  pageNumber,
  contextType,
  searchQuery,
  entrySource,
  entrySectionKey,
  entryPosition,
  entryPageNumber,
  entryContextType,
  children,
}: ProductImpressionTrackerProps) {

const elementRef = useRef<HTMLDivElement | null>(null);
const recordedRef = useRef(false);
const trackedProductIdRef = useRef(productId);

const processingProductIdRef = useRef<string | null>(null);
const metadataRef = useRef({
  sourcePage,
  sectionKey,
  position,
  pageNumber,
  contextType,
  searchQuery,
  entrySource,
  entrySectionKey,
  entryPosition,
  entryPageNumber,
  entryContextType,
});

metadataRef.current = {
  sourcePage,
  sectionKey,
  position,
  pageNumber,
  contextType,
  searchQuery,
  entrySource,
  entrySectionKey,
  entryPosition,
  entryPageNumber,
  entryContextType,
};

  useEffect(() => {
  const element = elementRef.current;

  if (!element) {
    return;
  }

  // Reset impression tracking only when the product changes.
// Changes to attribution metadata must not create duplicates.
if (trackedProductIdRef.current !== productId) {
  recordedRef.current = false;
  trackedProductIdRef.current = productId;
}

let isMounted = true;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;

    async function submitImpression() {
      if (
  !isMounted ||
  recordedRef.current ||
  processingProductIdRef.current === productId
) {
  return;
}

processingProductIdRef.current = productId;

      try {
        const ready = await ensureAnalyticsSession();

        if (!isMounted) {
          return;
        }

        if (!ready) {
          if (
            shouldRetryImpressionSession(
              retryCount,
              isMounted,
            )
          ) {
            retryCount += 1;

            retryTimer = setTimeout(() => {
              retryTimer = null;
              void submitImpression();
            }, IMPRESSION_SESSION_RETRY_DELAY_MS);
          }

          return;
        }

        const response = await fetch(
          "/api/events/product-impression",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "same-origin",
            keepalive: true,
            body: JSON.stringify({
              productId,
             ...metadataRef.current,
             sourcePath: window.location.pathname,
            }),
          },
        );

        const result = await response.json().catch(() => null);

        if (
  response.ok &&
  result?.ok === true &&
  trackedProductIdRef.current === productId
) {
  recordedRef.current = true;
}
      } catch (error) {
        console.error(
          "Unable to record product impression",
          error,
        );
      } finally {
  if (processingProductIdRef.current === productId) {
    processingProductIdRef.current = null;
  }
 }
}

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (
          !entry ||
          !entry.isIntersecting ||
          entry.intersectionRatio < 0.5 ||
          recordedRef.current ||
          processingProductIdRef.current === productId
        ) {
          return;
        }

        observer.disconnect();

        void submitImpression();
      },
      {
        threshold: 0.5,
      },
    );

    observer.observe(element);

    return () => {
      isMounted = false;

      observer.disconnect();

      if (retryTimer !== null) {
        clearTimeout(retryTimer);
      }
    };
    }, [productId]);

  return (
    <div ref={elementRef}>
      {children}
    </div>
  );
}