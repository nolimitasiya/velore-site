import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = ["MATERIAL", "COLOUR", "SIZE", "STYLE", "OCCASION"] as const;

type LookupType = (typeof VALID_TYPES)[number];

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "").toUpperCase() as LookupType;

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }

    if (type === "MATERIAL") {
      const items = await prisma.material.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      });

      return NextResponse.json({ ok: true, items });
    }

    if (type === "COLOUR") {
      const items = await prisma.colour.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      });

      return NextResponse.json({ ok: true, items });
    }

    if (type === "SIZE") {
      const items = await prisma.size.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      });

      return NextResponse.json({ ok: true, items });
    }

    if (type === "STYLE") {
      const items = await prisma.style.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      });

      return NextResponse.json({ ok: true, items });
    }

    const items = await prisma.occasion.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to lookup taxonomy" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}