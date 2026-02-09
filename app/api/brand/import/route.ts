// C:\Users\Asiya\projects\dalra\app\api\brand\import\route.ts
import { NextResponse } from "next/server";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { Buffer as NodeBuffer } from "node:buffer";

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

// ✅ Accept XLSX template fields + CSV legacy fields
const RowSchema = z.object({
  product_slug: z.string().min(1),
  product_name: z.string().min(1),
  productType: ProductTypeEnum,

  // Prefer source_url, allow product_url legacy
  source_url: z
    .string()
    .trim()
    .url()
    .transform((v) => v.replace(/\/+$/, "")),
  product_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v.replace(/\/+$/, "") : null)),

  affiliate_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),

  image_url_1: z.string().trim().url(),
  image_url_2: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  image_url_3: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  image_url_4: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),

  category_slug: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  occasion_slug: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  material_slug: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),

  // NEW: controlled dropdown columns (optional)
  badge_1: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),
  badge_2: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),
  badge_3: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),

  tag_1: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),
  tag_2: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),
  tag_3: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),
  tag_4: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),
  tag_5: z.string().optional().or(z.literal("")).transform((v) => (v ? v : "")),

  // Legacy: comma-separated tags/badges (optional)
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

function prettyNameFromSlug(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function parseCommaList(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeUrl(v: string) {
  return String(v || "").trim().replace(/\/+$/, "");
}

function isProbablyXlsx(file: File) {
  const name = (file as any).name ? String((file as any).name).toLowerCase() : "";
  const type = String(file.type || "").toLowerCase();
  return name.endsWith(".xlsx") || type.includes("spreadsheet") || type.includes("excel");
}

async function parseXlsxToRows(file: File): Promise<Record<string, string>[]> {
  // Safety limits (tweak as you like)
  const MAX_BYTES = 5 * 1024 * 1024; // 5MB
  const MAX_ROWS = 2000;

  const ab = await file.arrayBuffer();
  if (ab.byteLength > MAX_BYTES) {
    throw new Error("File too large. Please upload an XLSX under 5MB.");
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(ab);

  // Prefer sheet called "Products", else first worksheet
  const ws = wb.getWorksheet("Products") ?? wb.worksheets?.[0];
  if (!ws) return [];

  // Row 1: headers
  const headerRow = ws.getRow(1);
  const headers: string[] = [];

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const h = String(cell.value ?? "").trim();
    headers[colNumber] = h; // 1-based indexing
  });

  if (!headers.some(Boolean)) return [];

  const rows: Record<string, string>[] = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    if (rows.length >= MAX_ROWS) break;

    const row = ws.getRow(r);
    if (!row.hasValues) continue;

    const obj: Record<string, string> = {};

    for (let c = 1; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;

      const cell = row.getCell(c);

      let value = "";
      const v: any = cell.value;

      if (v == null) value = "";
      else if (typeof v === "object" && "text" in v) value = String((v as any).text ?? "");
      else if (typeof v === "object" && "result" in v) value = String((v as any).result ?? "");
      else value = String(v);

      obj[key.trim()] = value.trim();
    }

    // Detect your template hint row (Row 2)
    const pn = String(obj["product_name"] ?? "").toLowerCase();
    const su = String(obj["source_url"] ?? "").toLowerCase();
    const pt = String(obj["productType"] ?? "").toLowerCase();

    const looksLikeHintRow = pn.includes("optional") || su.includes("required") || pt.includes("dropdown");
    if (looksLikeHintRow) continue;

    rows.push(obj);
  }

  return rows;
}

