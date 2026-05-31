import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
 
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const shopperId = req.cookies.get("shopper_authed")?.value;
  if (!shopperId) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
 
  const { productId } = await params;
 
  await prisma.wishlistItem.deleteMany({
    where: { shopperId, productId },
  });
 
  return NextResponse.json({ ok: true });
}