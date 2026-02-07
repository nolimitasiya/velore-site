import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = [
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

// If you want controlled tags today, keep it here.
// Later: move to a Tag table + fetch from DB.
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

export async function GET() {
  await requireBrandContext(); // ensures brand auth; brandId not strictly needed for template

  const [categories, occasions, materials] = await Promise.all([
    prisma.category.findMany({ select: { slug: true }, orderBy: { slug: "asc" } }),
    prisma.occasion.findMany({ select: { slug: true }, orderBy: { slug: "asc" } }),
    prisma.material.findMany({ select: { slug: true }, orderBy: { slug: "asc" } }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Veilora Club";

  const ws = wb.addWorksheet("Products", { views: [{ state: "frozen", ySplit: 2 }] });
  const lists = wb.addWorksheet("Lists");
  lists.state = "veryHidden";

  // Row 1 headers
  ws.addRow(HEADERS);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).height = 20;

  // Row 2 hints
  ws.addRow(
    HEADERS.map((h) => {
      switch (h) {
        case "product_slug":
          return "Optional; leave blank to auto-generate";
        case "productType":
          return "Dropdown (ABAYA/DRESS/SKIRT/TOP/HIJAB)";
        case "currency":
          return "Dropdown (GBP/EUR/CHF/USD)";
        case "category_slug":
        case "material_slug":
        case "occasion_slug":
          return "Dropdown from Veilora lists";
        case "affiliate_url":
          return "Required (Buy Now link)";
        case "source_url":
          return "Required (Brand product page)";
        default:
          return "";
      }
    })
  );
  ws.getRow(2).font = { color: { argb: "FF6B7280" } };
  ws.getRow(2).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(2).height = 34;

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

  // Column widths
  ws.columns = HEADERS.map((h) => ({ key: h, width: Math.max(14, h.length + 2) }));

  // --- Write lists into Lists sheet ---
  // We'll store each list in a column, and reference with a formula like: Lists!$A$2:$A$6

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
    const col = colLetter(idx + 1); // A, B, C...
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

  // --- Apply validation per-cell (ExcelJS way) ---
  const headerIndex: Record<(typeof HEADERS)[number], number> = Object.fromEntries(
    HEADERS.map((h, i) => [h, i + 1])
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

    // badges
    setListValidation(r, headerIndex.badge_1, formulas.badges, true);
    setListValidation(r, headerIndex.badge_2, formulas.badges, true);
    setListValidation(r, headerIndex.badge_3, formulas.badges, true);

    // tags
    setListValidation(r, headerIndex.tag_1, formulas.tags, true);
    setListValidation(r, headerIndex.tag_2, formulas.tags, true);
    setListValidation(r, headerIndex.tag_3, formulas.tags, true);
    setListValidation(r, headerIndex.tag_4, formulas.tags, true);
    setListValidation(r, headerIndex.tag_5, formulas.tags, true);
  }

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="veilora-brand-products-template.xlsx"`,
    },
  });
}
