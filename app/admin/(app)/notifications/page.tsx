import Link from "next/link";

import { prisma } from "@/lib/prisma";
import {  MarkAllReadButton,  NotificationActions,} from "./NotificationActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{
    page?: string;
    view?: string;
  }>;
};

function getNotificationContent(
  notification: {
    type: string;
    product: {
      id: string;
      title: string;
    } | null;
    brand: {
      id: string;
      name: string;
    } | null;

    platformIncident: {
      id: string;
      title: string;
      severity: string;
      status: string;
    } | null;
    catalogueHealthIssue: {
      id: string;
      failureType: string;
      latestHttpStatus: number | null;
      target: {
        targetType: string;
        product: {
          id: string;
          title: string;
          brand: {
            id: string;
            name: string;
          };
        } | null;
        productImage: {
          product: {
            id: string;
            title: string;
            brand: {
              id: string;
              name: string;
            };
          };
        } | null;
      };
    } | null;
  }
) {
  const issue = notification.catalogueHealthIssue;

  const targetProduct =
    issue?.target.product ??
    issue?.target.productImage?.product ??
    null;

  const product =
    notification.product ??
    targetProduct ??
    null;

  const brand =
    notification.brand ??
    targetProduct?.brand ??
    null;

    if (
  notification.type ===
  "PLATFORM_INCIDENT_OPENED"
) {
  return {
    title: "Platform incident",
    description:
      notification.platformIncident?.title ??
      "Platform Health detected a new operational incident.",
    productName: null,
    brandName: null,
    tone: "failure" as const,
  };
}

if (
  notification.type ===
  "PLATFORM_INCIDENT_ESCALATED"
) {
  return {
    title: "Platform incident escalated",
    description:
      notification.platformIncident?.title ??
      "An existing operational incident has increased in severity.",
    productName: null,
    brandName: null,
    tone: "failure" as const,
  };
}

if (
  notification.type ===
  "PLATFORM_INCIDENT_RECOVERED"
) {
  return {
    title: "Platform recovered",
    description:
      notification.platformIncident?.title ??
      "A platform incident has recovered.",
    productName: null,
    brandName: null,
    tone: "recovered" as const,
  };
}

  if (
    notification.type === "CATALOGUE_HEALTH_FAILURE"
  ) {
    const targetLabel =
      issue?.target.targetType === "PRODUCT_IMAGE"
        ? "Product image"
        : issue?.target.targetType ===
            "PRODUCT_AFFILIATE_URL"
          ? "Affiliate link"
          : "Product link";

    const problem =
      issue?.latestHttpStatus != null
        ? `${targetLabel} returned HTTP ${issue.latestHttpStatus}.`
        : `${targetLabel} failed its catalogue health check.`;

    return {
      title: "Catalogue problem",
      description: problem,
      productName: product?.title ?? null,
      brandName: brand?.name ?? null,
      tone: "failure" as const,
    };
  }

  if (
    notification.type === "CATALOGUE_HEALTH_RECOVERED"
  ) {
    return {
      title: "Catalogue recovered",
      description:
        "A previously failing catalogue target is responding normally again.",
      productName: product?.title ?? null,
      brandName: brand?.name ?? null,
      tone: "recovered" as const,
    };
  }

  if (notification.type === "PRODUCT_SUBMITTED") {
    return {
      title: "Product submitted",
      description:
        "A product has been submitted for review.",
      productName: product?.title ?? null,
      brandName: brand?.name ?? null,
      tone: "neutral" as const,
    };
  }

  if (notification.type === "TAXONOMY_REQUEST") {
    return {
      title: "Taxonomy request",
      description:
        "A new taxonomy request requires review.",
      productName: null,
      brandName: brand?.name ?? null,
      tone: "neutral" as const,
    };
  }

  return {
    title: "Admin notification",
    description: "New admin activity.",
    productName: product?.title ?? null,
    brandName: brand?.name ?? null,
    tone: "neutral" as const,
  };
}

