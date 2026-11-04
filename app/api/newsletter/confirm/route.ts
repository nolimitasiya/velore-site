import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewsletterWelcomeEmail } from "@/lib/resend/templates/marketing/newsletterWelcome";
import { buildSiteUrl } from "@/lib/config/siteUrl";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  let confirmPageUrl: string;

  try {
    confirmPageUrl = buildSiteUrl("/newsletter/confirm");
  } catch {
    console.error("Newsletter confirmation URL configuration unavailable.");
    return new Response("Service temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!token) {
    return NextResponse.redirect(`${confirmPageUrl}?status=missing`);
  }

  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { confirmToken: token },
    select: { id: true, email: true, status: true, unsubscribeToken: true },
  });

  if (!subscriber || subscriber.status !== "pending") {
    return NextResponse.redirect(`${confirmPageUrl}?status=invalid`);
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "subscribed",
      confirmedAt: new Date(),
      confirmToken: null,
    },
  });

    try {
      const unsubscribeToken = subscriber.unsubscribeToken ?? globalThis.crypto.randomUUID();


    // If legacy row has null, store a token so unsubscribe always works
    if (!subscriber.unsubscribeToken) {
      await prisma.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { unsubscribeToken },
      });
    }

    await sendNewsletterWelcomeEmail({
      to: subscriber.email,
      unsubscribeToken,
    });
  } catch (e) {
    console.error("❌ welcome email failed:", e);
  }

  return NextResponse.redirect(`${confirmPageUrl}?status=ok`);
  
}
