export const DEFAULT_GRID_PAGE_SIZE = 24;
export const EXPANDED_FIRST_PAGE_SIZE = 48;

function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function toPositiveInt(value: string, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export function getStorefrontPaginationState(
  searchParams: Record<string, string | string[] | undefined>
) {
  const page = toPositiveInt(firstQueryValue(searchParams.page), 1);
  const expanded = firstQueryValue(searchParams.expanded) === "1";

  const currentPage = page < 1 ? 1 : page;
  const isExpandedPageOne = currentPage === 1 && expanded;

  const pageOneVisibleCount = isExpandedPageOne
    ? EXPANDED_FIRST_PAGE_SIZE
    : DEFAULT_GRID_PAGE_SIZE;

  const skip =
    currentPage <= 1
      ? 0
      : EXPANDED_FIRST_PAGE_SIZE + (currentPage - 2) * DEFAULT_GRID_PAGE_SIZE;

  const take =
    currentPage === 1 ? pageOneVisibleCount : DEFAULT_GRID_PAGE_SIZE;

  return {
    currentPage,
    isExpandedPageOne,
    pageOneVisibleCount,
    skip,
    take,
  };
}

export function getStorefrontTotalPages(totalItems: number) {
  if (totalItems <= EXPANDED_FIRST_PAGE_SIZE) return 1;

  return (
    1 +
    Math.ceil(
      (totalItems - EXPANDED_FIRST_PAGE_SIZE) / DEFAULT_GRID_PAGE_SIZE
    )
  );
}