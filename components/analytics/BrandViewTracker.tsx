"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import {
  ensureAnalyticsSession,
} from "@/lib/analytics/clientSession";

type BrandViewTrackerProps = {
  brandId: string;
};

export default function BrandViewTracker({
  brandId,
}: BrandViewTrackerProps) {
  const sentRef =
    useRef(false);

  const searchParams =
    useSearchParams();

  useEffect(() => {
    if (
      sentRef.current
    ) {
      return;
    }

    if (
      !brandId.trim()
    ) {
      return;
    }

    sentRef.current =
      true;

    const discoverySource =
      searchParams.get(
        "src"
      );

    const searchQuery =
      searchParams.get(
        "q"
      );

    /*
     * Current/original position
     * supplied when entering
     * the brand profile.
     */
    const rawPosition =
      searchParams.get(
        "pos"
      );

    const position =
      rawPosition &&
      Number.isFinite(
        Number(rawPosition)
      )
        ? Math.max(
            1,
            Math.floor(
              Number(
                rawPosition
              )
            )
          )
        : null;

    const sectionKey =
      searchParams.get(
        "skey"
      );

    const rawPageNumber =
      searchParams.get(
        "page"
      );

    const pageNumber =
      rawPageNumber &&
      Number.isFinite(
        Number(
          rawPageNumber
        )
      )
        ? Math.max(
            1,
            Math.floor(
              Number(
                rawPageNumber
              )
            )
          )
        : null;

    const contextType =
      searchParams.get(
        "ctx"
      );

    /*
     * Original entry context
     * when already carried
     * through a journey.
     */

    const entrySectionKey =
      searchParams.get(
        "entry_skey"
      );

    const rawEntryPosition =
      searchParams.get(
        "entry_pos"
      );

    const entryPosition =
      rawEntryPosition &&
      Number.isFinite(
        Number(
          rawEntryPosition
        )
      )
        ? Math.max(
            1,
            Math.floor(
              Number(
                rawEntryPosition
              )
            )
          )
        : null;

    const rawEntryPageNumber =
      searchParams.get(
        "entry_page"
      );

    const entryPageNumber =
      rawEntryPageNumber &&
      Number.isFinite(
        Number(
          rawEntryPageNumber
        )
      )
        ? Math.max(
            1,
            Math.floor(
              Number(
                rawEntryPageNumber
              )
            )
          )
        : null;

    const entryContextType =
      searchParams.get(
        "entry_ctx"
      );

    void ensureAnalyticsSession()
      .then(
        (ready) => {
          if (!ready) {
            sentRef.current =
              false;

            return;
          }

          return fetch(
            "/api/events/brand-view",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials:
                "same-origin",

              keepalive:
                true,

              body:
                JSON.stringify({
                  brandId,

                  sourcePath:
                    window
                      .location
                      .pathname,

                  discoverySource,
                  searchQuery,

                  position,
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
        }
      )
      .catch(
        (error) => {
          sentRef.current =
            false;

          console.error(
            "Unable to record brand view",
            error
          );
        }
      );
  }, [
    brandId,
    searchParams,
  ]);

  return null;
}