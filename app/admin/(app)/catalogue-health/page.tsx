import Link from "next/link";
import {
  CatalogueHealthIssueStatus,
  CatalogueHealthStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import CatalogueHealthClient from "./CatalogueHealthClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CatalogueHealthPage() {
  const [
    totalTargets,
    healthyTargets,
    degradedTargets,
    brokenTargets,
    unknownTargets,
    openIssues,
    targets,
  ] = await Promise.all([
    prisma.catalogueHealthTarget.count({
      where: { isActive: true },
    }),

    prisma.catalogueHealthTarget.count({
      where: {
        isActive: true,
        status: CatalogueHealthStatus.HEALTHY,
      },
    }),

    prisma.catalogueHealthTarget.count({
      where: {
        isActive: true,
        status: CatalogueHealthStatus.DEGRADED,
      },
    }),

    prisma.catalogueHealthTarget.count({
      where: {
        isActive: true,
        status: CatalogueHealthStatus.BROKEN,
      },
    }),

    prisma.catalogueHealthTarget.count({
      where: {
        isActive: true,
        status: CatalogueHealthStatus.UNKNOWN,
      },
    }),

    prisma.catalogueHealthIssue.count({
      where: {
        status: {
          in: [
            CatalogueHealthIssueStatus.OPEN,
            CatalogueHealthIssueStatus.ACKNOWLEDGED,
          ],
        },
      },
    }),

    prisma.catalogueHealthTarget.findMany({
      where: {
        isActive: true,
      },

      orderBy: [
        {
          status: "asc",
        },
        {
          lastCheckedAt: "desc",
        },
      ],

      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            isActive: true,
            publishedAt: true,
            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },

        productImage: {
          select: {
            id: true,
            sortOrder: true,
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                isActive: true,
                publishedAt: true,
                brand: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },

        issues: {
          where: {
            status: {
              in: [
                CatalogueHealthIssueStatus.OPEN,
                CatalogueHealthIssueStatus.ACKNOWLEDGED,
              ],
            },
          },
          orderBy: {
            openedAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            status: true,
            severity: true,
            failureType: true,
            openedAt: true,
            acknowledgedAt: true,
            latestHttpStatus: true,
            failureCount: true,
            lastFailureAt: true,
          },
        },
      },
    }),
  ]);

  const rows = targets.map((target) => {
    const product = target.product ?? target.productImage?.product ?? null;
    const issue = target.issues[0] ?? null;

    return {
      id: target.id,
      targetType: target.targetType,
      status: target.status,
      failureType: target.failureType,
      url: target.url,
      finalUrl: target.finalUrl,
      httpStatus: target.httpStatus,
      contentType: target.contentType,
      responseTimeMs: target.responseTimeMs,

      consecutiveFailures: target.consecutiveFailures,
      consecutiveSuccesses: target.consecutiveSuccesses,

      firstCheckedAt: target.firstCheckedAt?.toISOString() ?? null,
      lastCheckedAt: target.lastCheckedAt?.toISOString() ?? null,
      lastHealthyAt: target.lastHealthyAt?.toISOString() ?? null,
      lastFailedAt: target.lastFailedAt?.toISOString() ?? null,
      nextCheckAt: target.nextCheckAt?.toISOString() ?? null,

      product: product
        ? {
            id: product.id,
            title: product.title,
            slug: product.slug,
            isActive: product.isActive,
            publishedAt: product.publishedAt?.toISOString() ?? null,
            brand: product.brand,
          }
        : null,

      imageSortOrder: target.productImage?.sortOrder ?? null,

      issue: issue
        ? {
            id: issue.id,
            status: issue.status,
            severity: issue.severity,
            failureType: issue.failureType,
            openedAt: issue.openedAt.toISOString(),
            acknowledgedAt:
              issue.acknowledgedAt?.toISOString() ?? null,
            latestHttpStatus: issue.latestHttpStatus,
            failureCount: issue.failureCount,
            lastFailureAt: issue.lastFailureAt.toISOString(),
          }
        : null,
    };
  });

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="space-y-6">
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin catalogue
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Catalogue Health
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                Monitor product links, affiliate destinations and externally
                hosted product images before broken catalogue content reaches
                shoppers.
              </p>

              <div className="mt-5">
                <Link
                  href="/admin/products"
                  className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-[#7B2D3E] shadow-sm transition hover:bg-white/90"
                >
                  View products
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <MetricCard label="Targets" value={totalTargets} />
              <MetricCard label="Healthy" value={healthyTargets} />
              <MetricCard label="Degraded" value={degradedTargets} />
              <MetricCard label="Broken" value={brokenTargets} />
              <MetricCard label="Unchecked" value={unknownTargets} />
              <MetricCard
                label="Open issues"
                value={openIssues}
                highlighted
              />
            </div>
          </div>
        </section>

        <CatalogueHealthClient rows={rows} />
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: number;
  highlighted?: boolean;
}) {
  if (highlighted) {
    return (
      <div className="rounded-2xl border border-white/30 bg-white px-4 py-3">
        <div className="text-xs text-[#7B2D3E]/70">{label}</div>
        <div className="mt-1 text-xl font-semibold text-[#7B2D3E]">
          {value}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}