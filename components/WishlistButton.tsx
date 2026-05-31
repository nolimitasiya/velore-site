"use client";

import { useEffect, useState, useCallback } from "react";

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

export default function WishlistButton({ productId }: { productId: string }) {
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

    // Check auth first
    const me = await fetch("/api/account/auth/me", { credentials: "include" });
    if (!me.ok) {
      window.location.assign(`/account/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setBusy(true);
    const nowWished = !wished;

    // Optimistic update
    if (nowWished) {
      globalWishlist.add(productId);
    } else {
      globalWishlist.delete(productId);
    }
    notifyAll();

    try {
      if (nowWished) {
        await fetch("/api/account/wishlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ productId }),
        });
      } else {
        await fetch(`/api/account/wishlist/${productId}`, {
          method: "DELETE",
          credentials: "include",
        });
      }
    } catch {
      // Revert on error
      if (nowWished) {
        globalWishlist.delete(productId);
      } else {
        globalWishlist.add(productId);
      }
      notifyAll();
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
