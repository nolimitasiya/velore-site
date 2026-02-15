import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await requireAdminSession();

  const token = process.env.IG_LONG_LIVED_ACCESS_TOKEN;
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID;

  if (!token || !igId) {
    return NextResponse.json({ ok: false, error: "Missing IG env vars" }, { status: 500 });
  }

  const r = await fetch(
    `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,media_url,permalink,timestamp&limit=25&access_token=${token}`,
    { cache: "no-store" }
  );

  const j = await r.json();
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: "IG API error", details: j }, { status: 502 });
  }

  const items = Array.isArray(j.data) ? j.data : [];
  const upserts = items
    .filter((m: any) => m.media_url)
    .map((m: any) =>
      prisma.styleFeedPost.upsert({
        where: { igMediaId: String(m.id) },
        create: {
          igMediaId: String(m.id),
          imageUrl: String(m.media_url),
          caption: m.caption ? String(m.caption) : null,
          permalink: m.permalink ? String(m.permalink) : null,
          postedAt: m.timestamp ? new Date(String(m.timestamp)) : null,
          isActive: true,
        },
        update: {
          imageUrl: String(m.media_url),
          caption: m.caption ? String(m.caption) : null,
          permalink: m.permalink ? String(m.permalink) : null,
          postedAt: m.timestamp ? new Date(String(m.timestamp)) : null,
          isActive: true,
        },
      })
    );

  await Promise.all(upserts);

  return NextResponse.json({ ok: true, synced: upserts.length });
}
