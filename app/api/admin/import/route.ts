import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CurrencyEnum = z.enum(["GBP", "EUR", "CHF", "USD"]);

// must match your Prisma enum Badge EXACTLY
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
] as const;

const BadgeEnum = z.enum(AllowedBadges);

const RowSchema = z.object({
  brand_slug: z.string().min(1),
  brand_name: z.string().min(1),

  product_slug: z.string().min(1),
  product_name: z.string().min(1),
  product_url: z.string().url().optional().or(z.literal("")).transform(v => (v ? v : null)),

  image_url_1: z.string().url().optional().or(z.literal("")).transform(v => (v ? v : null)),
  image_url_2: z.string().url().optional().or(z.literal("")).transform(v => (v ? v : null)),
  image_url_3: z.string().url().optional().or(z.literal("")).transform(v => (v ? v : null)),
  image_url_4: z.string().url().optional().or(z.literal("")).transform(v => (v ? v : null)),

  category_slug: z.string().optional().or(z.literal("")).transform(v => (v ? v : null)),
  occasion_slug: z.string().optional().or(z.literal("")).transform(v => (v ? v : null)),
  material_slug: z.string().optional().or(z.literal("")).transform(v => (v ? v : null)),

  tags: z.string().optional().or(z.literal("")).transform(v => (v ? v : "")),
  badges: z.string().optional().or(z.literal("")).transform(v => (v ? v : "")),
  note: z.string().optional().or(z.literal("")).transform(v => (v ? v : null)),

  price: z.string().optional().or(z.literal("")).transform(v => (v ? v : null)),
  currency: CurrencyEnum.optional().or(z.literal("")).transform(v => (v ? v : "GBP")),

  colour: z.string().optional().or(z.literal("")).transform(v => (v ? v : null)),
  stock: z.string().optional().or(z.literal("")).transform(v => (v ? v : null)),
  shipping_region: z.string().optional().or(z.literal("")).transform(v => (v ? v : null)),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCommaList(s: string) {
  return s
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    // Expect multipart/form-data with a "file"
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded. Use form-data key: file" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      return NextResponse.json(
        { ok: false, error: "CSV parse error", details: parsed.errors },
        { status: 400 }
      );
    }

    const rows = parsed.data ?? [];
    const results = {
      total: rows.length,
      createdBrands: 0,
      createdProducts: 0,
      updatedProducts: 0,
      createdCategories: 0,
      createdOccasions: 0,
      createdMaterials: 0,
      rowErrors: [] as Array<{ row: number; error: string }>,
    };

    // Process sequentially (safer for early stage + clearer errors)
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      const safe = RowSchema.safeParse(raw);
      if (!safe.success) {
        results.rowErrors.push({ row: i + 2, error: safe.error.message }); // +2: header + 1-index
        continue;
      }

      const r = safe.data;

      const brandSlug = slugify(r.brand_slug);
      const productSlug = slugify(r.product_slug);

      // tags
      const tags = parseCommaList(r.tags).map(slugify);

      // badges (validate strictly)
      const badgeListRaw = parseCommaList(r.badges).map(x => x.trim());
      const badges: typeof AllowedBadges[number][] = [];
      for (const b of badgeListRaw) {
        const bSafe = BadgeEnum.safeParse(b);
        if (!bSafe.success) {
          results.rowErrors.push({
            row: i + 2,
            error: `Invalid badge "${b}". Allowed: ${AllowedBadges.join(", ")}`,
          });
          // skip this row
          badges.length = 0;
          break;
        }
        badges.push(bSafe.data);
      }
      if (badgeListRaw.length && badges.length === 0) continue;

      // price (optional)
      const price =
        r.price === null
          ? null
          : (() => {
              const n = Number(r.price);
              if (!Number.isFinite(n)) return null;
              return n;
            })();

      // stock (optional)
      const stock =
        r.stock === null
          ? null
          : (() => {
              const n = Number(r.stock);
              if (!Number.isFinite(n)) return null;
              return Math.max(0, Math.floor(n));
            })();

      // Upsert brand
      const brand = await prisma.brand.upsert({
        where: { slug: brandSlug },
        update: { name: r.brand_name },
        create: { slug: brandSlug, name: r.brand_name },
        select: { id: true },
      });

      // category/occasion/material: auto-create if slug provided
      const categoryId = r.category_slug
        ? (
            await prisma.category.upsert({
              where: { slug: slugify(r.category_slug) },
              update: {},
              create: {
                slug: slugify(r.category_slug),
                name: r.category_slug.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
              },
              select: { id: true },
            })
          ).id
        : null;

      const occasionId = r.occasion_slug
        ? (
            await prisma.occasion.upsert({
              where: { slug: slugify(r.occasion_slug) },
              update: {},
              create: {
                slug: slugify(r.occasion_slug),
                name: r.occasion_slug.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
              },
              select: { id: true },
            })
          ).id
        : null;

      const materialId = r.material_slug
        ? (
            await prisma.material.upsert({
              where: { slug: slugify(r.material_slug) },
              update: {},
              create: {
                slug: slugify(r.material_slug),
                name: r.material_slug.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
              },
              select: { id: true },
            })
          ).id
        : null;

      // Upsert product by slug
      // NOTE: because slug is unique globally in your schema.
      const exists = await prisma.product.findUnique({
        where: { slug: productSlug },
        select: { id: true },
      });

      const product = await prisma.product.upsert({
        where: { slug: productSlug },
        update: {
          brandId: brand.id,
          title: r.product_name,
          sourceUrl: r.product_url ?? undefined,
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
          brandId: brand.id,
          title: r.product_name,
          slug: productSlug,
          sourceUrl: r.product_url ?? undefined,
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

      // Images: replace with the four columns (simple, predictable)
      const imageUrls = [r.image_url_1, r.image_url_2, r.image_url_3, r.image_url_4].filter(
        (u): u is string => !!u
      );

      // Clear existing and reinsert (simple + consistent)
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      if (imageUrls.length) {
        await prisma.productImage.createMany({
          data: imageUrls.map((url, idx) => ({ productId: product.id, url, sortOrder: idx })),
        });
      }

      if (exists) results.updatedProducts += 1;
      else results.createdProducts += 1;
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
