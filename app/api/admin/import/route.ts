import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma, ProductType } from "@prisma/client";


// Ensure route runs on Node (file parsing)
export const runtime = "nodejs";
const ProductTypeEnum = z.enum(["ABAYA", "DRESS", "SKIRT", "TOP", "HIJAB"]);

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
  brand_slug: z.string().min(1),
  brand_name: z.string().min(1),

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
  product_type: ProductTypeEnum.optional().or(z.literal("")).transform((v) => (v ? v : null)),


  colour: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  stock: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
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
  return s
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function parseCommaList(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
function parseTags(raw: string) {
  const names = parseCommaList(raw);          // ["Summer Maxi", "Linen"]
  const slugs = names.map(slugify).filter(Boolean); // ["summer_maxi", "linen"]
  // keep aligned
  return slugs.map((slug, idx) => ({ slug, name: names[idx] || slug }));
}


export async function POST(req: Request) {
  let jobId: string | null = null;

  try {
    // 🔐 Auth
    const token = req.headers.get("x-admin-token");
    if (token !== process.env.ADMIN_IMPORT_TOKEN) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Multipart file
    const formData = await req.formData();
    const file = formData.get("file");
    const syncMissing = formData.get("syncMissing") === "1";


    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded. Use form-data key: file" },
        { status: 400 }
      );
    }

    // ✅ Create ImportJob after auth + file check
    const job = await prisma.importJob.create({
      data: {
        type: "products",
        filename: file.name,
        status: "running",
      },
      select: { id: true },
    });
    jobId = job.id;

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

   if (parsed.errors?.length) {
  const details = parsed.errors.map((e) => ({
    type: e.type,
    code: e.code,
    message: e.message,
    row: e.row ?? null,
  }));

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "failed",
      meta: {
        error: "CSV parse error",
        details,
      },
    },
  });

  return NextResponse.json(
    { ok: false, error: "CSV parse error", details },
    { status: 400 }
  );
}


    const rows = parsed.data ?? [];

    // 🔄 Brand sync: deactivate products missing from this CSV (only for this brand)
const brandSlugForSync = slugify(rows[0]?.brand_slug ?? "");
let deactivatedCount = 0;

if (syncMissing && brandSlugForSync) {
  const csvSourceUrls = Array.from(
    new Set(
      rows
        .map((r) => String(r.product_url || "").trim().replace(/\/+$/, ""))
        .filter(Boolean)
    )
  );

  const res = await prisma.product.updateMany({
    where: {
      brand: { slug: brandSlugForSync },
      sourceUrl: { notIn: csvSourceUrls },
    },
    data: { isActive: false },
  });

  deactivatedCount = res.count;
}



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

    // Process sequentially
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

      const brandSlug = slugify(r.brand_slug);
      const productSlug = slugify(r.product_slug);

      // tags
     const tags = parseTags(r.tags); // [{slug, name}, ...]


      
      // badges (validate strictly)
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

      // price (optional)

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


      // stock (optional)
      const stock =
        r.stock === null
          ? null
          : (() => {
              const n = Number(r.stock);
              if (!Number.isFinite(n)) return null;
              return Math.max(0, Math.floor(n));
            })();

      // Brand upsert
      const brand = await prisma.brand.upsert({
        where: { slug: brandSlug },
        update: { name: r.brand_name },
        create: { slug: brandSlug, name: r.brand_name },
        select: { id: true },
      });

      // Category/Occasion/Material upsert
      const categoryId = r.category_slug
        ? (
            await prisma.category.upsert({
              where: { slug: slugify(r.category_slug) },
              update: {},
              create: {
                slug: slugify(r.category_slug),
                name: prettyNameFromSlug(r.category_slug),
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
                name: prettyNameFromSlug(r.occasion_slug),
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
                name: prettyNameFromSlug(r.material_slug),
              },
              select: { id: true },
            })
          ).id
        : null;

      // Product exists?
      const sourceUrl = (r.product_url ?? "").trim().replace(/\/+$/, "");
