import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getShopperId(req: NextRequest) {
  return req.cookies.get("shopper_authed")?.value ?? null;
}

// GET — return all wishlist product IDs for the shopper
export async function GET(req: NextRequest) {
  const shopperId = getShopperId(req);
  if (!shopperId) return NextResponse.json({ items: [] }, { status: 200 });

  const items = await prisma.wishlistItem.findMany({
    where: { shopperId },
    select: { productId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

// POST — add a product to wishlist
export async function POST(req: NextRequest) {
  const shopperId = getShopperId(req);
  if (!shopperId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const item = await prisma.wishlistItem.upsert({
    where: { shopperId_productId: { shopperId, productId } },
    create: { shopperId, productId },
    update: {},
  });

  return NextResponse.json({ ok: true, item });
}