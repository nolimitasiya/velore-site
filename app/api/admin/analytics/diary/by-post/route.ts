import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export async function GET() {
  await requireAdminSession();

  const posts = await prisma.diaryPost.findMany({
    orderBy: [
      { readCount: "desc" },
      { publishedAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      readCount: true,
      publishedAt: true,
    },
    take: 20,
  });

  return NextResponse.json({
    ok: true,
    posts,
  });
}