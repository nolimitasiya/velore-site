import Link from "next/link";
import { getStorefrontTotalPages } from "@/lib/storefront/pagination";

type Props = {
  pathname: string;
  searchParams: Record<string, string | string[] | undefined>;
  totalItems: number;
  currentPage: number;
  isExpandedPageOne: boolean;
};

function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function buildHref(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
  page: number,
  expanded: boolean
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || key === "expanded") continue;

    if (Array.isArray(value)) {
      for (const v of value) {
        if (v != null && v !== "") params.append(key, v);
      }
    } else if (typeof value === "string" && value !== "") {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  if (page === 1 && expanded) {
    params.set("expanded", "1");
  }

  const query = params.toString();
  const base = query ? `${pathname}?${query}` : pathname;
  return `${base}#products`;
}

function PageLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={[
        "inline-flex min-w-10 items-center justify-center rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-black bg-black text-white"
          : "border-black/10 bg-white text-black hover:border-black/30",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default function StorefrontPagination({
  pathname,
  searchParams,
  totalItems,
  currentPage,
  isExpandedPageOne,
}: Props) {
  const totalPages = getStorefrontTotalPages(totalItems);

  const showLoadMore = currentPage === 1 && !isExpandedPageOne && totalItems > 24;
  const showPagination =
    (isExpandedPageOne || currentPage > 1) && totalItems > 48 && totalPages > 1;

  if (!showLoadMore && !showPagination) return null;

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      {showLoadMore ? (
        <PageLink
          href={buildHref(pathname, searchParams, 1, true)}
        >
          Load More
        </PageLink>
      ) : null}

      {showPagination ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {currentPage > 1 ? (
            <PageLink
              href={buildHref(
                pathname,
                searchParams,
                currentPage - 1,
                currentPage - 1 === 1
              )}
            >
              Previous
            </PageLink>
          ) : null}

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            const href = buildHref(
              pathname,
              searchParams,
              page,
              page === 1
            );

            return (
              <PageLink key={page} href={href} active={page === currentPage}>
                {page}
              </PageLink>
            );
          })}

          {currentPage < totalPages ? (
            <PageLink
              href={buildHref(pathname, searchParams, currentPage + 1, false)}
            >
              Next
            </PageLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}