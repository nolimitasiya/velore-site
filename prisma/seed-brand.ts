import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Missing DIRECT_URL / DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  // ✅ change these per brand
  const companySlug = "velore-partner"; // unique
  const companyName = "Velore Partner Ltd";

  const userEmail = "brand@velore.com";
  const userPassword = "brand-strong-password";
  const userName = "Velore Brand Owner";

  const brandSlug = "velore"; // must be unique in Brand table
  const brandName = "Vélore";

  // 1) ensure company exists
  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: { name: companyName },
    create: { slug: companySlug, name: companyName },
    select: { id: true, slug: true },
  });

  // 2) ensure user exists (password set only on create; you can change later if needed)
  const hash = await bcrypt.hash(userPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: { name: userName }, // don't overwrite password silently
    create: {
      email: userEmail,
      password: hash,
      name: userName,
    },
    select: { id: true, email: true },
  });

  // 3) ensure membership exists
  await prisma.membership.upsert({
    where: {
      userId_companyId: { userId: user.id, companyId: company.id },
    },
    update: { role: "owner" },
    create: {
      userId: user.id,
      companyId: company.id,
      role: "owner",
    },
  });

  // 4) ensure brand exists & is linked to company
  const brand = await prisma.brand.upsert({
    where: { slug: brandSlug },
    update: { name: brandName, companyId: company.id },
    create: { slug: brandSlug, name: brandName, companyId: company.id },
    select: { id: true, slug: true, companyId: true },
  });

  console.log("✅ Brand user ready:");
  console.log("Login:", userEmail);
  console.log("Password:", userPassword);
  console.log("Company:", company.slug);
  console.log("Brand:", brand.slug);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
