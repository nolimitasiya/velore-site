import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewsletterConfirmEmail } from "@/lib/resend/templates/marketing/newsletterConfirm";


function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const source = String(body.source || "footer").trim();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email" }, { status: 400 });
  }

  try {
    await prisma.newsletterSubscriber.create({
      data: { email, source },
    });
  } catch (e: any) {
    // unique violation -> already subscribed
    return NextResponse.json({ ok: true, already: true });
  }

  return NextResponse.json({ ok: true });
}
