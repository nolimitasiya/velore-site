import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

import { brandInvitedZoomEmail } from "@/lib/resend/templates/brand/invitedZoom";
import { brandRejectedEmail } from "@/lib/resend/templates/brand/rejected";
import { sendBrandInviteEmail } from "@/lib/resend/templates/onboarding/brandInvite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["new", "contacted", "invited", "onboarded", "rejected"] as const;
type AllowedStatus = (typeof ALLOWED)[number];

const safe = (x: unknown) => String(x ?? "").trim();

async function sendStatusEmail(args: {
  status: AllowedStatus;
  applicantEmail: string;
  firstName?: string | null;
  schedulerUrl?: string;
  inviteLink?: string;
}) {
  // We already email on "new" in /api/brand-apply, and "contacted" is manual.
  if (args.status === "new" || args.status === "contacted") return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const from = process.env.BRAND_APPLY_FROM || "onboarding@veiloraclub.com";
  const replyTo = process.env.BRAND_APPLY_REPLY_TO || "info@veiloraclub.com";

  // INVITED => send Zoom call email (premium template)
  if (args.status === "invited") {
    const resend = new Resend(resendKey);

    const { subject, html } = brandInvitedZoomEmail({
      firstName: args.firstName ?? undefined,
      schedulerUrl: args.schedulerUrl ? safe(args.schedulerUrl) : undefined,
    });

    await resend.emails.send({
      from: `Veilora Club <${from.includes("<") ? from : from}>`,
      to: args.applicantEmail,
      replyTo,
      subject,
      html,
    });

    return;
  }

  // ONBOARDED => send actual invite link email (your existing function)
  if (args.status === "onboarded") {
    const link = safe(args.inviteLink);
    if (!link) throw new Error("Missing inviteLink for onboarded email");

    await sendBrandInviteEmail({
      to: args.applicantEmail,
      brandName: "your brand",
      inviteLink: link,
      senderName: "Asiya",
    });

    return;
  }

  // REJECTED => rejection email (premium template)
  if (args.status === "rejected") {
    const resend = new Resend(resendKey);
    const { subject, html } = brandRejectedEmail();

    await resend.emails.send({
      from: `Veilora Club <${from.includes("<") ? from : from}>`,
      to: args.applicantEmail,
      replyTo,
      subject,
      html,
    });

    return;
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const status = safe(body.status).toLowerCase() as AllowedStatus;

  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  const current = await prisma.brandApplication.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      email: true,
      firstName: true,
    },
  });

  if (!current) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const prev = String(current.status).toLowerCase();
  if (prev === status) return NextResponse.json({ ok: true, skipped: true });

  await prisma.brandApplication.update({
    where: { id },
    data: { status },
  });

  try {
    await sendStatusEmail({
      status,
      applicantEmail: current.email,
      firstName: current.firstName,
      schedulerUrl: safe(body.schedulerUrl) || undefined,
      inviteLink: safe(body.inviteLink) || undefined,
    });
  } catch (e) {
    console.error("[brand-app status] email failed", e);
  }

  return NextResponse.json({ ok: true });
}
