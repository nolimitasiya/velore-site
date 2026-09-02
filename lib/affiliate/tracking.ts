// C:\Users\Asiya\projects\dalra\lib\affiliate\tracking.ts

export type TrackedSourcePage =
  | "HOME"
  | "SEARCH"
  | "BRAND"
  | "CATEGORY"
  | "PRODUCT"
  | "DIARY"
  | "STYLE_FEED"
  | "CONTINENT"
  | "EMERGING_BRANDS"
  | "NEW_IN"
  | "SALE"
  | "OTHER";

export function buildTrackedOutboundUrl(
  productId: string,
  opts?: {
    sourcePage?: TrackedSourcePage | null;
    sectionId?: string | null;
    sectionKey?: string | null;
    position?: number | null;
    pageNumber?: number | null;
    contextType?: string | null;
    searchQuery?: string | null;

    entrySectionKey?: string | null;
    entryPosition?: number | null;
    entryPageNumber?: number | null;
    entryContextType?: string | null;
  }
) {
  const params =
    new URLSearchParams();

  if (opts?.sourcePage) {
    params.set(
      "src",
      opts.sourcePage
    );
  }

  if (opts?.sectionId) {
    params.set(
      "sid",
      opts.sectionId
    );
  }

  if (opts?.sectionKey) {
    params.set(
      "skey",
      opts.sectionKey
    );
  }

  if (
    typeof opts?.position === "number" &&
    Number.isFinite(opts.position)
  ) {
    params.set(
      "pos",
      String(
        Math.max(
          1,
          Math.floor(opts.position)
        )
      )
    );
  }

  if (
    typeof opts?.pageNumber === "number" &&
    Number.isFinite(
      opts.pageNumber
    )
  ) {
    params.set(
      "page",
      String(
        Math.max(
          1,
          Math.floor(
            opts.pageNumber
          )
        )
      )
    );
  }

  if (opts?.contextType) {
    params.set(
      "ctx",
      opts.contextType
    );
  }

  if (opts?.searchQuery) {
    params.set(
      "q",
      opts.searchQuery
    );
  }


    if (opts?.entrySectionKey) {
  params.set(
    "entry_skey",
    opts.entrySectionKey
  );
}

if (
  typeof opts?.entryPosition === "number" &&
  Number.isFinite(opts.entryPosition)
) {
  params.set(
    "entry_pos",
    String(
      Math.max(
        1,
        Math.floor(opts.entryPosition)
      )
    )
  );
}

if (
  typeof opts?.entryPageNumber === "number" &&
  Number.isFinite(opts.entryPageNumber)
) {
  params.set(
    "entry_page",
    String(
      Math.max(
        1,
        Math.floor(opts.entryPageNumber)
      )
    )
  );
}

if (opts?.entryContextType) {
  params.set(
    "entry_ctx",
    opts.entryContextType
  );
}

const qs =
    params.toString();

  return qs
    ? `/out/${productId}?${qs}`
    : `/out/${productId}`;
}