export default async function NotificationsPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const view =
    params.view === "unread" ? "unread" : "all";

  const requestedPage = Number.parseInt(
    params.page ?? "1",
    10
  );

  const page =
    Number.isFinite(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const where =
    view === "unread"
      ? {
          readAt: null,
        }
      : {};

  const [totalCount, unreadCount] =
    await Promise.all([
      prisma.adminNotification.count({
        where,
      }),

      prisma.adminNotification.count({
        where: {
          readAt: null,
        },
      }),
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const notifications =
    await prisma.adminNotification.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,

      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },

        product: {
          select: {
            id: true,
            title: true,
          },
        },

        platformIncident: {
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
          },
        },

        catalogueHealthIssue: {
          select: {
            id: true,
            failureType: true,
            latestHttpStatus: true,

            target: {
              select: {
                targetType: true,

                product: {
                  select: {
                    id: true,
                    title: true,

                    brand: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },

                productImage: {
                  select: {
                    product: {
                      select: {
                        id: true,
                        title: true,

                        brand: {
                          select: {
                            id: true,
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

  function pageHref(targetPage: number) {
    const query = new URLSearchParams();

    if (view === "unread") {
      query.set("view", "unread");
    }

    if (targetPage > 1) {
      query.set("page", String(targetPage));
    }

    const qs = query.toString();

    return qs
      ? `/admin/notifications?${qs}`
      : "/admin/notifications";
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a89280]">
            Operations
          </div>

          <h1 className="mt-2 font-heading text-4xl text-[#7B2D3E]">
            Notifications
          </h1>

          <p className="mt-2 text-sm text-[#806f62]">
            Operational alerts and activity requiring
            your attention.
          </p>
        </div>

        {unreadCount > 0 && (
  <div className="flex items-center gap-3">
    <div className="rounded-full border border-[#ead8dc] bg-[#fff8f9] px-3 py-1.5 text-xs font-medium text-[#7B2D3E]">
      {unreadCount} unread
    </div>

    <MarkAllReadButton
      unreadCount={unreadCount}
    />
  </div>
)}
      </div>

      <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#e8ddd4]">
        <div className="flex gap-6">
          <Link
            href="/admin/notifications"
            className={`border-b-2 pb-3 text-sm font-medium transition ${
              view === "all"
                ? "border-[#7B2D3E] text-[#7B2D3E]"
                : "border-transparent text-[#a89280] hover:text-[#7B2D3E]"
            }`}
          >
            All
          </Link>

          <Link
            href="/admin/notifications?view=unread"
            className={`border-b-2 pb-3 text-sm font-medium transition ${
              view === "unread"
                ? "border-[#7B2D3E] text-[#7B2D3E]"
                : "border-transparent text-[#a89280] hover:text-[#7B2D3E]"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-[#7B2D3E] px-2 py-0.5 text-[10px] text-white">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-[#e8ddd4] bg-white px-6 py-14 text-center">
          <div className="text-sm font-medium text-[#7B2D3E]">
            {view === "unread"
              ? "You're all caught up."
              : "No notifications yet."}
          </div>

          <div className="mt-1 text-sm text-[#a89280]">
            {view === "unread"
              ? "There are no unread notifications."
              : "Operational notifications will appear here."}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white">
          {notifications.map((notification) => {
            const content =
              getNotificationContent(notification);

            return (
              <div
                key={notification.id}
                className={`border-b border-[#eee5de] px-6 py-5 last:border-b-0 ${
                  notification.readAt === null
                    ? "bg-[#fffdfb]"
                    : "bg-white"
                }`}
              >
                <div className="flex gap-4">
                  <div className="pt-1">
                    <span
                      className={`block h-2.5 w-2.5 rounded-full ${
                        notification.readAt === null
                          ? "bg-[#7B2D3E]"
                          : "bg-[#d9cec5]"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#3d3029]">
                          {content.title}
                        </div>

                        {(content.productName ||
                          content.brandName) && (
                          <div className="mt-1 text-sm text-[#806f62]">
                            {content.productName}

                            {content.productName &&
                              content.brandName &&
                              " · "}

                            {content.brandName}
                          </div>
                        )}

                        <div className="mt-1.5 text-sm leading-6 text-[#806f62]">
                          {content.description}
                        </div>
                      </div>

                      <time className="shrink-0 text-xs text-[#a89280]">
                        {new Intl.DateTimeFormat(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        ).format(
                          notification.createdAt
                        )}
                      </time>
                    </div>

                    <div className="mt-4">
  <NotificationActions
    notificationId={notification.id}
    isUnread={notification.readAt === null}
    primaryHref={
      notification.type.startsWith(
        "PLATFORM_INCIDENT_"
       )
      ? "/admin/platform-health"
      : notification.type.startsWith(
          "CATALOGUE_HEALTH_"
        )
      ? "/admin/catalogue-health"
      : notification.type ===
          "TAXONOMY_REQUEST"
        ? "/admin/taxonomy/requests"
        : null
}

    primaryLabel={
  notification.type.startsWith(
    "PLATFORM_INCIDENT_"
  )
    ? "View Platform Health"
    : notification.type.startsWith(
          "CATALOGUE_HEALTH_"
        )
      ? "View issue"
      : notification.type ===
          "TAXONOMY_REQUEST"
        ? "View requests"
        : null
}
    productHref={
      notification.productId
        ? `/admin/products/${notification.productId}`
        : null
    }
  />
</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#a89280]">
            Page {currentPage} of {totalPages} ·{" "}
            {totalCount}{" "}
            {view === "unread"
              ? "unread notifications"
              : "notifications"}
          </div>

          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={pageHref(currentPage - 1)}
                className="rounded-lg border border-[#e8ddd4] bg-white px-3 py-2 text-xs font-medium text-[#806f62] transition hover:border-[#7B2D3E] hover:text-[#7B2D3E]"
              >
                Previous
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-[#eee7e1] px-3 py-2 text-xs text-[#c9bdb4]">
                Previous
              </span>
            )}

            {currentPage < totalPages ? (
              <Link
                href={pageHref(currentPage + 1)}
                className="rounded-lg border border-[#e8ddd4] bg-white px-3 py-2 text-xs font-medium text-[#806f62] transition hover:border-[#7B2D3E] hover:text-[#7B2D3E]"
              >
                Next
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-[#eee7e1] px-3 py-2 text-xs text-[#c9bdb4]">
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
