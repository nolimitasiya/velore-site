import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertCronAuth(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    throw new Error("Unauthorized");
  }
}

type IgMedia = {
  id: string;
  caption?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
};

export async function GET(req: Request) {
  try {
    assertCronAuth(req);

    const brands = await prisma.brand.findMany({
      where: {
        instagramUserId: { not: null },
        instagramToken: { not: null },
      },
      select: { id: true, instagramUserId: true, instagramToken: true },
    });

    let totalUpserts = 0;

    for (const b of brands) {
      const igUserId = b.instagramUserId!;
      const token = b.instagramToken!;

      // IG Graph API: /{ig-user-id}/media (fields: caption, media_url, permalink, timestamp)
      const url =
        `https://graph.facebook.com/v22.0/${igUserId}/media` +
        `?fields=id,caption,media_url,permalink,timestamp` +
        `&limit=8&access_token=${encodeURIComponent(token)}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      const data: IgMedia[] = Array.isArray(json?.data) ? json.data : [];

      for (const m of data) {
        if (!m.id || !m.media_url) continue;

        await prisma.styleFeedPost.upsert({
          where: { igMediaId: m.id },
          create: {
            brandId: b.id,
            igMediaId: m.id,
            imageUrl: m.media_url,
            caption: m.caption ?? null,
            permalink: m.permalink ?? null,
            postedAt: m.timestamp ? new Date(m.timestamp) : null,
            isActive: true,
          },
          update: {
            imageUrl: m.media_url,
            caption: m.caption ?? null,
            permalink: m.permalink ?? null,
            postedAt: m.timestamp ? new Date(m.timestamp) : null,
            isActive: true,
          },
        });

        totalUpserts++;
      }
    }

    return NextResponse.json({ ok: true, brands: brands.length, totalUpserts });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed" },
      { status: 401 }
    );
  }
}