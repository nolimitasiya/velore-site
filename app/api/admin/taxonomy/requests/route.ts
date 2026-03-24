import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
type Status = (typeof STATUSES)[number];

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const raw = (url.searchParams.get("status") || "PENDING").toUpperCase();
    const status: Status = (STATUSES as readonly string[]).includes(raw) ? (raw as Status) : "PENDING";

    const orderBy =
      status === "PENDING"
        ? [{ createdAt: "desc" as const }]
        : [
            { reviewedAt: "desc" as const }, // nulls last-ish; fine for our usage
            { createdAt: "desc" as const },
          ];

    const items = await prisma.taxonomyRequest.findMany({
      where: { status },
      orderBy,
     select: {
  id: true,
  type: true,
  name: true,
  slug: true,
  reason: true,
  status: true,
  createdAt: true,

  // ✅ new: context for MATERIAL requests
  productTypes: true,

  // ✅ history fields
  reviewedAt: true,
  reviewedByAdminId: true,
  reviewNote: true,

  reviewedByAdmin: {
    select: { id: true, email: true, name: true },
  },

  brand: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, email: true, name: true } },
},
      take: 200,
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load requests" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}