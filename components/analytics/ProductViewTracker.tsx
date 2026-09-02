"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {  ensureAnalyticsSession,} from "@/lib/analytics/clientSession";

type ProductViewTrackerProps = {
  productId: string;
};

export default function ProductViewTracker({
  productId,
}: ProductViewTrackerProps) {
  const sentRef = useRef(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (sentRef.current) {
      return;
    }

    if (!productId.trim()) {
      return;
    }

    sentRef.current = true;

    const discoverySource =
      searchParams.get("src");

    const searchQuery =
      searchParams.get("q");

    const rawPosition =
      searchParams.get("pos");
    
    const sectionKey = 
    searchParams.get("skey");

    const rawPageNumber =
     searchParams.get("page");

   const pageNumber =
    rawPageNumber &&
  Number.isFinite(Number(rawPageNumber))
    ? Math.max(
        1,
        Math.floor(Number(rawPageNumber))
      )
    : null;

const contextType =
  searchParams.get("ctx")
  
  const entrySectionKey =
  searchParams.get("entry_skey");

const rawEntryPosition =
  searchParams.get("entry_pos");

const entryPosition =
  rawEntryPosition &&
  Number.isFinite(Number(rawEntryPosition))
    ? Math.max(
        1,
        Math.floor(Number(rawEntryPosition))
      )
    : null;

const rawEntryPageNumber =
  searchParams.get("entry_page");

const entryPageNumber =
  rawEntryPageNumber &&
  Number.isFinite(Number(rawEntryPageNumber))
    ? Math.max(
        1,
        Math.floor(Number(rawEntryPageNumber))
      )
    : null;

const entryContextType =
  searchParams.get("entry_ctx");

    const searchPosition =
      rawPosition &&
      Number.isFinite(Number(rawPosition))
        ? Math.max(
            1,
            Math.floor(Number(rawPosition))
          )
        : null;

    void ensureAnalyticsSession()
  .then((ready) => {
    if (!ready) {
      /*
       * Allow this tracker to try again if
       * session initialisation failed.
       */
      sentRef.current = false;
      return;
    }

    return fetch(
      "/api/events/product-view",
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

          sourcePath:
            window.location.pathname,

          discoverySource,
          searchQuery,
          searchPosition,
          sectionKey,
          pageNumber,
          contextType,

          entrySectionKey,
          entryPosition,
          entryPageNumber,
          entryContextType,
        }),
      }
    );
  })
  .catch((error) => {
    sentRef.current = false;

    console.error(
      "Unable to record product view",
      error
    );
  });
  }, [productId, searchParams]);

  return null;
}