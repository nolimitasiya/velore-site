import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const p = await prisma.product.findUnique({
    where: { id: params.id },
    select: { affiliateUrl: true, sourceUrl: true, publishedAt: true, isActive: true },
  });

  if (!p || !p.publishedAt || !p.isActive) {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL));
  }

  const target = p.affiliateUrl || p.sourceUrl;
  if (!target) {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL));
  }

  return NextResponse.redirect(target);
}
