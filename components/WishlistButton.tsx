"use client";

import {
  useEffect,
  useState,
  useCallback,
} from "react";

import { useSearchParams } from "next/navigation";

import type {
  DiscoverySource,
} from "@/lib/analytics/discoverySource";

import {
  normalizeDiscoverySource,
} from "@/lib/analytics/discoverySource";

import {
  ensureAnalyticsSession,
} from "@/lib/analytics/clientSession";


type WishlistAnalyticsContext = {
  sourcePage?: DiscoverySource;
  searchQuery?: string | null;
  position?: number | null;

  sectionKey?: string | null;
  pageNumber?: number | null;
  contextType?: string | null;

  entrySectionKey?: string | null;
  entryPosition?: number | null;
  entryPageNumber?: number | null;
  entryContextType?: string | null;

};


// Global wishlist state shared across all instances on the page
const listeners = new Set<(ids: Set<string>) => void>();
let globalWishlist: Set<string> = new Set();
let fetched = false;

function notifyAll() {
  listeners.forEach((fn) => fn(new Set(globalWishlist)));
}

async function loadWishlist() {
  if (fetched) return;
  fetched = true;
  try {
    const r = await fetch("/api/account/wishlist", { credentials: "include" });
    if (!r.ok) return;
    const data = await r.json();
    globalWishlist = new Set(data.items.map((i: { productId: string }) => i.productId));
    notifyAll();
  } catch {
    // not logged in or network error — silent fail
  }
}

export default function WishlistButton({

  
  productId,
  analytics,
  
}: {
  productId: string;
  analytics?: WishlistAnalyticsContext;
}) {
  const searchParams = useSearchParams();
  const [wished, setWished] = useState(false);
  const [busy, setBusy] = useState(false);

  const sync = useCallback((ids: Set<string>) => {
    setWished(ids.has(productId));
  }, [productId]);

  useEffect(() => {
    listeners.add(sync);
    sync(globalWishlist);
    loadWishlist();
    return () => { listeners.delete(sync); };
  }, [sync]);

  async function toggle(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  // Check authentication first
  const me = await fetch(
    "/api/account/auth/me",
    {
      credentials: "include",
    }
  );

  if (!me.ok) {
    window.location.assign(
      `/account/login?next=${encodeURIComponent(
        window.location.pathname +
          window.location.search
      )}`
    );

    return;
  }

  setBusy(true);

  const nowWished = !wished;

  // Optimistic UI update
  if (nowWished) {
    globalWishlist.add(productId);
  } else {
    globalWishlist.delete(productId);
  }

  notifyAll();

  try {
    let response: Response;

    if (nowWished) {
      response = await fetch(
        "/api/account/wishlist",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            productId,
          }),
        }
      );
    } else {
      response = await fetch(
        `/api/account/wishlist/${productId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
    }

    if (!response.ok) {
      throw new Error(
        `Wishlist request failed: ${response.status}`
      );
    }

    /*
     * The REAL wishlist operation succeeded.
     * We can now record the historical analytics event.
     *
     * Analytics failure must never break the wishlist.
     */
    void ensureAnalyticsSession()
  .then((ready) => {
    if (!ready) {
      return;
    }

    return fetch(
      "/api/events/wishlist",
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        credentials:
          "same-origin",

        keepalive: true,

        body: JSON.stringify({
          productId,

          action:
            nowWished
              ? "ADD"
              : "REMOVE",

          sourcePath:
            window.location.pathname +
            window.location.search,

          actionSourcePage:
            window.location.pathname.startsWith(
              "/search"
            )
              ? "SEARCH"
              : window.location.pathname.startsWith(
                  "/b/"
                )
              ? "PRODUCT"
              : window.location.pathname.startsWith(
                  "/brands/emerging"
                )
              ? "EMERGING_BRANDS"
              : window.location.pathname.startsWith(
                  "/brands/"
                )
              ? "BRAND"
              : window.location.pathname.startsWith(
                  "/continent/"
                )
              ? "CONTINENT"
              : window.location.pathname.startsWith(
                  "/categories/"
                )
              ? "CATEGORY"
              : window.location.pathname === "/"
              ? "HOME"
              : "OTHER",

          discoverySource:
            analytics?.sourcePage ??
            normalizeDiscoverySource(
              searchParams.get("src")
            ),

          searchQuery:
            analytics?.searchQuery ??
            searchParams.get("q") ??
            null,

          searchPosition:
            analytics?.position ??
            (() => {
              const raw =
                searchParams.get("pos");

              if (!raw) {
                return null;
              }

              const number =
                Number(raw);

              return Number.isFinite(
                number
              )
                ? Math.max(
                    1,
                    Math.floor(number)
                  )
                : null;
            })(),

          sectionKey:
            analytics?.sectionKey ??
            searchParams.get("skey") ??
            null,

          pageNumber:
            analytics?.pageNumber ??
            (() => {
              const raw =
                searchParams.get(
                  "page"
                );

              if (!raw) {
                return null;
              }

              const number =
                Number(raw);

              return Number.isFinite(
                number
              )
                ? Math.max(
                    1,
                    Math.floor(number)
                  )
                : null;
            })(),

          contextType:
            analytics?.contextType ??
            searchParams.get("ctx") ??
            null,

            entrySectionKey:
  analytics?.entrySectionKey ??
  searchParams.get("entry_skey") ??
  null,

entryPosition:
  analytics?.entryPosition ??
  (() => {
    const raw =
      searchParams.get("entry_pos");

    if (!raw) {
      return null;
    }

    const number =
      Number(raw);

    return Number.isFinite(number)
      ? Math.max(
          1,
          Math.floor(number)
        )
      : null;
  })(),

entryPageNumber:
  analytics?.entryPageNumber ??
  (() => {
    const raw =
      searchParams.get("entry_page");

    if (!raw) {
      return null;
    }

    const number =
      Number(raw);

    return Number.isFinite(number)
      ? Math.max(
          1,
          Math.floor(number)
        )
      : null;
  })(),

entryContextType:
  analytics?.entryContextType ??
  searchParams.get("entry_ctx") ??
  null,
        }),
      }
    );
  })
  .catch((error) => {
    console.error(
      "Unable to record wishlist analytics",
      error
    );
  });
  } catch (error) {
    /*
     * The real wishlist operation failed,
     * so revert our optimistic UI update.
     */
    if (nowWished) {
      globalWishlist.delete(productId);
    } else {
      globalWishlist.add(productId);
    }

    notifyAll();

    console.error(
      "Wishlist update failed",
      error
    );
  } finally {
    setBusy(false);
  }
}

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:scale-110 disabled:opacity-50"
    >
      {wished ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#7B2D3E] stroke-[#7B2D3E]" strokeWidth="1.5">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-black/50" strokeWidth="1.5">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      )}
    </button>
  );
}
