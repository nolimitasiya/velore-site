import "dotenv/config";
import { prisma } from "../lib/prisma";

function titleCase(slug: string) {
  return slug
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function upsertBySlug(model: "category" | "occasion" | "material", slugs: string[]) {
  for (const slug of slugs) {
    // @ts-expect-error dynamic model access
    await prisma[model].upsert({
      where: { slug },
      update: {},
      create: { slug, name: titleCase(slug) },
    });
  }
}

async function main() {
  await upsertBySlug("category", [
    "abaya","modest_dresses","coats","jackets","knitwear","tops","skirts",
    "trousers","co_ords","activewear","swimwear_modest","hijabs","accessories","shoes",
  ]);

  await upsertBySlug("occasion", [
    "everyday","work","wedding_guest","wedding","eid","ramadan","party","formal","travel","activewear",
  ]);

  await upsertBySlug("material", [
    "cotton","polyester","linen","viscose","wool","silk","chiffon","jersey",
    "denim","leather","cashmere","rayon","nylon","spandex","modal","satin",
  ]);

  console.log("✅ Seed complete");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
