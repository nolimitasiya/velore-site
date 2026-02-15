import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("take") ?? 12) || 12, 48);

  const posts = await prisma.styleFeedPost.findMany({
    where: { isActive: true },
    orderBy: [{ isPinned: "desc" }, { postedAt: "desc" }, { createdAt: "desc" }],
    take,
    select: {
      id: true,
      imageUrl: true,
      caption: true,
      permalink: true,
      postedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    posts: posts.map((p) => ({
      ...p,
      postedAt: p.postedAt ? p.postedAt.toISOString() : null,
    })),
  });
}
