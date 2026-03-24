import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { StorefrontSectionType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreatePayload = {
  title?: string;
  type?: StorefrontSectionType;
  targetCountryCode?: string | null;
  campaignAppliesToAllCountries?: boolean;
  campaignCountries?: string[];
  isActive?: boolean;
  maxItems?: number;
  sortOrder?: number;
};

function slugifyKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCountryCode(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length === 2 ? normalized : null;
}

function normalizeCountryCodes(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((v) => normalizeCountryCode(v))
        .filter((v): v is string => Boolean(v))
    )
  );
}

async function makeUniqueSectionKey(baseTitle: string) {
  const base = slugifyKey(baseTitle) || "storefront_section";

  const existing = await prisma.storefrontSection.findMany({
    where: {
      key: {
        startsWith: base,
      },
    },
    select: { key: true },
  });

  const existingKeys = new Set(existing.map((x) => x.key));

  if (!existingKeys.has(base)) {
    return base;
  }

  let suffix = 2;
  while (existingKeys.has(`${base}_${suffix}`)) {
    suffix += 1;
  }

  return `${base}_${suffix}`;
}

function mapSectionResponse(section: any) {
  return {
    id: section.id,
    key: section.key,
    title: section.title,
    type: section.type,
    targetCountryCode: section.targetCountryCode,
    campaignAppliesToAllCountries: section.campaignAppliesToAllCountries,
    campaignCountries: section.campaignCountries.map((c: any) => c.countryCode),
    isActive: section.isActive,
    isDefault: section.isDefault,
    maxItems: section.maxItems,
    sortOrder: section.sortOrder,
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString(),
    items: section.items.map((item: any) => ({
      id: item.id,
      position: item.position,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      product: {
        id: item.product.id,
        title: item.product.title,
        slug: item.product.slug,
        price: item.product.price ? item.product.price.toString() : null,
        currency: item.product.currency,
        isActive: item.product.isActive,
        publishedAt: item.product.publishedAt
          ? item.product.publishedAt.toISOString()
          : null,
        status: item.product.status,
        brand: item.product.brand,
        imageUrl: item.product.images[0]?.url ?? null,
      },
    })),
  };
}

export async function GET() {
  try {
    await requireAdminSession();

    const sections = await prisma.storefrontSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        campaignCountries: {
          orderBy: { countryCode: "asc" },
          select: {
            countryCode: true,
          },
        },
        items: {
          orderBy: { position: "asc" },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                currency: true,
                isActive: true,
                publishedAt: true,
                status: true,
                brand: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
                images: {
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      sections: sections.map(mapSectionResponse),
    });
  } catch (error) {
    console.error("GET /api/admin/storefront failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load storefront sections" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();

    const body = (await req.json()) as CreatePayload;

    const title = String(body.title ?? "").trim();
    const type = body.type ?? StorefrontSectionType.COUNTRY;
    const isActive = body.isActive ?? true;
    const maxItems = Math.max(1, Math.min(Number(body.maxItems ?? 4) || 4, 24));
    const sortOrder = Number(body.sortOrder ?? 0) || 0;

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const normalizedTargetCountryCode = normalizeCountryCode(body.targetCountryCode);
    const normalizedCampaignCountries = normalizeCountryCodes(body.campaignCountries);
    const campaignAppliesToAllCountries = body.campaignAppliesToAllCountries === true;

    let resolvedTargetCountryCode: string | null = null;
    let resolvedCampaignAppliesToAllCountries = false;
    let resolvedIsDefault = false;

    if (type === StorefrontSectionType.DEFAULT) {
      resolvedIsDefault = true;
      resolvedTargetCountryCode = null;
      resolvedCampaignAppliesToAllCountries = false;
    }

    if (type === StorefrontSectionType.COUNTRY) {
      resolvedIsDefault = false;
      resolvedTargetCountryCode = normalizedTargetCountryCode;
      resolvedCampaignAppliesToAllCountries = false;

      if (!resolvedTargetCountryCode) {
        return NextResponse.json(
          { ok: false, error: "Target country is required for COUNTRY sections" },
          { status: 400 }
        );
      }
    }

    if (type === StorefrontSectionType.CAMPAIGN) {
      resolvedIsDefault = false;
      resolvedTargetCountryCode = null;
      resolvedCampaignAppliesToAllCountries = campaignAppliesToAllCountries;

      if (
        !resolvedCampaignAppliesToAllCountries &&
        normalizedCampaignCountries.length === 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Select at least one country or enable all countries for CAMPAIGN sections",
          },
          { status: 400 }
        );
      }
    }

    if (resolvedIsDefault) {
      await prisma.storefrontSection.updateMany({
        where: {
          OR: [
            { isDefault: true },
            { type: StorefrontSectionType.DEFAULT },
          ],
        },
        data: {
          isDefault: false,
        },
      });
    }

    const key = await makeUniqueSectionKey(title);

    const created = await prisma.storefrontSection.create({
      data: {
        key,
        title,
        type,
        targetCountryCode: resolvedTargetCountryCode,
        campaignAppliesToAllCountries: resolvedCampaignAppliesToAllCountries,
        isActive,
        isDefault: resolvedIsDefault,
        maxItems,
        sortOrder,
      },
      select: {
        id: true,
      },
    });

    if (
      type === StorefrontSectionType.CAMPAIGN &&
      !resolvedCampaignAppliesToAllCountries &&
      normalizedCampaignCountries.length > 0
    ) {
      await prisma.storefrontSectionCountry.createMany({
        data: normalizedCampaignCountries.map((countryCode) => ({
          sectionId: created.id,
          countryCode,
        })),
        skipDuplicates: true,
      });
    }

    const fullSection = await prisma.storefrontSection.findUnique({
      where: { id: created.id },
      include: {
        campaignCountries: {
          orderBy: { countryCode: "asc" },
          select: {
            countryCode: true,
          },
        },
        items: {
          orderBy: { position: "asc" },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                currency: true,
                isActive: true,
                publishedAt: true,
                status: true,
                brand: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
                images: {
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      section: fullSection ? mapSectionResponse(fullSection) : null,
    });
  } catch (error) {
    console.error("POST /api/admin/storefront failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create storefront section" },
      { status: 500 }
    );
  }
}