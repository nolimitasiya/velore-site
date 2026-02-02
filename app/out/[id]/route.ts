import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const p = await prisma.product.findUnique({
    where: { id },
    select: {
      affiliateUrl: true,
      sourceUrl: true,
      publishedAt: true,
      isActive: true,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.veiloraclub.com";

  if (!p || !p.publishedAt || !p.isActive) {
    return NextResponse.redirect(new URL("/", siteUrl));
  }

  const target = p.affiliateUrl || p.sourceUrl;
  if (!target) {
    return NextResponse.redirect(new URL("/", siteUrl));
  }

  return NextResponse.redirect(target);
}