if (!sourceUrl) {
  results.rowErrors.push({ row: i + 2, error: "Missing product_url (required for import)" });
  continue;
}
const existed = await prisma.product.findUnique({
  where: { brandId_sourceUrl: { brandId: brand.id, sourceUrl } },
  select: { id: true },
});

const product = await prisma.$transaction(async (tx) => {
  // 1) Upsert product (NO tags field!)
  const p = await tx.product.upsert({
    where: { brandId_sourceUrl: { brandId: brand.id, sourceUrl } },
    update: {
      brandId: brand.id,
      title: r.product_name,
      slug: productSlug,
      sourceUrl,
      affiliateUrl: r.affiliate_url ?? undefined,
      price: price ?? undefined,
      currency: r.currency as any,
      colour: r.colour ?? undefined,
      stock: stock ?? undefined,
      badges: badges as any,
      note: r.note ?? undefined,
      categoryId: categoryId ?? undefined,
      isActive: true,
      // IMPORTANT: you currently try to set occasion/material on Product
      // but your schema uses join tables (productOccasions/productMaterials).
      // So remove these lines or you'll get the next TS error:
      // occasionId: occasionId ?? undefined,
      // materialId: materialId ?? undefined,
    },
    create: {
      brandId: brand.id,
      title: r.product_name,
      slug: productSlug,
      sourceUrl,
      affiliateUrl: r.affiliate_url ?? undefined,
      price: price ?? undefined,
      currency: r.currency as any,
      productType: (r.product_type as ProductType) ?? ProductType.ABAYA,
      colour: r.colour ?? undefined,
      stock: stock ?? undefined,
      badges: badges as any,
      note: r.note ?? undefined,
      categoryId: categoryId ?? undefined,
      isActive: true,
      // same note: remove occasionId/materialId if they don't exist on Product
    },
    select: { id: true },
  });

  // 2) Upsert tags and replace ProductTag links
  if (tags.length) {
    const tagRows = await Promise.all(
      tags.map((t) =>
        tx.tag.upsert({
          where: { slug: t.slug },
          update: { name: t.name },
          create: { slug: t.slug, name: t.name },
          select: { id: true },
        })
      )
    );

    // replace links
    await tx.productTag.deleteMany({ where: { productId: p.id } });
    await tx.productTag.createMany({
      data: tagRows.map((t) => ({ productId: p.id, tagId: t.id })),
      skipDuplicates: true,
    });
  } else {
    // no tags provided -> clear existing links (optional, but usually desired for "sync")
    await tx.productTag.deleteMany({ where: { productId: p.id } });
  }

  return p;
});


if (existed) results.updatedProducts += 1;
else results.createdProducts += 1;


      // Images: replace
      const imageUrls = [r.image_url_1, r.image_url_2, r.image_url_3, r.image_url_4].filter(
        (u): u is string => !!u
      );

      await prisma.productImage.deleteMany({ where: { productId: product.id } });
      if (imageUrls.length) {
        await prisma.productImage.createMany({
          data: imageUrls.map((url, idx) => ({ productId: product.id, url, sortOrder: idx })),
        });
      }
  }

    // ✅ Finalize ImportJob
    const invalid =
    results.rowErrors.length > 0
    ? new Set(results.rowErrors.map((e) => e.row)).size
    : 0;
    const valid = results.total - invalid;


    await prisma.importJob.update({
  where: { id: jobId },
  data: {
    status: "success",
    total: results.total,
    valid,
    invalid,
    createdBrands: results.createdBrands,
    createdProducts: results.createdProducts,
    updatedProducts: results.updatedProducts,
    rowErrors: results.rowErrors,
    meta: {
  syncMissing,
  brandSlug: brandSlugForSync || null,
  deactivatedCount,
},

  },
});


    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    // ✅ Mark job failed if created
    if (jobId) {
      try {
        await prisma.importJob.update({
          where: { id: jobId },
          data: { status: "failed", meta: { error: e?.message ?? "Unknown error" } },
        });
      } catch {}
    }

    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
