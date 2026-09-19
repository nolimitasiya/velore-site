import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdminSession();

    const readAt = new Date();

    const result =
      await prisma.adminNotification.updateMany({
        where: {
          readAt: null,
        },
        data: {
          readAt,
        },
      });

    return NextResponse.json({
      ok: true,
      updatedCount: result.count,
      readAt,
    });
  } catch (error) {
    console.error(
      "[admin-notifications] Failed to mark all notifications read",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to mark all notifications as read.",
      },
      { status: 500 }
    );
  }
}