import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { ProductStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action = "approve" | "needs_changes" | "reject";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "") as Action;
    const reviewNote =
  body.reviewNote == null ? null : String(body.reviewNote).trim() || null;


    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing product id" },
        { status: 400 }
      );
    }

    if (!["approve", "needs_changes", "reject"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    // For needs_changes/reject, require a note (keeps the process clean)
    if ((action === "needs_changes" || action === "reject") && !reviewNote) {
      return NextResponse.json(
        { ok: false, error: "reviewNote is required for this action" },
        { status: 400 }
      );
    }

    const now = new Date();

    const data: any = {
      reviewNote: reviewNote || null,
    };

    if (action === "approve") {
      data.status = ProductStatus.APPROVED;
      data.lastApprovedAt = now;

      // You decide:
      // - Do NOT auto publish on approve (safer)
      // - Keep publishedAt as-is (admin controls publish separately)
      // If you want "approve also publishes", uncomment:
      // data.publishedAt = now;
    }

    if (action === "needs_changes") {
      data.status = ProductStatus.NEEDS_CHANGES;
      // Ensure it never stays published while needing changes
      data.publishedAt = null;
    }

    if (action === "reject") {
      data.status = ProductStatus.REJECTED;
      data.publishedAt = null;
      // Optional: auto deactivate rejected products
      data.isActive = false;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        reviewNote: true,
        publishedAt: true,
        lastApprovedAt: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to review product" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}
