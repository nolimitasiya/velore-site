import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.newsletterSubscriber.updateMany({
    where: { unsubToken: token },
    data: { status: "unsubscribed" },
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return NextResponse.redirect(`${baseUrl}/newsletter/unsubscribed`);
}
