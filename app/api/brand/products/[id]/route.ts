import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { ProductStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}
function toBool(v: any) {
  return v === true || v === "true" || v === 1 || v === "1";
}
function toInt(v: any) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { brandId } = await requireBrandContext();
    const { id } = await ctx.params;

    const product = await prisma.product.findFirst({
      where: { id, brandId },
      select: {
        id: true,
        title: true,
        slug: true,
        sourceUrl: true,
        affiliateUrl: true,
        currency: true,
        price: true,
        stock: true,
        note: true,
        productType: true,
        status: true,
        isActive: true,
        publishedAt: true,
        worldwideShipping: true,
        badges: true,
        submittedAt: true,
        reviewNote: true,
        lastApprovedAt: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true, sortOrder: true } },
        shippingCountries: { select: { countryCode: true } },
        productTags : { select: { tag: { select: { id: true, slug: true, name: true } } } },
        productMaterials: { select: { material: { select: { id: true, slug: true, name: true } } } },
        productOccasions: { select: { occasion: { select: { id: true, slug: true, name: true } } } },
        productColours: { select: { colour: { select: { id: true, slug: true, name: true } } } },
        productSizes: { select: { size: { select: { id: true, slug: true, name: true } } } },
        category: { select: { id: true, slug: true, name: true } },
      },
    });

    if (!product) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load product" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : e?.message === "FORBIDDEN" ? 403 : 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { brandId, userId } = await requireBrandContext();
    const { id } = await ctx.params;

    const existing = await prisma.product.findFirst({
      where: { id, brandId },
      select: { id: true, status: true },
    });

    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));

    // We’ll accept a “draft save” payload and update only what’s provided.
    // For wizard later, we’ll send these fields.
    const title = toStr(body.title);
    const slug = toStr(body.slug);
    const sourceUrl = toStr(body.sourceUrl);
    const affiliateUrl = toStr(body.affiliateUrl);
    const currency = toStr(body.currency);
    const price = body.price === undefined || body.price === null || body.price === ""? undefined // ✅ ignore, do not touch DB
    : new Prisma.Decimal(String(body.price));
    const stock = toInt(body.stock);
    const note = toStr(body.note);
    const productType = body.productType === undefined ? undefined : body.productType;
    const materialIds = Array.isArray(body.materialIds) ? body.materialIds : undefined;
    const colourIds = Array.isArray(body.colourIds) ? body.colourIds : undefined;
    const sizeIds = Array.isArray(body.sizeIds) ? body.sizeIds : undefined;

    const badges = Array.isArray(body.badges) ? body.badges : undefined; // Badge[]
    const tags = Array.isArray(body.tags) ? body.tags : undefined; // string[] (legacy)
    const worldwideShipping = body.worldwideShipping !== undefined ? toBool(body.worldwideShipping) : undefined;
    const shippingCountries = Array.isArray(body.shippingCountries) ? body.shippingCountries : undefined; // ["GB","FR"]

    const imageUrls = Array.isArray(body.images) ? body.images : undefined; // ["https://..."]

    // ✅ Rule: if product was APPROVED and brand edits → becomes DRAFT again
    const shouldDemote = existing.status === ProductStatus.APPROVED;

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: {
          ...(title !== null ? { title } : {}),
          ...(slug !== null ? { slug } : {}),
          ...(sourceUrl !== null ? { sourceUrl } : {}),
          ...(affiliateUrl !== null ? { affiliateUrl } : {}),
          ...(currency !== null ? { currency: currency as any } : {}),
          ...(price !== undefined ? { price } : {}),
          ...(stock !== null || body.stock === "" ? { stock } : {}),
          ...(note !== null || body.note === "" ? { note } : {}),
          ...(productType !== undefined ? { productType } : {}),
          ...(badges !== undefined ? { badges } : {}),
          ...(tags !== undefined ? { tags } : {}),
          ...(worldwideShipping !== undefined ? { worldwideShipping } : {}),
          ...(shouldDemote
            ? {
                status: ProductStatus.DRAFT,
                publishedAt: null, // ✅ strongly recommended
                // keep lastApprovedAt as-is; admin will set again on re-approve
                reviewNote: null,
                submittedAt: null,
              }
            : {}),
          updatedAt: new Date(),
        },
        select: { id: true, status: true, publishedAt: true },
      });

      // shipping countries
      if (shippingCountries) {
        await tx.productShippingCountry.deleteMany({ where: { productId: id } });
        if (shippingCountries.length) {
          await tx.productShippingCountry.createMany({
            data: shippingCountries.map((cc: string) => ({ productId: id, countryCode: cc })),
          });
        }
      }

      // images
      if (imageUrls) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (imageUrls.length) {
          await tx.productImage.createMany({
            data: imageUrls.map((url: string, idx: number) => ({ productId: id, url, sortOrder: idx })),
          });
        }
      }
            // materials
      if (materialIds) {
        await tx.productMaterial.deleteMany({ where: { productId: id } });
        if (materialIds.length) {
          await tx.productMaterial.createMany({
            data: materialIds.map((mid: string) => ({ productId: id, materialId: mid })),
          });
        }
      }

      // colours
      if (colourIds) {
        await tx.productColour.deleteMany({ where: { productId: id } });
        if (colourIds.length) {
          await tx.productColour.createMany({
            data: colourIds.map((cid: string) => ({ productId: id, colourId: cid })),
          });
        }
      }

      // sizes
      if (sizeIds) {
        await tx.productSize.deleteMany({ where: { productId: id } });
        if (sizeIds.length) {
          await tx.productSize.createMany({
            data: sizeIds.map((sid: string) => ({ productId: id, sizeId: sid })),
          });
        }
      }


      return p;
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to save product" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : e?.message === "FORBIDDEN" ? 403 : 500 }
    );
  }
}
