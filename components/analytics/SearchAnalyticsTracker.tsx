"use client";

import {
  useEffect,
  useRef,
} from "react";
import {
  ensureAnalyticsSession,
} from "@/lib/analytics/clientSession";

type SearchIntent = {
  productTypes: string[];
  occasions: string[];
  colours: string[];
  styles: string[];
  materials: string[];
};

type SearchAnalyticsTrackerProps = {
  query: string;
  resultsCount: number;

  intent: SearchIntent;

  filters?: Record<
    string,
    unknown
  >;
};

const HISTORY_KEY =
  "__veiloraSearchTrackingKey";

export default function SearchAnalyticsTracker({
  query,
  resultsCount,
  intent,
  filters,
}: SearchAnalyticsTrackerProps) {
  /*
   * Still protects against React rerenders
   * while we remain on this same mounted page.
   */
  const lastSentKeyRef =
    useRef<string | null>(null);

  useEffect(() => {
    const trimmedQuery =
      query.trim();

    if (!trimmedQuery) {
      return;
    }

    /*
     * Represents this exact search state.
     *
     * Query + filters/intention matter.
     */
    const trackingKey =
      JSON.stringify({
        query:
          trimmedQuery,
        resultsCount,
        intent,
        filters,
      });

    /*
     * Protection #1:
     * rerender on the same mounted page.
     */
    if (
      lastSentKeyRef.current ===
      trackingKey
    ) {
      return;
    }

    /*
     * Protection #2:
     *
     * The browser history entry remembers
     * that THIS search-result page already
     * produced its SEARCH event.
     *
     * Search
     * → PDP
     * → Back
     *
     * returns to the same browser history
     * entry, so we do NOT count another
     * search.
     */
    const currentHistoryState =
      window.history.state ?? {};

    if (
      currentHistoryState?.[
        HISTORY_KEY
      ] === trackingKey
    ) {
           return;
    }

    /*
     * Mark this specific browser-history
     * entry as already tracked.
     *
     * IMPORTANT:
     * preserve Next.js' existing history
     * state rather than replacing it.
     */
    

    void ensureAnalyticsSession()
  .then((ready) => {
    if (!ready) {
      return;
    }

    window.history.replaceState(
      {
        ...currentHistoryState,

        [HISTORY_KEY]:
          trackingKey,
      },
      "",
      window.location.href
    );

    lastSentKeyRef.current =
      trackingKey;

    return fetch(
      "/api/events/search",
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
          query:
            trimmedQuery,

          resultsCount,

          intent,

          filters,

          sourcePath:
            window.location.pathname,
        }),
      }
    );
  })
  .catch((error) => {
    console.error(
      "Unable to record search analytics",
      error
    );
  });
  }, [
    query,
    resultsCount,
    intent,
    filters,
  ]);

  return null;
}