import "dotenv/config";
import { PrismaClient } from "@prisma/client";
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
  return slug
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

async function upsertManyBySlug(model: "material" | "colour" | "size", names: string[]) {
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
  // 2) Core taxonomy (existing)
  // ---------------------------
  await upsertBySlug("category", [
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
    "swimwear_modest",
    "hijabs",
    "accessories",
    "shoes",
  ]);

  await upsertBySlug("occasion", [
    "everyday",
    "work",
    "wedding_guest",
    "wedding",
    "eid",
    "ramadan",
    "party",
    "formal",
    "travel",
    "activewear",
  ]);

  // ---------------------------
  // 3) Expanded taxonomy (new)
  // ---------------------------
  const MATERIALS = [
    "Cotton","Organic Cotton","Cotton Poplin","Cotton Voile","Cotton Jersey",
    "Linen","Ramie","Hemp",
    "Wool","Merino Wool","Cashmere","Alpaca","Mohair",
    "Silk","Silk Satin","Silk Chiffon","Silk Crepe",
    "Viscose","Rayon","Modal","Lyocell (Tencel)","Bamboo Viscose",
    "Polyester","Recycled Polyester","Nylon","Polyamide","Acrylic","Elastane (Spandex)",
    "Denim","Chambray","Twill","Canvas",
    "Crepe","Georgette","Chiffon","Satin","Velvet","Corduroy",
    "Fleece","Jersey","Rib Knit","Knit","Ponte","Scuba",
    "Jacquard","Brocade","Organza","Tulle","Lace","Sequin","Beaded","Embroidered","Quilted",
    "Leather","Faux Leather","Suede","Faux Suede","Sherpa","Faux Fur",
    "Down","Synthetic Down",
    "Jersey (Hijab)","Chiffon (Hijab)","Silk (Hijab)","Cotton (Hijab)","Modal (Hijab)","Viscose (Hijab)",
  ];

  const COLOURS = [
    "Black","White","Off White","Cream","Ivory","Beige","Sand","Stone","Camel","Taupe",
    "Brown","Chocolate","Mocha","Grey","Charcoal","Silver","Navy",
    "Blue","Sky Blue","Baby Blue","Powder Blue","Cobalt","Royal Blue","Denim Blue","Teal","Turquoise",
    "Green","Olive","Khaki","Sage","Mint","Emerald","Forest Green",
    "Red","Burgundy","Maroon","Wine","Rust","Terracotta","Coral",
    "Pink","Blush","Dusty Pink","Hot Pink",
    "Purple","Lilac","Lavender","Plum",
    "Yellow","Mustard","Gold","Orange","Peach",
    "Multicolour","Monochrome","Two Tone",
  ];

  const SIZES = ["XXS","XS","S","M","L","XL","XXL","3XL","4XL","5XL","One Size","Petite","Tall","Plus Size"];

  const materialCount = await upsertManyBySlug("material", MATERIALS);
  const colourCount = await upsertManyBySlug("colour", COLOURS);
  const sizeCount = await upsertManyBySlug("size", SIZES);

  console.log(`✅ Seeded: ${materialCount} materials, ${colourCount} colours, ${sizeCount} sizes`);
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
