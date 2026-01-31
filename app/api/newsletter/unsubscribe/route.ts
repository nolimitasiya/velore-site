import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewsletterUnsubscribedEmail } from "@/lib/resend/templates/marketing/newsletterUnsubscribed";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.veiloraclub.com";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/newsletter/unsubscribed?status=missing`);
  }

  // 1) Find who this token belongs to (so we know the email)
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { unsubToken: token },
    select: { id: true, email: true, status: true },
  });

  if (!subscriber) {
    return NextResponse.redirect(`${baseUrl}/newsletter/unsubscribed?status=invalid`);
  }

  // 2) Update their status
  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { status: "unsubscribed" },
  });

  // 3) Send the "sorry to see you go" email
  try {
    await sendNewsletterUnsubscribedEmail({ to: subscriber.email });
  } catch (e) {
    console.error("❌ unsub email failed:", e);
  }

  // 4) Redirect to the unsubscribe confirmation page
  return NextResponse.redirect(`${baseUrl}/newsletter/unsubscribed?status=ok`);
}
