"use client";

import {
  useEffect,
  useRef,
} from "react";

import type {
  DiscoverySource,
} from "@/lib/analytics/discoverySource";

import {
  ensureAnalyticsSession,
} from "@/lib/analytics/clientSession";

type ProductImpressionTrackerProps = {
  productId: string;

  sourcePage?: DiscoverySource;
  sectionKey?: string | null;
  position?: number | null;

  pageNumber?: number | null;
  contextType?: string | null;

  searchQuery?: string | null;

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
  entrySectionKey,
  entryPosition,
  entryPageNumber,
  entryContextType,
  children,
}: ProductImpressionTrackerProps) {


  const elementRef =
    useRef<HTMLDivElement | null>(null);

  const recordedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    /*
     * Record once when at least 50% of the product card
     * becomes visible.
     */
    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          if (
            !entry ||
            !entry.isIntersecting ||
            entry.intersectionRatio < 0.5 ||
            recordedRef.current
          ) {
            return;
          }

          recordedRef.current = true;

          observer.disconnect();

          void ensureAnalyticsSession()
  .then((ready) => {
    if (!ready) {
      return;
    }

    return fetch(
      "/api/events/product-impression",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "same-origin",

        keepalive: true,

        body: JSON.stringify({
          productId,
          sourcePage,
          sectionKey,
          position,
          pageNumber,
          contextType,
          searchQuery,
          entrySectionKey,
          entryPosition,
          entryPageNumber,
          entryContextType,

          sourcePath:
            window.location.pathname,
        }),
      }
    );
  })
  .catch((error) => {
    console.error(
      "Unable to record product impression",
      error
    );
  });
        },
        {
          threshold: 0.5,
        }
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
  productId,
  sourcePage,
  sectionKey,
  position,
  pageNumber,
  contextType,
  searchQuery,
  entrySectionKey,
  entryPosition,
  entryPageNumber,
  entryContextType,
]);

  return (
    <div ref={elementRef}>
      {children}
    </div>
  );
}