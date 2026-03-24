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
  const direction = body.direction as "up" | "down";

  if (direction !== "up" && direction !== "down") {
    return NextResponse.json(
      { ok: false, error: "Invalid direction." },
      { status: 400 }
    );
  }

  const current = await prisma.brand.findUnique({
    where: { id },
    select: {
      id: true,
      showOnHomepage: true,
      homepageOrder: true,
    },
  });

  if (!current) {
    return NextResponse.json(
      { ok: false, error: "Brand not found." },
      { status: 404 }
    );
  }

  if (!current.showOnHomepage || current.homepageOrder == null) {
    return NextResponse.json(
      { ok: false, error: "Brand is not featured on homepage." },
      { status: 400 }
    );
  }

  const swapWith = await prisma.brand.findFirst({
    where: {
      showOnHomepage: true,
      homepageOrder:
        direction === "up"
          ? { lt: current.homepageOrder }
          : { gt: current.homepageOrder },
    },
    orderBy: {
      homepageOrder: direction === "up" ? "desc" : "asc",
    },
    select: {
      id: true,
      homepageOrder: true,
    },
  });

  if (!swapWith || swapWith.homepageOrder == null) {
    return NextResponse.json({ ok: true, moved: false });
  }

  await prisma.$transaction([
    prisma.brand.update({
      where: { id: current.id },
      data: { homepageOrder: swapWith.homepageOrder },
    }),
    prisma.brand.update({
      where: { id: swapWith.id },
      data: { homepageOrder: current.homepageOrder },
    }),
  ]);

  return NextResponse.json({ ok: true, moved: true });
}