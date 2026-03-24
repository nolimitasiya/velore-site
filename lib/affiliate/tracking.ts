// C:\Users\Asiya\projects\dalra\lib\affiliate\tracking.ts

export type TrackedSourcePage = "HOME" | "SEARCH" | "BRAND";

export function buildTrackedOutboundUrl(
  productId: string,
  opts?: {
    sourcePage?: TrackedSourcePage | null;
    sectionId?: string | null;
    sectionKey?: string | null;
    position?: number | null;
  }
) {
  const params = new URLSearchParams();

  if (opts?.sourcePage) params.set("src", opts.sourcePage);
  if (opts?.sectionId) params.set("sid", opts.sectionId);
  if (opts?.sectionKey) params.set("skey", opts.sectionKey);
  if (typeof opts?.position === "number" && Number.isFinite(opts.position)) {
    params.set("pos", String(Math.max(1, Math.floor(opts.position))));
  }

  const qs = params.toString();
  return qs ? `/out/${productId}?${qs}` : `/out/${productId}`;
}