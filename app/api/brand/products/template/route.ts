// C:\Users\Asiya\projects\dalra\app\api\brand\products\template\route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --------------------
// SIMPLE (default)
// --------------------
const SIMPLE_HEADERS = ["product_slug", "product_name", "source_url", "image_url"] as const;

// --------------------
// ADVANCED (optional)
// --------------------
const ADVANCED_HEADERS = [
  "product_slug",
  "product_name",
  "source_url",
  "affiliate_url",
  "image_url_1",
  "image_url_2",
  "image_url_3",
  "image_url_4",
  "productType",
  "category_slug",
  "occasion_slug",
  "material_slug",
  "badge_1",
  "badge_2",
  "badge_3",
  "tag_1",
  "tag_2",
  "tag_3",
  "tag_4",
  "tag_5",
  "note",
  "price",
  "currency",
  "colour",
  "stock",
  "shipping_region",
] as const;

const SHIPPING_REGIONS = ["UK", "EU", "Worldwide"] as const;

const CONTROLLED_TAGS = [
  "denim",
  "linen",
  "workwear",
  "occasionwear",
  "everyday",
  "petite",
  "tall",
  "plus_size",
] as const;

// Prisma enums in your schema
const PRODUCT_TYPES = ["ABAYA", "DRESS", "SKIRT", "TOP", "HIJAB"] as const;
const CURRENCIES = ["GBP", "EUR", "CHF", "USD"] as const;
const BADGES = [
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

function colLetter(n: number) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function setHeaderStyles(ws: ExcelJS.Worksheet) {
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).height = 20;
  ws.getRow(2).font = { color: { argb: "FF6B7280" } };
  ws.getRow(2).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(2).height = 34;
}

function setColumnWidths(ws: ExcelJS.Worksheet, headers: readonly string[]) {
  ws.columns = headers.map((h) => ({
    key: h,
    width: Math.max(22, h.length + 8),
  }));
}

