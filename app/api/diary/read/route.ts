import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEDUPE_HOURS = 24;

const BOT_PATTERNS = [
  "bot",
  "crawler",
  "spider",
  "curl",
  "wget",
  "slurp",
  "bingpreview",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "googlebot",
  "google-inspectiontool",
  "apis-google",
  "headless",
  "lighthouse",
];

function isLikelyBot(userAgent: string | null) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern));
}

function buildReadCookieName(diaryPostId: string) {
  return `vc_diary_read_${diaryPostId}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const diaryPostId = String(body?.diaryPostId ?? "").trim();
    const sourcePage =
      String(body?.sourcePage ?? "diary_post").trim() || "diary_post";

    if (!diaryPostId) {
      return NextResponse.json(
        { ok: false, error: "Missing diaryPostId." },
        { status: 400 }
      );
    }

    const headerStore = await headers();
    const cookieStore = await cookies();

    const userAgent = headerStore.get("user-agent");

    if (isLikelyBot(userAgent)) {
      return NextResponse.json({ ok: true, skipped: "bot" });
    }

    const existingPost = await prisma.diaryPost.findUnique({
      where: { id: diaryPostId },
      select: { id: true, status: true },
    });

    if (!existingPost || existingPost.status !== "PUBLISHED") {
      return NextResponse.json(
        { ok: false, error: "Diary post not found." },
        { status: 404 }
      );
    }

    const dedupeCookieName = buildReadCookieName(diaryPostId);
    const alreadyCounted = cookieStore.get(dedupeCookieName)?.value === "1";

    if (alreadyCounted) {
      return NextResponse.json({ ok: true, skipped: "deduped_cookie" });
    }

    const shopperCountryCode =
      cookieStore.get("vc_country")?.value?.toUpperCase() || null;

    const shopperCurrencyCode =
      cookieStore.get("vc_currency")?.value?.toUpperCase() || null;

    await prisma.$transaction([
      prisma.diaryRead.create({
        data: {
          diaryPostId,
          sourcePage,
          shopperCountryCode,
          shopperCurrencyCode,
          userAgent,
        },
      }),
      prisma.diaryPost.update({
        where: { id: diaryPostId },
        data: {
          readCount: { increment: 1 },
        },
      }),
    ]);

    const res = NextResponse.json({ ok: true, counted: true });

    res.cookies.set({
      name: dedupeCookieName,
      value: "1",
      maxAge: DEDUPE_HOURS * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("[/api/diary/read] failed", error);

    return NextResponse.json(
      { ok: false, error: "Failed to record diary read." },
      { status: 500 }
    );
  }
}