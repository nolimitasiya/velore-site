import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Simple slugify: "Extra Large" -> "extra-large"
 * Keeps it stable + URL-safe.
 */
function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function upsertManyBySlug<T extends { name: string; slug?: string }>(
  model: "material" | "colour" | "size",
  names: string[]
) {
  const items = names
    .map((name) => ({ name: name.trim(), slug: slugify(name) }))
    .filter((x) => x.name.length && x.slug.length);

  for (const it of items) {
    // @ts-expect-error - dynamic prisma model access
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
    update: {
      password: hash,
      name: "Asiya",
    },
    create: {
      email,
      password: hash,
      name: "Asiya",
    },
  });

  console.log("✅ Admin user ready:", user.email);

  // ---------------------------
  // 2) Taxonomy seed
  // ---------------------------

  // Materials: comprehensive starter list (common retail + modest fashion)
  const MATERIALS = [
    // Natural fibres
    "Cotton",
    "Organic Cotton",
    "Cotton Poplin",
    "Cotton Voile",
    "Cotton Jersey",
    "Linen",
    "Ramie",
    "Hemp",
    "Wool",
    "Merino Wool",
    "Cashmere",
    "Alpaca",
    "Mohair",
    "Silk",
    "Silk Satin",
    "Silk Chiffon",
    "Silk Crepe",
    "Viscose",
    "Rayon",
    "Modal",
    "Lyocell (Tencel)",
    "Bamboo Viscose",

    // Synthetics
    "Polyester",
    "Recycled Polyester",
    "Nylon",
    "Polyamide",
    "Acrylic",
    "Elastane (Spandex)",
    "Polyurethane",

    // Blends / knitwear / warm
    "Wool Blend",
    "Cotton Blend",
    "Linen Blend",
    "Viscose Blend",

    // Denim / leather / suiting
    "Denim",
    "Chambray",
    "Twill",
    "Canvas",
    "Crepe",
    "Georgette",
    "Chiffon",
    "Satin",
    "Velvet",
    "Corduroy",
    "Fleece",
    "Jersey",
    "Rib Knit",
    "Knit",
    "Ponte",
    "Scuba",
    "Neoprene",
    "Jacquard",
    "Brocade",
    "Organza",
    "Tulle",
    "Lace",
    "Sequin",
    "Beaded",
    "Embroidered",
    "Quilted",

    // Outerwear
    "Faux Leather",
    "Leather",
    "Suede",
    "Faux Suede",
    "Sherpa",
    "Faux Fur",
    "Down",
    "Synthetic Down",

    // Hijab / scarves common
    "Jersey (Hijab)",
    "Chiffon (Hijab)",
    "Silk (Hijab)",
    "Cotton (Hijab)",
    "Modal (Hijab)",
    "Viscose (Hijab)",
  ];

  // Colours: broad but not insane
  const COLOURS = [
    // neutrals
    "Black",
    "White",
    "Off White",
    "Cream",
    "Ivory",
    "Beige",
    "Sand",
    "Stone",
    "Camel",
    "Taupe",
    "Brown",
    "Chocolate",
    "Mocha",
    "Grey",
    "Charcoal",
    "Silver",
    "Navy",

    // blues
    "Blue",
    "Sky Blue",
    "Baby Blue",
    "Powder Blue",
    "Cobalt",
    "Royal Blue",
    "Denim Blue",
    "Teal",
    "Turquoise",

    // greens
    "Green",
    "Olive",
    "Khaki",
    "Sage",
    "Mint",
    "Emerald",
    "Forest Green",

    // reds / pinks
    "Red",
    "Burgundy",
    "Maroon",
    "Wine",
    "Rust",
    "Terracotta",
    "Coral",
    "Pink",
    "Blush",
    "Dusty Pink",
    "Hot Pink",

    // purples
    "Purple",
    "Lilac",
    "Lavender",
    "Plum",

    // yellows / oranges
    "Yellow",
    "Mustard",
    "Gold",
    "Orange",
    "Peach",

    // earthy
    "Tan",
    "Caramel",

    // monochrome patterns as “colour”
    "Multicolour",
    "Two Tone",
    "Monochrome",
  ];

  // Sizes: universal + modest fashion friendly (incl. One Size)
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

  const materialCount = await upsertManyBySlug("material", MATERIALS);
  const colourCount = await upsertManyBySlug("colour", COLOURS);
  const sizeCount = await upsertManyBySlug("size", SIZES);

  console.log(`✅ Seeded taxonomy: ${materialCount} materials, ${colourCount} colours, ${sizeCount} sizes`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
