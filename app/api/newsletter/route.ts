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
    await prisma.newsletterSubscriber.create({ data: { email, source } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: true, already: true });
    }
    console.error("newsletter route error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }

