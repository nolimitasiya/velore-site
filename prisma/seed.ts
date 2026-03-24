import "dotenv/config";
import { PrismaClient, StorefrontSectionType} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(slug: string) {
  return slug.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function upsertBySlug(model: "category" | "occasion" | "material", slugs: string[]) {
  for (const slug of slugs) {
    // @ts-expect-error dynamic prisma model access
    await prisma[model].upsert({
      where: { slug },
      update: {},
      create: { slug, name: titleCase(slug) },
    });
  }
}

async function upsertManyBySlug(
  model: "material" | "colour" | "size" | "style",
  names: string[]
) {
  const items = names
    .map((name) => ({ name: name.trim(), slug: slugify(name) }))
    .filter((x) => x.name.length && x.slug.length);

  for (const it of items) {
    // @ts-expect-error dynamic prisma model access
    await prisma[model].upsert({
      where: { slug: it.slug },
      update: { name: it.name },
      create: { name: it.name, slug: it.slug },
    });
  }

  return items.length;
}

async function setMaterialAllowedProductTypes(map: Record<string, string[]>) {
  const allMaterials = await prisma.material.findMany({
    select: { id: true, name: true },
  });

  const byName = new Map(allMaterials.map((m) => [m.name.toLowerCase(), m.id]));
  const rows: { materialId: string; productType: any }[] = [];

  for (const [productType, names] of Object.entries(map)) {
    for (const name of names) {
      const id = byName.get(name.toLowerCase());
      if (!id) {
        console.warn(`⚠️ Allowed material not found in DB: "${name}" (for ${productType})`);
        continue;
      }
      rows.push({ materialId: id, productType });
    }
  }

  if (!rows.length) return;

  await prisma.materialAllowedProductType.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${rows.length} material ↔ productType links`);
}

async function setStyleAllowedProductTypes(map: Record<string, string[]>) {
  const allStyles = await prisma.style.findMany({
    select: { id: true, name: true },
  });

  const byName = new Map(allStyles.map((s) => [s.name.toLowerCase(), s.id]));
  const rows: { styleId: string; productType: any }[] = [];

  for (const [productType, names] of Object.entries(map)) {
    for (const name of names) {
      const id = byName.get(name.toLowerCase());
      if (!id) {
        console.warn(`⚠️ Allowed style not found in DB: "${name}" (for ${productType})`);
        continue;
      }
      rows.push({ styleId: id, productType });
    }
  }

  if (!rows.length) return;

  await prisma.styleAllowedProductType.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${rows.length} style ↔ productType links`);
}

type SeedStorefrontSection = {
  key: string;
  title: string;
  type: StorefrontSectionType;
  targetCountryCode: string | null;
  campaignAppliesToAllCountries: boolean;
  isActive: boolean;
  isDefault: boolean;
  maxItems: number;
  sortOrder: number;
  campaignCountries: string[];
};

async function seedStorefrontSections() {
    const sections: SeedStorefrontSection[] = [
    {
      key: "shop_trendy",
      title: "Shop Trendy",
      type: StorefrontSectionType.DEFAULT,
      targetCountryCode: null,
      campaignAppliesToAllCountries: false,
      isActive: true,
      isDefault: true, // temporary compatibility until removed from schema
      maxItems: 4,
      sortOrder: 0,
      campaignCountries: [],
    },
    {
      key: "trending_uae",
      title: "Trending in UAE",
      type: StorefrontSectionType.COUNTRY,
      targetCountryCode: "AE",
      campaignAppliesToAllCountries: false,
      isActive: true,
      isDefault: false,
      maxItems: 4,
      sortOrder: 1,
      campaignCountries: [],
    },
    {
      key: "trending_france",
      title: "Trending in France",
      type: StorefrontSectionType.COUNTRY,
      targetCountryCode: "FR",
      campaignAppliesToAllCountries: false,
      isActive: true,
      isDefault: false,
      maxItems: 4,
      sortOrder: 2,
      campaignCountries: [],
    },
    {
      key: "trending_uk",
      title: "Trending in UK",
      type: StorefrontSectionType.COUNTRY,
      targetCountryCode: "GB",
      campaignAppliesToAllCountries: false,
      isActive: true,
      isDefault: false,
      maxItems: 4,
      sortOrder: 3,
      campaignCountries: [],
    },
    {
      key: "summer_linen",
      title: "Summer Linen",
      type: StorefrontSectionType.CAMPAIGN,
      targetCountryCode: null,
      campaignAppliesToAllCountries: true,
      isActive: true,
      isDefault: false,
      maxItems: 4,
      sortOrder: 4,
      campaignCountries: [],
    },
    {
      key: "ramadan_collection",
      title: "Ramadan Collection",
      type: StorefrontSectionType.CAMPAIGN,
      targetCountryCode: null,
      campaignAppliesToAllCountries: true,
      isActive: true,
      isDefault: false,
      maxItems: 4,
      sortOrder: 5,
      campaignCountries: [],
    },
    {
      key: "trending_this_week",
      title: "Trending This Week",
      type: "CAMPAIGN" as const,
      targetCountryCode: null,
      campaignAppliesToAllCountries: true,
      isActive: true,
      isDefault: false,
      maxItems: 4,
      sortOrder: 6,
      campaignCountries: [],
    },

        {
      key: "brand_drop_march",
      title: "Brand Drop",
      type: StorefrontSectionType.CAMPAIGN,
      targetCountryCode: null,
      campaignAppliesToAllCountries: false,
      isActive: false,
      isDefault: false,
      maxItems: 4,
      sortOrder: 7,
      campaignCountries: ["FR", "AE", "IT"],
    },
  ];

  for (const section of sections) {
    const existing = await prisma.storefrontSection.upsert({
      where: { key: section.key },
      update: {
        title: section.title,
        type: section.type,
        targetCountryCode: section.targetCountryCode,
        campaignAppliesToAllCountries: section.campaignAppliesToAllCountries,
        isActive: section.isActive,
        isDefault: section.isDefault,
        maxItems: section.maxItems,
        sortOrder: section.sortOrder,
      },
      create: {
        key: section.key,
        title: section.title,
        type: section.type,
        targetCountryCode: section.targetCountryCode,
        campaignAppliesToAllCountries: section.campaignAppliesToAllCountries,
        isActive: section.isActive,
        isDefault: section.isDefault,
        maxItems: section.maxItems,
        sortOrder: section.sortOrder,
      },
      select: { id: true, key: true },
    });

    await prisma.storefrontSectionCountry.deleteMany({
      where: { sectionId: existing.id },
    });

    if (section.type === "CAMPAIGN" && !section.campaignAppliesToAllCountries && section.campaignCountries.length) {
      await prisma.storefrontSectionCountry.createMany({
        data: section.campaignCountries.map((countryCode) => ({
          sectionId: existing.id,
          countryCode,
        })),
        skipDuplicates: true,
      });
    }
  }

  console.log(`✅ Seeded ${sections.length} storefront sections`);
}

