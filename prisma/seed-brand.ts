import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ✅ brand (tenant)
  const brandSlug = "velore";
  const brandName = "Veilora Club";
  const brandWebsiteUrl = "https://www.veiloraclub.com";

  // ✅ vendor staff user
  const userEmail = "brand@velore.com";
  const userPassword = "brand-strong-password";
  const userName = "Velore Brand Owner";

  // 1) ensure brand exists
  const brand = await prisma.brand.upsert({
    where: { slug: brandSlug },
    update: { name: brandName, websiteUrl: brandWebsiteUrl },
    create: { slug: brandSlug, name: brandName, websiteUrl: brandWebsiteUrl },
    select: { id: true, slug: true },
  });

  // 2) ensure user exists
  const hash = await bcrypt.hash(userPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: { name: userName },
    create: { email: userEmail, password: hash, name: userName },
    select: { id: true, email: true },
  });

  // 3) ensure membership exists (Option A table)
  await prisma.brandMembership.upsert({
    where: { userId_brandId: { userId: user.id, brandId: brand.id } },
    update: { role: "owner" },
    create: { userId: user.id, brandId: brand.id, role: "owner" },
  });

  console.log("✅ Brand user ready:");
  console.log("Login:", userEmail);
  console.log("Password:", userPassword);
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
