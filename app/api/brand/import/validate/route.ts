import { NextResponse } from "next/server";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

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

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCommaList(s: string) {
  return String(s || "")
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
  const MAX_BYTES = 5 * 1024 * 1024;
  const ab = await file.arrayBuffer();
  if (ab.byteLength > MAX_BYTES) throw new Error("File too large. Please upload an XLSX under 5MB.");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(ab);

  const ws = wb.getWorksheet("Products") ?? wb.worksheets?.[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  if (!headers.some(Boolean)) return [];

  const rows: Record<string, string>[] = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.hasValues) continue;

    const obj: Record<string, string> = {};
    for (let c = 1; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;

      const cell = row.getCell(c);
      const v: any = cell.value;

      let value = "";
      if (v == null) value = "";
      else if (typeof v === "object" && "text" in v) value = String((v as any).text ?? "");
      else if (typeof v === "object" && "result" in v) value = String((v as any).result ?? "");
      else value = String(v);

      obj[key.trim()] = value.trim();
    }

    // Skip hint row (your template row 2)
    const pn = String(obj["product_name"] ?? "").toLowerCase();
    const su = String(obj["source_url"] ?? "").toLowerCase();
    const img = String(obj["image_url"] ?? obj["image_url_1"] ?? "").toLowerCase();
    const pt = String(obj["productType"] ?? "").toLowerCase();
    const looksLikeHintRow =
    pn.includes("required") ||
    su.includes("required") ||
    img.includes("required") ||
    pt.includes("dropdown") ||
    pn.includes("optional");

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
  if (parsed.errors?.length) throw new Error("CSV parse error");
  return parsed.data ?? [];
}

// ✅ Accept XLSX template fields + legacy CSV
const RowSchema = z
  .object({
    product_slug: z.string().min(1, "product_slug is required"),
    product_name: z.string().min(1, "product_name is required"),

    // ✅ productType OPTIONAL (simple template won't have it)
    productType: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? String(v).trim().toUpperCase() : ""))
      .transform((pt) =>
        pt === "SKIRTS" ? "SKIRT" :
        pt === "ABAYAS" ? "ABAYA" :
        pt === "TOPS" ? "TOP" :
        pt === "HIJABS" ? "HIJAB" :
        pt
      )
      .refine((v) => v === "" || ProductTypeEnum.safeParse(v).success, {
        message: `productType must be one of ${ProductTypeEnum.options.join(", ")}`,
      })
      .transform((v) => (v ? (v as z.infer<typeof ProductTypeEnum>) : null)),

    // Prefer source_url, allow product_url legacy
    source_url: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? normalizeUrl(v) : null)),

    product_url: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? normalizeUrl(v) : null)),

    affiliate_url: z.string().trim().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),

    // ✅ SIMPLE TEMPLATE SUPPORT
    image_url: z.string().trim().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),

    // ✅ ADVANCED TEMPLATE SUPPORT
    image_url_1: z.string().trim().url().optional().or(z.literal("")).transform((v) => (v ? v : null)),
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
  })
  .superRefine((r, ctx) => {
    // ✅ require at least one URL for product page
    if (!r.source_url && !r.product_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source_url"],
        message: "Missing source_url (or product_url)",
      });
    }

    // ✅ require at least one image url (simple or advanced)
    const mainImage = r.image_url_1 || r.image_url;
    if (!mainImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["image_url"],
        message: "Missing image_url (or image_url_1)",
      });
    }
  });


export async function POST(req: Request) {
  try {
    const { brandId } = await requireBrandContext();

    const formData = await req.formData();
    const file = formData.get("file");
    const syncMissing = formData.get("syncMissing") === "1";

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file uploaded. Use form-data key: file" }, { status: 400 });
    }

    // ✅ Parse rows from XLSX or CSV
    let rows: Record<string, string>[] = [];
    if (isProbablyXlsx(file)) {
      rows = await parseXlsxToRows(file);
    } else {
      const text = await file.text();

      const firstLine = text.split(/\r?\n/)[0] ?? "";
      if (/\bbrand_slug\b/i.test(firstLine) || /\bbrand_name\b/i.test(firstLine)) {
        return NextResponse.json(
          { ok: false, error: "brand_slug/brand_name are not allowed in Brand imports. Please use the Brand template." },
          { status: 400 }
        );
      }

      rows = await parseCsvToRows(text);
    }

    const rowErrors: Array<{ row: number; error: string }> = [];
    const warnings: Array<{ row: number; warning: string }> = [];

    const seenSourceUrls = new Set<string>();
    const validSourceUrls: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      // legacy compat: if CSV uses product_url but no source_url, copy it
      if (!raw.source_url && raw.product_url) raw.source_url = raw.product_url;

      const safe = RowSchema.safeParse(raw);
      if (!safe.success) {
        rowErrors.push({
          row: i + 2,
          error: safe.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join(" | "),
        });
        continue;
      }

      const r = safe.data;
      const sourceUrl = normalizeUrl(r.source_url || r.product_url || "");

      if (!sourceUrl) {
        rowErrors.push({ row: i + 2, error: "Missing source_url (or product_url)" });
        continue;
      }

      // duplicates in file
      if (seenSourceUrls.has(sourceUrl)) {
        rowErrors.push({ row: i + 2, error: `Duplicate source_url in file: "${sourceUrl}"` });
        continue;
      }
      seenSourceUrls.add(sourceUrl);

      // product_slug sanity
      const productSlug = slugify(r.product_slug);
      if (!productSlug) rowErrors.push({ row: i + 2, error: "product_slug becomes empty after slugify" });

      // badges validation (legacy badges column)
      for (const b of parseCommaList(r.badges)) {
        if (!BadgeEnum.safeParse(b).success) {
          rowErrors.push({ row: i + 2, error: `Invalid badge "${b}". Allowed: ${AllowedBadges.join(", ")}` });
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
      const imageCount = [r.image_url, r.image_url_1, r.image_url_2, r.image_url_3, r.image_url_4].filter(Boolean).length;
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
    if (e?.message === "UNAUTHENTICATED") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