async function parseCsvToRows(text: string): Promise<Record<string, string>[]> {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors?.length) {
    throw new Error("CSV parse error");
  }

  return parsed.data ?? [];
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

    // ✅ Parse file into rows (XLSX preferred, CSV fallback)
    let rows: Record<string, string>[] = [];
    if (isProbablyXlsx(file)) {
      rows = await parseXlsxToRows(file);
    } else {
      const text = await file.text();

      // hard block brand columns to avoid confusion
      const firstLine = text.split(/\r?\n/)[0] ?? "";
      if (/\bbrand_slug\b/i.test(firstLine) || /\bbrand_name\b/i.test(firstLine)) {
        return NextResponse.json(
          {
            ok: false,
            error: "brand_slug/brand_name are not allowed in Brand imports. Use the Brand template.",
          },
          { status: 400 }
        );
      }

      rows = await parseCsvToRows(text);
    }

    // ✅ optional syncMissing only within THIS brand
    let deactivatedCount = 0;
    if (syncMissing && rows.length) {
      const csvSourceUrls = Array.from(
        new Set(rows.map((r) => normalizeUrl(r.source_url || r.product_url || "")).filter(Boolean))
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

      // XLSX template uses source_url; if user uploaded legacy CSV, allow product_url only by copying it into source_url if missing.
      if (!raw.source_url && raw.product_url) raw.source_url = raw.product_url;

      const safe = RowSchema.safeParse(raw);
      if (!safe.success) {
        results.rowErrors.push({
          row: i + 2,
          error: safe.error.issues[0]?.message ?? safe.error.message,
        });
        continue;
      }

      const r = safe.data;

      const sourceUrl = normalizeUrl(r.source_url || r.product_url || "");
      if (!sourceUrl) {
        results.rowErrors.push({ row: i + 2, error: "Missing source_url (or product_url)" });
        continue;
      }

      const productSlug = slugify(r.product_slug);

      // Tags: prefer tag_1..tag_5, fallback to tags comma-list
      const tagCols = [r.tag_1, r.tag_2, r.tag_3, r.tag_4, r.tag_5].filter(Boolean);
      const tagSlugs =
        tagCols.length > 0
          ? Array.from(new Set(tagCols.map(slugify))).filter(Boolean)
          : parseCommaList(r.tags).map(slugify);

      // Badges: prefer badge_1..badge_3, fallback to badges comma-list
      const badgeCols = [r.badge_1, r.badge_2, r.badge_3].filter(Boolean);
      const badgeRaw = badgeCols.length > 0 ? badgeCols : parseCommaList(r.badges);
      const badges: typeof AllowedBadges[number][] = [];

      for (const b of badgeRaw) {
        const bSafe = BadgeEnum.safeParse(String(b).trim());
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
      if (badgeRaw.length && badges.length === 0) continue;

      // Price
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

      // Stock
      const stock =
        r.stock === null
          ? null
          : (() => {
              const n = Number(r.stock);
              if (!Number.isFinite(n)) return null;
              return Math.max(0, Math.floor(n));
            })();

      // Upsert category / occasion / material (ids for join tables)
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

      // existed? (for counters)
      const existed = await prisma.product.findUnique({
        where: { brandId_sourceUrl: { brandId, sourceUrl } },
        select: { id: true },
      });

      // ✅ One transaction per row: product + joins + images
      const product = await prisma.$transaction(async (tx) => {
        // 1) Upsert product (NO tags / occasionId / materialId fields)
        const p = await tx.product.upsert({
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
            badges: badges as any,
            note: r.note ?? undefined,
            categoryId: categoryId ?? undefined,
            isActive: true,
            productType: r.productType,
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
            badges: badges as any,
            note: r.note ?? undefined,
            categoryId: categoryId ?? undefined,
            isActive: true,
            productType: r.productType,
          },
          select: { id: true },
        });

        // 2) TAGS: Tag + ProductTag (replace)
        await tx.productTag.deleteMany({ where: { productId: p.id } });
        if (tagSlugs.length) {
          const tagRows = await Promise.all(
            tagSlugs.map((slug) =>
              tx.tag.upsert({
                where: { slug },
                update: {},
                create: { slug, name: prettyNameFromSlug(slug) },
                select: { id: true },
              })
            )
          );

          await tx.productTag.createMany({
            data: tagRows.map((t) => ({ productId: p.id, tagId: t.id })),
            skipDuplicates: true,
          });
        }

        // 3) OCCASION: ProductOccasion (replace)
        await tx.productOccasion.deleteMany({ where: { productId: p.id } });
        if (occasionId) {
          await tx.productOccasion.create({
            data: { productId: p.id, occasionId },
          });
        }

        // 4) MATERIAL: ProductMaterial (replace)
        await tx.productMaterial.deleteMany({ where: { productId: p.id } });
        if (materialId) {
          await tx.productMaterial.create({
            data: { productId: p.id, materialId },
          });
        }

        // 5) IMAGES: replace
        const imageUrls = [r.image_url_1, r.image_url_2, r.image_url_3, r.image_url_4].filter(
          (u): u is string => !!u
        );

        await tx.productImage.deleteMany({ where: { productId: p.id } });
        if (imageUrls.length) {
          await tx.productImage.createMany({
            data: imageUrls.map((url, idx) => ({ productId: p.id, url, sortOrder: idx })),
          });
        }

        return p;
      });

      if (existed) results.updatedProducts += 1;
      else results.createdProducts += 1;
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
