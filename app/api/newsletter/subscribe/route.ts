import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendNewsletterConfirmEmail } from "@/lib/resend/templates/marketing/newsletterConfirm";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email(),
  source: z.string().trim().max(50).optional(),
  tags: z.array(z.string().trim().max(30)).optional(),
});

export async function POST(req: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl?.startsWith("https://")) {
    console.error("Invalid NEXT_PUBLIC_SITE_URL:", siteUrl);
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: invalid NEXT_PUBLIC_SITE_URL" },
      { status: 500 }
    );
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: missing RESEND_API_KEY" },
      { status: 500 }
    );
  }

  if (!process.env.RESEND_FROM_MARKETING && !process.env.RESEND_FROM_ONBOARDING) {
    console.error("Missing RESEND_FROM_*");
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: missing RESEND_FROM" },
      { status: 500 }
    );
  }

  try {
    
    const json = await req.json();
    const body = BodySchema.parse(json);

    const email = body.email.toLowerCase();

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
      select: { id: true, status: true, unsubToken: true },
    });

    const makeToken = () => crypto.randomBytes(24).toString("hex");

    // NEW subscriber -> create as pending + send confirm email
    if (!existing) {
      const subscriber = await prisma.newsletterSubscriber.create({
        data: {
          email,
          source: body.source ?? "unknown",
          tags: body.tags ?? [],
          status: "pending",
          unsubToken: makeToken(),
          confirmToken: makeToken(),
        },
        select: { email: true, confirmToken: true, unsubToken: true },
      });

      await sendNewsletterConfirmEmail({
        to: subscriber.email,
        confirmToken: subscriber.confirmToken!, // should exist right after create
        unsubToken: subscriber.unsubToken!,
      });

      return NextResponse.json({ ok: true, status: "pending" });
    }

    // Already confirmed -> do nothing
    if (existing.status === "subscribed") {
      return NextResponse.json({ ok: true, status: "subscribed" });
    }

    // Existing but pending/unsubscribed -> rotate confirm token + send again
    const updated = await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        source: body.source ?? undefined,
        tags: body.tags ?? undefined,
        status: "pending",
        confirmToken: makeToken(),
        // keep existing unsubToken (don’t rotate it)
      },
      select: { email: true, confirmToken: true, unsubToken: true },
    });

    // Safety (in case unsubToken is nullable during your migration phase)
    const unsubToken = updated.unsubToken ?? existing.unsubToken;
    if (!unsubToken || !updated.confirmToken) {
      return NextResponse.json(
        { ok: false, error: "Failed to create confirmation link." },
        { status: 500 }
      );
    }

    await sendNewsletterConfirmEmail({
      to: updated.email,
      confirmToken: updated.confirmToken,
      unsubToken,
    });

    return NextResponse.json({ ok: true, status: "pending" });
  } catch (err: any) {
    console.error("❌ subscribe error:", err);
    if (err?.name === "ZodError") {
      return NextResponse.json({ ok: false, error: "Invalid input." }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
