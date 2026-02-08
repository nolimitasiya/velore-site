import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { waitlistWelcomeEmail } from "@/lib/resend/templates/marketing/waitlistWelcome";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY || "");

function capitaliseName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayName(rawName: string, email: string) {
  const n = (rawName || "").trim();

  // If name is missing OR looks like an email, derive a friendly name from email prefix
  if (!n || n.includes("@")) {
    const local = (email.split("@")[0] || "there")
      .replace(/[._-]+/g, " ")
      .trim();

    return local ? capitaliseName(local) : "There";
  }

  return capitaliseName(n);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const email = String(body.email || "").trim().toLowerCase();
  const rawName = String(body.name || "");

  // Validate
  if (!rawName.trim() || !email) {
    return NextResponse.json({ error: "Missing name or email" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const friendlyName = displayName(rawName, email);

  try {
    // Save once (clean DB)
    await prisma.waitlistSubscriber.upsert({
      where: { email },
      update: { name: friendlyName },
      create: { name: friendlyName, email },
    });

    // Send email (don’t block signup if email fails)
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn("[waitlist] Missing RESEND_API_KEY");
      } else {
        const { subject, html } = waitlistWelcomeEmail({ name: friendlyName });

        await resend.emails.send({
          from: "Veilora Club <marketing@veiloraclub.com>",
          to: email,
          subject,
          html,
        });
      }
    } catch (err) {
      console.error("[waitlist] Resend failed", err);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[waitlist] DB error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
