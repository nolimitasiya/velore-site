import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  context: {
    params: Promise<{
      notificationId: string;
    }>;
  }
) {
  try {
    await requireAdminSession();

    const { notificationId } = await context.params;

    const notification =
      await prisma.adminNotification.findUnique({
        where: {
          id: notificationId,
        },
        select: {
          id: true,
          readAt: true,
        },
      });

    if (!notification) {
      return NextResponse.json(
        {
          ok: false,
          error: "Notification not found.",
        },
        { status: 404 }
      );
    }

    // Already read: keep the original readAt timestamp.
    if (notification.readAt) {
      return NextResponse.json({
        ok: true,
        alreadyRead: true,
        readAt: notification.readAt,
      });
    }

    const updated =
      await prisma.adminNotification.update({
        where: {
          id: notificationId,
        },
        data: {
          readAt: new Date(),
        },
        select: {
          id: true,
          readAt: true,
        },
      });

    return NextResponse.json({
      ok: true,
      alreadyRead: false,
      readAt: updated.readAt,
    });
  } catch (error) {
    console.error(
      "[admin-notifications] Failed to mark notification read",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to mark notification as read.",
      },
      { status: 500 }
    );
  }
}