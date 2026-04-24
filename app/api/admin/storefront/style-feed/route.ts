import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingItem = {
  title?: string | null;
  instagramHandle?: string | null;

  imageUrl?: string;
  imagePath?: string | null;
  imageAlt?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageFocalX?: number | null;
  imageFocalY?: number | null;

  postUrl?: string | null;
  caption?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

function normalizeUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeText(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function normalizeSortOrder(value: unknown, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(20, Math.floor(num)));
}

function normalizePositiveInt(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const int = Math.floor(num);
  return int > 0 ? int : null;
}

function normalizePercent(value: unknown, fallback = 50) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Number(num.toFixed(2))));
}

export async function GET() {
  try {
    await requireAdminSession();

    const items = await prisma.homepageStyleFeedItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
  id: true,
  title: true,
  instagramHandle: true,
  imageUrl: true,
  imagePath: true,
  imageAlt: true,
  imageWidth: true,
  imageHeight: true,
  imageFocalX: true,
  imageFocalY: true,
  postUrl: true,
  caption: true,
  sortOrder: true,
  isActive: true,
},
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("GET /api/admin/storefront/style-feed failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load homepage style feed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => ({}));
    const rawItems = Array.isArray(body?.items) ? (body.items as IncomingItem[]) : [];

    if (rawItems.length > 4) {
      return NextResponse.json(
        { ok: false, error: "You can save up to 4 homepage style feed items." },
        { status: 400 }
      );
    }

    const preparedItems = rawItems.map((item, index) => ({
      title: normalizeText(item.title),
      instagramHandle: normalizeText(item.instagramHandle),

      imageUrl: normalizeUrl(item.imageUrl),
      imagePath: normalizeText(item.imagePath),
      imageAlt: normalizeText(item.imageAlt),
      imageWidth: normalizePositiveInt(item.imageWidth),
      imageHeight: normalizePositiveInt(item.imageHeight),
      imageFocalX: normalizePercent(item.imageFocalX, 50),
      imageFocalY: normalizePercent(item.imageFocalY, 50),

      postUrl: item.postUrl ? normalizeUrl(item.postUrl) : null,
      caption: normalizeText(item.caption),
      sortOrder: normalizeSortOrder(item.sortOrder, index),
      isActive: item.isActive !== false,
    }));

    for (const item of preparedItems) {
      
      if (!item.imageUrl) {
        return NextResponse.json(
          { ok: false, error: "Each style feed item must have an uploaded image." },
          { status: 400 }
        );
      }
    }

    const createItems = preparedItems.map((item) => ({
      title: item.title,
      instagramHandle: item.instagramHandle,

      imageUrl: item.imageUrl as string,
      imagePath: item.imagePath,
      imageAlt: item.imageAlt,
      imageWidth: item.imageWidth,
      imageHeight: item.imageHeight,
      imageFocalX: item.imageFocalX,
      imageFocalY: item.imageFocalY,

      postUrl: item.postUrl,
      caption: item.caption,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.homepageStyleFeedItem.deleteMany({});

      if (createItems.length > 0) {
        await tx.homepageStyleFeedItem.createMany({
          data: createItems,
        });
      }
    });

    const items = await prisma.homepageStyleFeedItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        imageUrl: true,
        imagePath: true,
        imageAlt: true,
        imageWidth: true,
        imageHeight: true,
        imageFocalX: true,
        imageFocalY: true,
        postUrl: true,
        caption: true,
        sortOrder: true,
        isActive: true,
        title: true,
        instagramHandle: true,
      },
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("POST /api/admin/storefront/style-feed failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save homepage style feed" },
      { status: 500 }
    );
  }
}