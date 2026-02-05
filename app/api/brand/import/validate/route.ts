import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
  product_slug: z.string().min(1, "product_slug is required"),
  product_name: z.string().min(1, "product_name is required"),

  product_url: z
    .string()
    .trim()
    .min(1, "product_url is required")
    .url("product_url must be a valid URL")
    .transform((v) => v.replace(/\/+$/, "")),

  // ✅ mandatory
  image_url_1: z
    .string()
    .trim()
    .min(1, "image_url_1 is required")
    .url("image_url_1 must be a valid URL"),

  // optional
  image_url_2: z.string().trim().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  image_url_3: z.string().trim().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  image_url_4: z.string().trim().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),

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

  affiliate_url: z.string().trim().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),
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
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const { brandId } = await requireBrandContext();

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

    // ✅ HARD BLOCK: brand columns should never appear in brand mode
    const firstLine = text.split(/\r?\n/)[0] ?? "";
    if (/\bbrand_slug\b/i.test(firstLine) || /\bbrand_name\b/i.test(firstLine)) {
      return NextResponse.json(
        {
          ok: false,
          error: "brand_slug/brand_name are not allowed in Brand imports. Please use the Brand template.",
        },
        { status: 400 }
      );
    }

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

    const seenSourceUrls = new Set<string>();
    const validSourceUrls: string[] = [];

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

      const sourceUrl = r.product_url.trim().replace(/\/+$/, "");
      if (!sourceUrl) {
        rowErrors.push({ row: i + 2, error: "Missing product_url (required)" });
        continue;
      }

      // ✅ duplicates in CSV by the DB unique key (brandId + sourceUrl)
      if (seenSourceUrls.has(sourceUrl)) {
        rowErrors.push({ row: i + 2, error: `Duplicate product_url in CSV: "${sourceUrl}"` });
        continue;
      }
      seenSourceUrls.add(sourceUrl);

      // product_slug sanity
      const productSlug = slugify(r.product_slug);
      if (!productSlug) rowErrors.push({ row: i + 2, error: "product_slug becomes empty after slugify" });

      // badges validation
      for (const b of parseCommaList(r.badges)) {
        if (!BadgeEnum.safeParse(b).success) {
          rowErrors.push({
            row: i + 2,
            error: `Invalid badge "${b}". Allowed: ${AllowedBadges.join(", ")}`,
          });
        }
      }

      // price/stock checks
      if (r.price !== null) {
        const n = Number(r.price);
        if (!Number.isFinite(n)) rowErrors.push({ row: i + 2, error: `Invalid price "${r.price}"` });
      }

      if (r.stock !== null) {
        const n = Number(r.stock);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
          rowErrors.push({ row: i + 2, error: `Invalid stock "${r.stock}" (must be whole number >= 0)` });
        }
      }

      // warnings
      const imageCount = [r.image_url_1, r.image_url_2, r.image_url_3, r.image_url_4].filter(Boolean).length;
      if (imageCount === 1) warnings.push({ row: i + 2, warning: "Only one image provided" });
      if (!r.stock) warnings.push({ row: i + 2, warning: "Stock not provided" });
      if (!r.tags) warnings.push({ row: i + 2, warning: "No tags provided" });

      validSourceUrls.push(sourceUrl);
    }

    const total = rows.length;
    const invalid = rowErrors.length ? new Set(rowErrors.map((e) => e.row)).size : 0;
    const valid = total - invalid;

    const uniqueSourceUrls = Array.from(new Set(validSourceUrls));

    const existing = uniqueSourceUrls.length
      ? await prisma.product.findMany({
          where: { brandId, sourceUrl: { in: uniqueSourceUrls } },
          select: { sourceUrl: true },
        })
      : [];

    const existingSet = new Set(existing.map((p) => p.sourceUrl));
    let willCreate = 0;
    let willUpdate = 0;

    for (const u of uniqueSourceUrls) {
      if (existingSet.has(u)) willUpdate++;
      else willCreate++;
    }

    let willDeactivate = 0;
    if (syncMissing && uniqueSourceUrls.length) {
      willDeactivate = await prisma.product.count({
        where: { brandId, sourceUrl: { notIn: uniqueSourceUrls }, isActive: true },
      });
    }

    return NextResponse.json({
      ok: true,
      summary: { total, valid, invalid, willCreate, willUpdate, willDeactivate },
      rowErrors,
      warnings,
    });
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
