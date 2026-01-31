import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewsletterWelcomeEmail } from "@/lib/resend/templates/marketing/newsletterWelcome";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.veiloraclub.com";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/newsletter/confirm?status=missing`);
  }

  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { confirmToken: token },
    select: { id: true, email: true, status: true, unsubToken: true },
  });

  if (!subscriber || subscriber.status !== "pending") {
    return NextResponse.redirect(`${baseUrl}/newsletter/confirm?status=invalid`);
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
      const unsubToken = subscriber.unsubToken ?? globalThis.crypto.randomUUID();


    // If legacy row has null, store a token so unsubscribe always works
    if (!subscriber.unsubToken) {
      await prisma.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { unsubToken },
      });
    }

    await sendNewsletterWelcomeEmail({
      to: subscriber.email,
      unsubToken,
    });
  } catch (e) {
    console.error("❌ welcome email failed:", e);
  }

  return NextResponse.redirect(`${baseUrl}/newsletter/confirm?status=ok`);
  
}
