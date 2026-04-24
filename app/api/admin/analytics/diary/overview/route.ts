import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export async function GET() {
  await requireAdminSession();

  const [totalPosts, publishedPosts, totalReads] = await Promise.all([
    prisma.diaryPost.count(),
    prisma.diaryPost.count({
      where: { status: "PUBLISHED" },
    }),
    prisma.diaryRead.count(),
  ]);

  return NextResponse.json({
    ok: true,
    totalPosts,
    publishedPosts,
    totalReads,
  });
}