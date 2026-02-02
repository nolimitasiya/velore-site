import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewsletterUnsubscribedEmail } from "@/lib/resend/templates/marketing/newsletterUnsubscribed";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 }
    );
  }

  // ✅ Match your schema: unsubToken (based on your old working code)
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { unsubscribeToken: token },
    select: { id: true, email: true, status: true },
  });

  if (!subscriber) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  // ✅ Idempotent: don't keep re-sending the goodbye email
  if (subscriber.status !== "unsubscribed") {
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: "unsubscribed",
        unsubscribedAt: new Date(), // keep if your model has it
      },
    });

    try {
      await sendNewsletterUnsubscribedEmail({ to: subscriber.email });
    } catch (e) {
      console.error("❌ unsub email failed:", e);
      // keep going — user experience should still succeed
    }
  }

  return NextResponse.json({ ok: true });
}