async function main() {
  // ---------------------------
  // 1) Admin seed
  // ---------------------------
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD");
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.adminUser.upsert({
    where: { email },
    update: { password: hash, name: "Asiya" },
    create: { email, password: hash, name: "Asiya" },
  });

  console.log("✅ Admin user ready:", user.email);

  // ---------------------------
  // 2) Core taxonomy
  // ---------------------------
  await upsertBySlug("category", [
    "clothing",
    "abaya",
    "modest_dresses",
    "coats",
    "jackets",
    "knitwear",
    "tops",
    "skirts",
    "trousers",
    "co_ords",
    "activewear",
    "maternity",
    "khimar",
    "swimwear_modest",
    "hijabs",
    "accessories",
    "shoes",
  ]);

  await upsertBySlug("occasion", [
  "everyday",
  "workwear",
  "wedding_guest",
  "wedding",
  "eid",
  "ramadan",
  "party",
  "formal",
  "activewear",
]);

  // ---------------------------
  // 3) Expanded taxonomy
  // ---------------------------
  const MATERIALS = [
    "Cotton",
    "Chiffon",
    "Jersey",
    "Modal",
    "Viscose",
    "Silk",
    "Linen",
    "Wool",
    "Polyester",
    "Nylon",
    "Acrylic",
    "Elastane",
  ];

  const MATERIAL_ALLOWED: Record<string, string[]> = {
    HIJAB: ["Chiffon", "Jersey", "Modal", "Viscose", "Cotton", "Silk"],
    ABAYA: ["Cotton", "Viscose", "Modal", "Silk", "Polyester", "Linen", "Wool", "Elastane"],
    DRESS: ["Cotton", "Viscose", "Modal", "Silk", "Linen", "Polyester", "Elastane"],
    TOP: ["Cotton", "Viscose", "Modal", "Linen", "Polyester", "Elastane"],
    SKIRT: ["Cotton", "Viscose", "Modal", "Silk", "Linen", "Polyester", "Elastane"],
    ACTIVEWEAR: ["Nylon", "Polyester", "Elastane", "Acrylic"],
    SETS: ["Cotton", "Viscose", "Modal", "Polyester", "Elastane"],
    MATERNITY: ["Cotton", "Viscose", "Modal", "Elastane"],
    KHIMAR: ["Chiffon", "Jersey", "Modal", "Cotton"],
    JILBAB: ["Cotton", "Viscose", "Modal", "Polyester"],
    COATS_JACKETS: ["Wool", "Polyester", "Cotton"],
  };

  const COLOURS = [
  "Black",
  "White",
  "Grey",
  "Charcoal",
  "Silver",
  "Cream",
  "Beige",
  "Brown",
  "Camel",
  "Navy",
  "Blue",
  "Light Blue",
  "Green",
  "Olive",
  "Khaki",
  "Sage",
  "Red",
  "Burgundy",
  "Pink",
  "Purple",
  "Yellow",
  "Orange",
  "Gold",
  "Nude",
  "Multicolour",
];

  const SIZES = [
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "3XL",
    "4XL",
    "5XL",
    "One Size",
    "Petite",
    "Tall",
    "Plus Size",
  ];

  const STYLE_ALLOWED_PRODUCT_TYPES: Record<string, string[]> = {
  ABAYA: [
    "Open Abaya",
    "Closed Abaya",
    "Kimono Abaya",
    "Casual",
    "Formal",
    "Classic",
    "Minimalist",
    "Embroidered",
    "Plain",
    "Flowy",
    "Layered",
  ],

  DRESS: [
    "Maxi",
    "A-Line",
    "Wrap",
    "Tiered",
    "Shirt Dress",
    "Slip Dress",
    "Casual",
    "Formal",
    "Tailored",
    "Printed",
    "Embroidered",
    "Pleated",
    "Flowy",
    "Denim",
    "Poplin",
  ],

  SKIRT: [
    "Maxi",
    "A-Line",
    "Pleated",
    "Pencil Skirt",
    "Flowy",
    "Casual",
    "Formal",
    "Denim",
    "Poplin",
  ],

  TOP: [
    "Long Sleeve",
    "Tunic",
    "Shirt",
    "Blouse",
    "Oversized",
    "Knitted",
    "Casual",
    "Tailored",
    "Minimalist",
  ],

  HIJAB: [
    "Jersey",
    "Chiffon",
    "Modal",
    "Satin",
    "Plain",
    "Textured",
    "Printed",
    "Lightweight",
    "Sportswear",
  ],

  ACTIVEWEAR: [
    "Matching Set",
    "Performance",
    "Lightweight",
    "Layered",
    "Sportswear",
  ],

  SETS: [
    "Matching Set",
    "Knitted",
    "Loungewear",
    "Printed",
  ],

  MATERNITY: [
    "Nursing Friendly",
    "Stretch",
    "Wrap",
    "Relaxed Fit",
    "Maxi",
    "Matching Set",
  ],

  KHIMAR: [
    "Regular Length",
    "Tall Length",
    "Layered",
    "Lightweight",
    "Plain",
  ],

  JILBAB: [
    "One Piece",
    "Two Piece",
    "Lightweight",
    "Flowy",
    "Plain",
  ],

  COATS_JACKETS: [
    "Structured",
    "Tailored",
    "Oversized",
    "Layered",
    "Wool",
  ],
};

  const STYLES = Array.from(new Set(Object.values(STYLE_ALLOWED_PRODUCT_TYPES).flat()));

  const materialCount = await upsertManyBySlug("material", MATERIALS);
  const allowedColourSlugs = COLOURS.map(slugify);

await prisma.colour.deleteMany({
  where: {
    slug: { notIn: allowedColourSlugs },
    productColours: { none: {} },
  },
});
  const colourCount = await upsertManyBySlug("colour", COLOURS);
  const sizeCount = await upsertManyBySlug("size", SIZES);
  const styleCount = await upsertManyBySlug("style", STYLES);

  await setMaterialAllowedProductTypes(MATERIAL_ALLOWED);
  await setStyleAllowedProductTypes(STYLE_ALLOWED_PRODUCT_TYPES);

    console.log(
    `✅ Seeded: ${materialCount} materials, ${colourCount} colours, ${sizeCount} sizes, ${styleCount} styles`
  );
  await seedStorefrontSections();
  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });