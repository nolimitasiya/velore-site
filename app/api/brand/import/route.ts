// C:\Users\Asiya\projects\dalra\app\api\brand\import\route.ts
import { NextResponse } from "next/server";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { Buffer as NodeBuffer } from "node:buffer";
import * as XLSX from "xlsx";




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
  const ab = await file.arrayBuffer();
  const u8 = new Uint8Array(ab);

  // Read workbook from Uint8Array (no Buffer typing issues)
  const wb = XLSX.read(u8, { type: "array" });

  // Prefer sheet "Products", else first sheet
  const sheetName = wb.SheetNames.includes("Products") ? "Products" : wb.SheetNames[0];
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  // Convert sheet to JSON rows
  // defval: "" ensures empty cells show as empty strings (so schema transforms work)
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
    defval: "",
    raw: false,
  });

  // Your template row 2 is "hints", so if the user uploads the template untouched,
  // it'll appear as a row. We should remove it by detecting that row has "Optional;" etc.
  // But easiest: since sheet_to_json starts at first row with headers automatically,
  // it will treat row1 as headers and row2 as first data row.
  // We want to skip row2 hints if present:
  const rows = json.filter((r) => {
    // if product_name looks like a hint row, skip it
    const pn = String(r.product_name || "").toLowerCase();
    const su = String(r.source_url || "").toLowerCase();
    return !(pn.includes("optional") || su.includes("required"));
  });

  // Ensure keys are trimmed (Excel headers sometimes contain trailing spaces)
  return rows.map((r) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      out[String(k).trim()] = String(v ?? "").trim();
    }
    return out;
  });
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
            error:
              "brand_slug/brand_name are not allowed in Brand imports. Use the Brand template.",
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
        new Set(
          rows
            .map((r) => normalizeUrl(r.source_url || r.product_url || ""))
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

      // XLSX template uses source_url; if user uploaded legacy CSV, allow product_url only by copying it into source_url if missing.
      if (!raw.source_url && raw.product_url) raw.source_url = raw.product_url;

      const safe = RowSchema.safeParse(raw);
      if (!safe.success) {
        results.rowErrors.push({
          row: i + 2, // aligns with CSV rows; XLSX data starts at row 3 but this is "row index" not Excel row
          error: safe.error.issues[0]?.message ?? safe.error.message,
        });
        continue;
      }

      const r = safe.data;

      const sourceUrl = r.source_url || r.product_url;
      if (!sourceUrl) {
        results.rowErrors.push({ row: i + 2, error: "Missing source_url (or product_url)" });
        continue;
      }

      const productSlug = slugify(r.product_slug);

      // Tags: prefer tag_1..tag_5, fallback to tags comma-list
      const tagCols = [r.tag_1, r.tag_2, r.tag_3, r.tag_4, r.tag_5].filter(Boolean);
      const tags =
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

          // ✅ enum stored correctly
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
          shippingRegion: r.shipping_region ?? undefined,
          tags,
          badges: badges as any,
          note: r.note ?? undefined,
          categoryId: categoryId ?? undefined,
          occasionId: occasionId ?? undefined,
          materialId: materialId ?? undefined,
          isActive: true,

          // ✅ enum stored correctly
          productType: r.productType,
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
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
