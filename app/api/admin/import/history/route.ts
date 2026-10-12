import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/auth/withAdminAuth";

export const GET = withAdminAuth(async function GET() {
  const jobs = await prisma.importJob.findMany({
    where: { type: "products" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ ok: true, jobs });
});