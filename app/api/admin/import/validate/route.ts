import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
] as const;

const BadgeEnum = z.enum(AllowedBadges);

const RowSchema = z.object({
  brand_slug: z.string().min(1),
  brand_name: z.string().min(1),

  product_slug: z.string().min(1),
  product_name: z.string().min(1),
  product_url: z.string().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),

  image_url_1: z.string().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),
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
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    // 🔐 Protect validate endpoint too
    const token = req.headers.get("x-admin-token");
    if (token !== process.env.ADMIN_IMPORT_TOKEN) {
      return NextResponse.json({ ok: false, error: "Unauthorized import request" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const syncMissing = formData.get("syncMissing") === "1";


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
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors?.length) {
      const details = parsed.errors.map((e) => ({
        type: e.type,
        code: e.code,
        message: e.message,
        row: e.row ?? null,
      }));

      return NextResponse.json({ ok: false, error: "CSV parse error", details }, { status: 400 });
    }

    const rows = parsed.data ?? [];

    const rowErrors: Array<{ row: number; error: string }> = [];
    const warnings: Array<{ row: number; warning: string }> = [];

    const seenProductSlugs = new Set<string>();
    const validProductSlugs: string[] = []; // ✅ collect across the whole file

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      const safe = RowSchema.safeParse(raw);
      if (!safe.success) {
        rowErrors.push({
          row: i + 2,
          error: safe.error.issues[0]?.message ?? safe.error.message,
        });
        continue;
      }

      const r = safe.data;

      const brandSlug = slugify(r.brand_slug);
      const productSlug = slugify(r.product_slug);

      if (!brandSlug) rowErrors.push({ row: i + 2, error: "brand_slug becomes empty after slugify" });
      if (!productSlug) rowErrors.push({ row: i + 2, error: "product_slug becomes empty after slugify" });

      // Duplicate product slug inside CSV
      if (productSlug) {
        if (seenProductSlugs.has(productSlug)) {
          rowErrors.push({ row: i + 2, error: `Duplicate product_slug in CSV: "${productSlug}"` });
        } else {
          seenProductSlugs.add(productSlug);
        }
      }

      // Badges strict validation
      for (const b of parseCommaList(r.badges)) {
        const bSafe = BadgeEnum.safeParse(b);
        if (!bSafe.success) {
          rowErrors.push({
            row: i + 2,
            error: `Invalid badge "${b}". Allowed: ${AllowedBadges.join(", ")}`,
          });
        }
      }

      // Price numeric if provided
      if (r.price !== null) {
        const n = Number(r.price);
        if (!Number.isFinite(n)) rowErrors.push({ row: i + 2, error: `Invalid price "${r.price}"` });
      }

      // Stock integer >= 0 if provided
      if (r.stock !== null) {
        const n = Number(r.stock);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
          rowErrors.push({
            row: i + 2,
            error: `Invalid stock "${r.stock}" (must be whole number >= 0)`,
          });
        }
      }

      // ⚠️ Warnings (non-blocking)
      const imageCount = [r.image_url_1, r.image_url_2, r.image_url_3, r.image_url_4].filter(Boolean).length;
      if (imageCount === 0) warnings.push({ row: i + 2, warning: "No images provided" });
      if (imageCount === 1) warnings.push({ row: i + 2, warning: "Only one image provided" });
      if (!r.stock) warnings.push({ row: i + 2, warning: "Stock not provided" });
      if (!r.tags) warnings.push({ row: i + 2, warning: "No tags provided" });

      // ✅ only add slug for dry-run counts if it exists
      if (productSlug) validProductSlugs.push(productSlug);
    }

    const total = rows.length;

    // Count unique rows with errors (so multiple errors in same row doesn’t inflate invalid count)
    const invalid = rowErrors.length > 0 ? new Set(rowErrors.map((e) => e.row)).size : 0;
    const valid = total - invalid;

    // ✅ Dry-run: how many will create vs update (DB read only)
    const uniqueValidSlugs = Array.from(new Set(validProductSlugs));
    const existing = uniqueValidSlugs.length
      ? await prisma.product.findMany({
          where: { slug: { in: uniqueValidSlugs } },
          select: { slug: true },
        })
      : [];

    const existingSet = new Set(existing.map((p) => p.slug));

    let willCreate = 0;
    let willUpdate = 0;

    for (const slug of uniqueValidSlugs) {
      if (existingSet.has(slug)) willUpdate++;
      else willCreate++;
    }
    const brandSlugForSync = slugify(rows[0]?.brand_slug ?? "");
let willDeactivate = 0;

if (syncMissing && brandSlugForSync && uniqueValidSlugs.length) {
  willDeactivate = await prisma.product.count({
    where: {
      brand: { slug: brandSlugForSync },
      slug: { notIn: uniqueValidSlugs },
      isActive: true,
    },
  });
}


    return NextResponse.json({
  ok: true,
  summary: { total, valid, invalid, willCreate, willUpdate, willDeactivate },
  brand: {
    slug: brandSlugForSync || null,
    name: rows[0]?.brand_name ?? null,
  },
  rowErrors,
  warnings,
});

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
