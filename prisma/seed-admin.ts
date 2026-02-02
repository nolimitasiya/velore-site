import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Missing DIRECT_URL / DATABASE_URL in environment for seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
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


  console.log("Admin user ready:", user.email);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