export async function GET(req: Request) {
  await requireBrandContext();

  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode") || "").toLowerCase();
  const isAdvanced = mode === "advanced";

  const wb = new ExcelJS.Workbook();
  wb.creator = "Veilora Club";

  if (!isAdvanced) {
    // --------------------
    // SIMPLE TEMPLATE
    // --------------------
    const ws = wb.addWorksheet("Products", { views: [{ state: "frozen", ySplit: 2 }] });

    ws.addRow(SIMPLE_HEADERS);

    ws.addRow([
      "Required (unique slug)",
      "Required (product display name)",
      "Required (brand product page URL)",
      "Required (main product image URL)",
    ]);

    setHeaderStyles(ws);

    ws.addRow([
      "denim-a-line-skirt",
      "Denim A-Line Skirt",
      "https://example.com/products/denim-a-line-skirt",
      "https://example.com/images/1.jpg",
    ]);

    setColumnWidths(ws, SIMPLE_HEADERS);

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="veilora-brand-products-template.xlsx"`,
      },
    });
  }

  // --------------------
  // ADVANCED TEMPLATE
  // --------------------
  const [categories, occasions, materials] = await Promise.all([
    prisma.category.findMany({ select: { slug: true }, orderBy: { slug: "asc" } }),
    prisma.occasion.findMany({ select: { slug: true }, orderBy: { slug: "asc" } }),
    prisma.material.findMany({ select: { slug: true }, orderBy: { slug: "asc" } }),
  ]);

  const ws = wb.addWorksheet("Products", { views: [{ state: "frozen", ySplit: 2 }] });
  const lists = wb.addWorksheet("Lists");
  lists.state = "veryHidden";

  // Row 1 headers
  ws.addRow(ADVANCED_HEADERS);

  // Row 2 hints
  ws.addRow(
    ADVANCED_HEADERS.map((h) => {
      switch (h) {
        case "product_slug":
          return "Required (unique slug)";
        case "product_name":
          return "Required (product display name)";
        case "source_url":
          return "Required (brand product page URL)";
        case "image_url_1":
          return "Required (main product image URL)";
        case "affiliate_url":
          return "Optional (buy now / affiliate link)";
        case "productType":
          return "Optional dropdown (ABAYA/DRESS/SKIRT/TOP/HIJAB)";
        case "currency":
          return "Optional dropdown (GBP/EUR/CHF/USD)";
        case "category_slug":
        case "occasion_slug":
        case "material_slug":
          return "Optional dropdown (Veilora lists)";
        case "badge_1":
        case "badge_2":
        case "badge_3":
          return "Optional dropdown (badges)";
        case "tag_1":
        case "tag_2":
        case "tag_3":
        case "tag_4":
        case "tag_5":
          return "Optional dropdown (tags)";
        case "shipping_region":
          return "Optional dropdown (UK/EU/Worldwide)";
        default:
          return "Optional";
      }
    })
  );

  setHeaderStyles(ws);

  // Example row (Row 3)
  ws.addRow([
    "denim-a-line-skirt",
    "Denim A-Line Skirt",
    "https://example.com/products/denim-a-line-skirt",
    "https://example.com/affiliate?ref=veilora",
    "https://example.com/images/1.jpg",
    "",
    "",
    "",
    "SKIRT",
    categories[0]?.slug ?? "",
    occasions[0]?.slug ?? "",
    materials[0]?.slug ?? "",
    "new_in",
    "",
    "",
    "denim",
    "everyday",
    "",
    "",
    "",
    "Optional internal note",
    "89.99",
    "GBP",
    "Blue",
    "12",
    "UK",
  ]);

  setColumnWidths(ws, ADVANCED_HEADERS);

  // --- Write dropdown lists into Lists sheet ---
  const listDefs: Array<{ name: string; values: string[] }> = [
    { name: "ProductTypes", values: [...PRODUCT_TYPES] },
    { name: "Currencies", values: [...CURRENCIES] },
    { name: "ShippingRegions", values: [...SHIPPING_REGIONS] },
    { name: "Badges", values: [...BADGES] },
    { name: "Tags", values: [...CONTROLLED_TAGS] },
    { name: "Categories", values: categories.map((x) => x.slug) },
    { name: "Materials", values: materials.map((x) => x.slug) },
    { name: "Occasions", values: occasions.map((x) => x.slug) },
  ];

  const listCol: Record<string, string> = {};
  listDefs.forEach((def, idx) => {
    const col = colLetter(idx + 1);
    listCol[def.name] = col;

    lists.getCell(`${col}1`).value = def.name;
    lists.getCell(`${col}1`).font = { bold: true };

    const safeValues = def.values.length ? def.values : [""];
    safeValues.forEach((v, i) => {
      lists.getCell(`${col}${i + 2}`).value = v;
    });
  });

  function listFormula(listName: string, count: number) {
    const col = listCol[listName];
    const end = Math.max(2, 1 + count);
    return `=Lists!$${col}$2:$${col}$${end}`;
  }

  const formulas = {
    productType: listFormula("ProductTypes", PRODUCT_TYPES.length),
    currency: listFormula("Currencies", CURRENCIES.length),
    shipping: listFormula("ShippingRegions", SHIPPING_REGIONS.length),
    badges: listFormula("Badges", BADGES.length),
    tags: listFormula("Tags", CONTROLLED_TAGS.length),
    categories: listFormula("Categories", Math.max(1, categories.length)),
    materials: listFormula("Materials", Math.max(1, materials.length)),
    occasions: listFormula("Occasions", Math.max(1, occasions.length)),
  };

  const headerIndex: Record<(typeof ADVANCED_HEADERS)[number], number> = Object.fromEntries(
    ADVANCED_HEADERS.map((h, i) => [h, i + 1])
  ) as any;

  function setListValidation(row: number, col: number, formula: string, allowBlank = true) {
    ws.getCell(row, col).dataValidation = {
      type: "list",
      allowBlank,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: "Invalid value",
      error: "Please select a value from the dropdown list.",
    };
  }

  const startRow = 3;
  const endRow = 1000;

  for (let r = startRow; r <= endRow; r++) {
    setListValidation(r, headerIndex.productType, formulas.productType, true);
    setListValidation(r, headerIndex.currency, formulas.currency, true);
    setListValidation(r, headerIndex.shipping_region, formulas.shipping, true);

    setListValidation(r, headerIndex.category_slug, formulas.categories, true);
    setListValidation(r, headerIndex.material_slug, formulas.materials, true);
    setListValidation(r, headerIndex.occasion_slug, formulas.occasions, true);

    setListValidation(r, headerIndex.badge_1, formulas.badges, true);
    setListValidation(r, headerIndex.badge_2, formulas.badges, true);
    setListValidation(r, headerIndex.badge_3, formulas.badges, true);

    setListValidation(r, headerIndex.tag_1, formulas.tags, true);
    setListValidation(r, headerIndex.tag_2, formulas.tags, true);
    setListValidation(r, headerIndex.tag_3, formulas.tags, true);
    setListValidation(r, headerIndex.tag_4, formulas.tags, true);
    setListValidation(r, headerIndex.tag_5, formulas.tags, true);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="veilora-brand-products-template-advanced.xlsx"`,
    },
  });
}
