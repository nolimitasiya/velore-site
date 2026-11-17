import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { lockNewsletterEmail } from "@/lib/marketing/lockNewsletterEmail";
import { sendNewsletterUnsubscribedEmail } from "@/lib/resend/templates/marketing/newsletterUnsubscribed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const candidate = await tx.newsletterSubscriber.findFirst({
        where: { unsubscribeToken: token },
        select: { id: true, email: true },
      });

      if (!candidate) {
        return { status: "INVALID" as const };
      }

      await lockNewsletterEmail(tx, candidate.email);

      const subscribers = await tx.$queryRaw<
        Array<{
          id: string;
          email: string;
          status: string;
        }>
      >`
        SELECT "id", "email", "status"
        FROM "NewsletterSubscriber"
        WHERE "unsubscribeToken" = ${token}
        FOR UPDATE
      `;

      const subscriber = subscribers.find(
        (row) => row.id === candidate.id
      );

      if (
        !subscriber ||
        subscriber.email.trim().toLowerCase() !==
          candidate.email.trim().toLowerCase()
      ) {
        return { status: "INVALID" as const };
      }

      const now = new Date();
      const changed = subscriber.status !== "unsubscribed";

      if (changed) {
        await tx.newsletterSubscriber.update({
          where: { id: subscriber.id },
          data: {
            status: "unsubscribed",
            unsubscribedAt: now,
            confirmToken: null,
          },
        });
      }

      await tx.newsletterWelcomeEvent.updateMany({
        where: {
          subscriberId: subscriber.id,
          status: {
            in: ["PENDING", "FAILED"],
          },
        },
        data: {
          status: "CANCELLED",
          nextAttemptAt: null,
        },
      });

      return {
        status: "UNSUBSCRIBED" as const,
        email: subscriber.email,
        changed,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 10000,
    }
  );

  if (result.status === "INVALID") {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  if (result.changed) {
    try {
      await sendNewsletterUnsubscribedEmail({
        to: result.email,
      });
    } catch (error) {
      console.error(
        "[newsletter-unsubscribe] Confirmation email failed",
        error
      );
    }
  }

  return NextResponse.json({ ok: true });
}