// C:\Users\Asiya\projects\dalra\app\api\admin\brands\[id]\affiliate\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

const STATUS = ["PENDING", "ACTIVE", "PAUSED"] as const;
type AffiliateStatus = (typeof STATUS)[number];

function toStatus(v: any): AffiliateStatus | null {
  const s = String(v ?? "").trim().toUpperCase();
  return (STATUS as readonly string[]).includes(s) ? (s as AffiliateStatus) : null;
}



export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await ctx.params;

  const brand = await prisma.brand.findUnique({
    where: { id },
    select: {
      id: true,
      affiliateStatus: true,
      affiliateProvider: true,
      affiliateBaseUrl: true,
    },
  });

  if (!brand) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, brand });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));

  // --- status (enum, cannot be null) ---
  let nextStatus: import("@prisma/client").AffiliateStatus | undefined = undefined;

  if (body.affiliateStatus !== undefined) {
    const parsed = toStatus(body.affiliateStatus);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "Invalid affiliateStatus" }, { status: 400 });
    }
    nextStatus = parsed; // ✅ now type is AffiliateStatus (no null)
  }

  // --- provider (enum in Prisma, optional) ---
  // IMPORTANT: this is an enum in your schema, so we should validate it too.
  let nextProvider: import("@prisma/client").AffiliateProvider | null | undefined = undefined;
  if (body.affiliateProvider !== undefined) {
    const p = String(body.affiliateProvider ?? "").trim().toUpperCase();
    if (!p) {
      nextProvider = null; // allow clearing
    } else if (p === "SHOPIFY_COLLABS" || p === "OTHER") {
      nextProvider = p as import("@prisma/client").AffiliateProvider;
    } else {
      return NextResponse.json({ ok: false, error: "Invalid affiliateProvider" }, { status: 400 });
    }
  }

  // --- base url (string optional) ---
  const affiliateBaseUrl =
    body.affiliateBaseUrl === undefined ? undefined : (toStr(body.affiliateBaseUrl) ?? null);

  if (affiliateBaseUrl !== undefined && affiliateBaseUrl !== null) {
    try {
      new URL(affiliateBaseUrl);
    } catch {
      return NextResponse.json(
        { ok: false, error: "affiliateBaseUrl must be a valid URL" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.brand.update({
    where: { id },
    data: {
      ...(nextStatus !== undefined ? { affiliateStatus: nextStatus } : {}),
      ...(nextProvider !== undefined ? { affiliateProvider: nextProvider } : {}),
      ...(affiliateBaseUrl !== undefined ? { affiliateBaseUrl } : {}),
    },
    select: {
      id: true,
      affiliateStatus: true,
      affiliateProvider: true,
      affiliateBaseUrl: true,
    },
  });

  return NextResponse.json({ ok: true, brand: updated });
}

