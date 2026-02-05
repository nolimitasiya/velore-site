import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireBrandContext } from "@/lib/auth/BrandSession";


export const runtime = "nodejs";

const CurrencyEnum = z.enum(["GBP", "EUR", "CHF", "USD"]);

const AllowedBadges = [
  "bestseller",
  "new_in",
  "editor_pick",
  "modest_essential",
  "limited_stock",
  "sale",
  "ramadan_edit",
  "eid_edit",
  "workwear",
  "next_day",
] as const;

const BadgeEnum = z.enum(AllowedBadges);

const RowSchema = z.object({
  product_slug: z.string().min(1),
  product_name: z.string().min(1),
  
  product_url: z
  .string()
  .trim()
  .url()
  .transform((v) => v.replace(/\/+$/, "")),



  image_url_1: z.string().url(),
  image_url_2: z.string().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  image_url_3: z.string().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  image_url_4: z.string().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),

  category_slug: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  occasion_slug: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  material_slug: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),

  tags: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),
  badges: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),
  note: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),

  price: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  currency: CurrencyEnum.optional().or(z.literal("")).transform((v) => (v ? v : "GBP")),

  colour: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  stock: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  shipping_region: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  affiliate_url: z.string().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function prettyNameFromSlug(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function parseCommaList(s: string) {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

// ✅ You already have brand auth in your brand portal.
// Implement this based on your existing brand login/cookies.
import { requireBrandSession } from "@/lib/auth/BrandSession";

export async function POST(req: Request) {
  try {
    const { brandId } = await requireBrandContext();



    const formData = await req.formData();
    const file = formData.get("file");
    const syncMissing = formData.get("syncMissing") === "1";

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file uploaded. Use form-data key: file" }, { status: 400 });
    }

    const text = await file.text();

    // ✅ hard block brand columns to avoid confusion
    const firstLine = text.split(/\r?\n/)[0] ?? "";
    if (/\bbrand_slug\b/i.test(firstLine) || /\bbrand_name\b/i.test(firstLine)) {
      return NextResponse.json(
        { ok: false, error: "brand_slug/brand_name are not allowed in Brand imports. Use the Brand template." },
        { status: 400 }
      );
    }

    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors?.length) {
      return NextResponse.json({ ok: false, error: "CSV parse error", details: parsed.errors }, { status: 400 });
    }

    const rows = parsed.data ?? [];

    // ✅ optional syncMissing only within THIS brand
    let deactivatedCount = 0;
    if (syncMissing && rows.length) {
  const csvSourceUrls = Array.from(
    new Set(
      rows
        .map((r) => String(r.product_url || "").trim().replace(/\/+$/, ""))
        .filter(Boolean)
    )
  );

  const res = await prisma.product.updateMany({
    where: { brandId, sourceUrl: { notIn: csvSourceUrls } },
    data: { isActive: false },
  });

  deactivatedCount = res.count;
}


    const results = {
      total: rows.length,
      createdProducts: 0,
      updatedProducts: 0,
      createdCategories: 0,
      createdOccasions: 0,
      createdMaterials: 0,
      rowErrors: [] as Array<{ row: number; error: string }>,
      deactivatedCount,
    };

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      const safe = RowSchema.safeParse(raw);
      if (!safe.success) {
        results.rowErrors.push({
          row: i + 2,
          error: safe.error.issues[0]?.message ?? safe.error.message,
        });
        continue;
      }

      const r = safe.data;

      const productSlug = slugify(r.product_slug);
      const tags = parseCommaList(r.tags).map(slugify);

      const badgeListRaw = parseCommaList(r.badges).map((x) => x.trim());
      const badges: typeof AllowedBadges[number][] = [];
      for (const b of badgeListRaw) {
        const bSafe = BadgeEnum.safeParse(b);
        if (!bSafe.success) {
          results.rowErrors.push({
            row: i + 2,
            error: `Invalid badge "${b}". Allowed: ${AllowedBadges.join(", ")}`,
          });
          badges.length = 0;
          break;
        }
        badges.push(bSafe.data);
      }
      if (badgeListRaw.length && badges.length === 0) continue;

      const price =
        r.price === null
          ? null
          : (() => {
              try {
                return new Prisma.Decimal(r.price);
              } catch {
                return null;
              }
            })();

      const stock =
        r.stock === null
          ? null
          : (() => {
              const n = Number(r.stock);
              if (!Number.isFinite(n)) return null;
              return Math.max(0, Math.floor(n));
            })();

      const categoryId = r.category_slug
        ? (
            await prisma.category.upsert({
              where: { slug: slugify(r.category_slug) },
              update: {},
              create: { slug: slugify(r.category_slug), name: prettyNameFromSlug(r.category_slug) },
              select: { id: true },
            })
          ).id
        : null;

      const occasionId = r.occasion_slug
        ? (
            await prisma.occasion.upsert({
              where: { slug: slugify(r.occasion_slug) },
              update: {},
              create: { slug: slugify(r.occasion_slug), name: prettyNameFromSlug(r.occasion_slug) },
              select: { id: true },
            })
          ).id
        : null;

      const materialId = r.material_slug
        ? (
            await prisma.material.upsert({
              where: { slug: slugify(r.material_slug) },
              update: {},
              create: { slug: slugify(r.material_slug), name: prettyNameFromSlug(r.material_slug) },
              select: { id: true },
            })
          ).id
        : null;

      // ⚠️ IMPORTANT: your admin route says product.slug is globally unique.
      // For brand portal, you really want uniqueness per brand (brandId + slug).
      // If you haven't changed schema yet, this lookup will still work but can collide across brands.
      
const sourceUrl = r.product_url; // already normalized by schema transform


const existed = await prisma.product.findUnique({
  where: { brandId_sourceUrl: { brandId, sourceUrl } },
  select: { id: true },
});

const product = await prisma.product.upsert({
  where: { brandId_sourceUrl: { brandId, sourceUrl } },
  update: {
    title: r.product_name,
    slug: productSlug,
    sourceUrl,
    affiliateUrl: r.affiliate_url ?? undefined,
    price: price ?? undefined,
    currency: r.currency as any,
    colour: r.colour ?? undefined,
    stock: stock ?? undefined,
    shippingRegion: r.shipping_region ?? undefined,
    tags,
    badges: badges as any,
    note: r.note ?? undefined,
    categoryId: categoryId ?? undefined,
    occasionId: occasionId ?? undefined,
    materialId: materialId ?? undefined,
    isActive: true,
  },
  create: {
    brandId,
    title: r.product_name,
    slug: productSlug,
    sourceUrl,
    affiliateUrl: r.affiliate_url ?? undefined,
    price: price ?? undefined,
    currency: r.currency as any,
    colour: r.colour ?? undefined,
    stock: stock ?? undefined,
    shippingRegion: r.shipping_region ?? undefined,
    tags,
    badges: badges as any,
    note: r.note ?? undefined,
    categoryId: categoryId ?? undefined,
    occasionId: occasionId ?? undefined,
    materialId: materialId ?? undefined,
    isActive: true,
  },
  select: { id: true },
});

const imageUrls = [r.image_url_1, r.image_url_2, r.image_url_3, r.image_url_4].filter(
  (u): u is string => !!u
);

await prisma.productImage.deleteMany({ where: { productId: product.id } });
if (imageUrls.length) {
  await prisma.productImage.createMany({
    data: imageUrls.map((url, idx) => ({ productId: product.id, url, sortOrder: idx })),
  });
}

if (existed) results.updatedProducts += 1;
else results.createdProducts += 1;
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
