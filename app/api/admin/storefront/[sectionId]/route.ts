import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { StorefrontSectionType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UpdatePayload = {
  title?: string;
  type?: StorefrontSectionType;
  targetCountryCode?: string | null;
  campaignAppliesToAllCountries?: boolean;
  campaignCountries?: string[];
  isActive?: boolean;
  isDefault?: boolean; // temporary compatibility
  maxItems?: number;
  sortOrder?: number;
  productIds?: string[]; // ordered list
};

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

export async function POST(
  
  req: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    await requireAdminSession();

    const { sectionId } = await params;
    const body = (await req.json()) as UpdatePayload;

    const {
      title,
      type,
      targetCountryCode,
      campaignAppliesToAllCountries,
      campaignCountries = [],
      isActive,
      isDefault,
      maxItems,
      sortOrder,
      productIds = [],
    } = body;

    // ---------------------------
    // 1. Ensure section exists
    // ---------------------------
    const section = await prisma.storefrontSection.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        type: true,
      },
    });

    if (!section) {
      return NextResponse.json(
        { ok: false, error: "Section not found" },
        { status: 404 }
      );
    }

    const nextType = type ?? section.type;

    const normalizedTargetCountryCode = normalizeCountryCode(targetCountryCode);
    const normalizedCampaignCountries = normalizeCountryCodes(campaignCountries);

    // ---------------------------
    // 2. If setting default → unset others
    // Temporary compatibility while isDefault still exists
    // ---------------------------
    if (isDefault === true || nextType === StorefrontSectionType.DEFAULT) {
      await prisma.storefrontSection.updateMany({
        where: {
          id: { not: sectionId },
          OR: [
            { isDefault: true },
            { type: StorefrontSectionType.DEFAULT },
          ],
        },
        data: { isDefault: false },
      });
    }

    // ---------------------------
    // 3. Build clean metadata payload by section type
    // ---------------------------
    let resolvedTargetCountryCode: string | null = null;
    let resolvedCampaignAppliesToAllCountries = false;

    if (nextType === StorefrontSectionType.COUNTRY) {
      resolvedTargetCountryCode = normalizedTargetCountryCode;
      resolvedCampaignAppliesToAllCountries = false;
    }

    if (nextType === StorefrontSectionType.CAMPAIGN) {
      resolvedTargetCountryCode = null;
      resolvedCampaignAppliesToAllCountries =
        campaignAppliesToAllCountries === true;
    }

    if (nextType === StorefrontSectionType.DEFAULT) {
      resolvedTargetCountryCode = null;
      resolvedCampaignAppliesToAllCountries = false;
    }

    // ---------------------------
    // 4. Update section metadata
    // ---------------------------
    await prisma.storefrontSection.update({
      where: { id: sectionId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(isDefault !== undefined
          ? { isDefault }
          : nextType === StorefrontSectionType.DEFAULT
          ? { isDefault: true }
          : {}),
        ...(maxItems !== undefined ? { maxItems } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        targetCountryCode: resolvedTargetCountryCode,
        campaignAppliesToAllCountries: resolvedCampaignAppliesToAllCountries,
      },
    });

    // ---------------------------
    // 5. Replace campaign country targeting
    // ---------------------------
    await prisma.storefrontSectionCountry.deleteMany({
      where: { sectionId },
    });

    if (
      nextType === StorefrontSectionType.CAMPAIGN &&
      !resolvedCampaignAppliesToAllCountries &&
      normalizedCampaignCountries.length > 0
    ) {
      await prisma.storefrontSectionCountry.createMany({
        data: normalizedCampaignCountries.map((countryCode) => ({
          sectionId,
          countryCode,
        })),
        skipDuplicates: true,
      });
    }

    // ---------------------------
    // 6. Replace section items
    // Strategy: delete all → recreate in order
    // ---------------------------
    await prisma.storefrontSectionItem.deleteMany({
      where: { sectionId },
    });

    if (productIds.length > 0) {
      const validProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: { id: true },
      });

      const validIds = new Set(validProducts.map((p) => p.id));
      const cleanIds = productIds.filter((id) => validIds.has(id));

      const rows = cleanIds.map((productId, index) => ({
        sectionId,
        productId,
        position: index,
      }));

      await prisma.storefrontSectionItem.createMany({
        data: rows,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    const err = error as any;

    console.error("🔥 FULL ERROR:", err);
    console.error("🔥 META:", err?.meta);
    console.error("🔥 MESSAGE:", err?.message);

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update section" },
      { status: 500 }
    );
  }
  
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    await requireAdminSession();

    const { sectionId } = await params;

    const section = await prisma.storefrontSection.findUnique({
      where: { id: sectionId },
      select: { id: true, key: true, type: true, isDefault: true },
    });

    if (!section) {
      return NextResponse.json(
        { ok: false, error: "Section not found" },
        { status: 404 }
      );
    }

    await prisma.storefrontSection.delete({
      where: { id: sectionId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/storefront/[sectionId] failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete section" },
      { status: 500 }
    );
  }
}