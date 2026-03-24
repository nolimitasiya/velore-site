import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();

  const { id } = await context.params;
  const body = await req.json();

  const showOnHomepage = Boolean(body.showOnHomepage);

  let homepageOrder: number | null = null;

  if (body.homepageOrder !== null && body.homepageOrder !== undefined) {
    const parsed = Number(body.homepageOrder);
    if (!Number.isNaN(parsed)) {
      homepageOrder = parsed;
    }
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      showOnHomepage,
      homepageOrder,
    },
    select: {
      id: true,
      showOnHomepage: true,
      homepageOrder: true,
    },
  });

  return NextResponse.json({ ok: true, brand });
}