import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewsletterConfirmEmail } from "@/lib/resend/templates/marketing/newsletterConfirm";

export const runtime = "nodejs";

export async function POST() {
  // pull all pending (you can cap if you want)
  const pending = await prisma.newsletterSubscriber.findMany({
    where: { status: "pending" },
    select: { email: true, confirmToken: true, unsubscribeToken: true },
  });

  let sent = 0;
  let failed = 0;

  for (const s of pending) {
    try {
      if (!s.confirmToken || !s.unsubscribeToken) {
        failed++;
        continue;
      }
      await sendNewsletterConfirmEmail({
        to: s.email,
        confirmToken: s.confirmToken,
        unsubscribeToken: s.unsubscribeToken,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: pending.length });
}
