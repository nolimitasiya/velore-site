import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { brandId } = await requireBrandContext();
  const body = await req.json().catch(() => ({}));
  const version = String(body.contractVersion || "v1").trim();

  // best-effort IP capture
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  await prisma.brand.update({
    where: { id: brandId },
    data: {
      contractVersion: version,
      contractAcceptedAt: new Date(),
      contractAcceptedIp: ip ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
