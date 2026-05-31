import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const shopperId = req.cookies.get("shopper_authed")?.value;
  if (!shopperId) {
    return NextResponse.json({ shopper: null }, { status: 401 });
  }

  const shopper = await prisma.shopper.findUnique({
    where: { id: shopperId },
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
  });

  if (!shopper) {
    return NextResponse.json({ shopper: null }, { status: 401 });
  }

  return NextResponse.json({ shopper });
}