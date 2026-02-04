import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // ✅ same columns you support in RowSchema, minus brand_slug + brand_name
  const headers = [
    "product_slug",
    "product_name",
    "product_url",
    "image_url_1",
    "image_url_2",
    "image_url_3",
    "image_url_4",
    "category_slug",
    "occasion_slug",
    "material_slug",
    "tags",
    "badges",
    "note",
    "price",
    "currency",
    "colour",
    "stock",
    "shipping_region",
    "affiliate_url",
  ];

  const sampleRow = [
    "silk_abaya_black",
    "Silk Abaya (Black)",
    "https://example.com/products/silk-abaya-black",
    "https://example.com/images/1.jpg",
    "",
    "",
    "",
    "abayas",
    "",
    "silk",
    "silk,black,evening",
    "new_in,editor_pick",
    "Optional internal note",
    "120",
    "GBP",
    "Black",
    "12",
    "UK",
    "https://example.com/affiliate?ref=veilora",
  ];

  const csv = [headers.join(","), sampleRow.map(escapeCsv).join(",")].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="veilora-brand-products-template.csv"`,
    },
  });
}

function escapeCsv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
