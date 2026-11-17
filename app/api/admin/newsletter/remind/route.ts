import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { lockNewsletterEmail } from "@/lib/marketing/lockNewsletterEmail";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { sendNewsletterConfirmEmail } from "@/lib/resend/templates/marketing/newsletterConfirm";
import { getSiteBaseUrl } from "@/lib/config/siteUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdminSession();

    try {
      getSiteBaseUrl();
    } catch {
      console.error(
        "Admin newsletter reminder URL configuration unavailable."
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Server configuration unavailable.",
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const candidate = await tx.newsletterSubscriber.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
          },
        });

        if (!candidate) {
          return { status: "NOT_FOUND" as const };
        }

        await lockNewsletterEmail(tx, candidate.email);

        const rows = await tx.$queryRaw<
          Array<{
            id: string;
            email: string;
            status: string;
            confirmToken: string | null;
            unsubscribeToken: string | null;
          }>
        >`
          SELECT
            "id",
            "email",
            "status",
            "confirmToken",
            "unsubscribeToken"
          FROM "NewsletterSubscriber"
          WHERE "id" = ${id}
          FOR UPDATE
        `;

        const subscriber = rows[0];

        if (
          !subscriber ||
          subscriber.email.trim().toLowerCase() !==
            candidate.email.trim().toLowerCase()
        ) {
          return { status: "NOT_FOUND" as const };
        }

        if (subscriber.status !== "pending") {
          return { status: "NOT_PENDING" as const };
        }

        if (!subscriber.unsubscribeToken) {
          return { status: "MISSING_UNSUB_TOKEN" as const };
        }

        const confirmToken =
          subscriber.confirmToken ??
          crypto.randomBytes(24).toString("hex");

        if (!subscriber.confirmToken) {
          await tx.newsletterSubscriber.update({
            where: { id: subscriber.id },
            data: { confirmToken },
          });
        }

        return {
          status: "READY" as const,
          email: subscriber.email,
          confirmToken,
          unsubscribeToken: subscriber.unsubscribeToken,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5000,
        timeout: 10000,
      }
    );

    if (result.status === "NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    if (result.status === "NOT_PENDING") {
      return NextResponse.json(
        { ok: false, error: "Not pending" },
        { status: 400 }
      );
    }

    if (result.status === "MISSING_UNSUB_TOKEN") {
      return NextResponse.json(
        { ok: false, error: "Missing unsub token" },
        { status: 500 }
      );
    }

    await sendNewsletterConfirmEmail({
      to: result.email,
      confirmToken: result.confirmToken,
      unsubscribeToken: result.unsubscribeToken,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = error?.message ?? "Unauthorized";
    const status = message === "UNAUTHENTICATED" ? 401 : 500;

    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}