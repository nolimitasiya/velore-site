// C:\Users\Asiya\projects\dalra\app\api\admin\brand-applications\[id]\status\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

import { brandInvitedZoomEmail } from "@/lib/resend/templates/brand/invitedZoom";
import { brandRejectedEmail } from "@/lib/resend/templates/brand/rejected";
import { sendBrandInviteEmail } from "@/lib/resend/templates/onboarding/brandInvite";

import { brandContractSentEmail } from "@/lib/resend/templates/brand/contractSent";
import { brandContractSignedEmail } from "@/lib/resend/templates/brand/contractSigned";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = [
  "new",
  "contacted",
  "invited",
  "contract_sent",
  "contract_signed",
  "onboarded",
  "rejected",
] as const;

type AllowedStatus = (typeof ALLOWED)[number];

const safe = (x: unknown) => String(x ?? "").trim();

async function makeSignedDownloadUrl(path: string) {

  const supabaseAdmin = getSupabaseAdmin();
  
  const { data, error } = await supabaseAdmin.storage
    .from("contracts")
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

  if (error || !data?.signedUrl) throw new Error(error?.message || "Failed to create signed URL");
  return data.signedUrl;
}

async function sendStatusEmail(args: {
  status: AllowedStatus;
  applicantEmail: string;
  firstName?: string | null;
  schedulerUrl?: string;
  inviteLink?: string;
  contractDownloadUrl?: string;
}) {
  if (args.status === "new" || args.status === "contacted") return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const from = process.env.BRAND_APPLY_FROM || "onboarding@veiloraclub.com";
  const replyTo = process.env.BRAND_APPLY_REPLY_TO || "info@veiloraclub.com";

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

  if (args.status === "contract_sent") {
    const resend = new Resend(resendKey);
    const url = safe(args.contractDownloadUrl);
    if (!url) throw new Error("Missing contractDownloadUrl for contract_sent email");

    const { subject, html } = brandContractSentEmail({
      firstName: args.firstName ?? undefined,
      contractUrl: url,
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

  if (args.status === "contract_signed") {
    const resend = new Resend(resendKey);
    const { subject, html } = brandContractSignedEmail({
      firstName: args.firstName ?? undefined,
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
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

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
      contractSentAt: true,
      contractSignedAt: true,
      contractSentPath: true,
      contractSignedPath: true,
    },
  });

  if (!current) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const prev = String(current.status).toLowerCase();
  if (prev === status) return NextResponse.json({ ok: true, skipped: true });

  // ✅ HARD RULE: cannot onboard unless current DB status is contract_signed
  if (status === "onboarded" && prev !== "contract_signed") {
    return NextResponse.json(
      { ok: false, error: "Blocked: contract must be signed before onboarding." },
      { status: 400 }
    );
  }

  const now = new Date();
  const data: any = { status };

  // UI sends these
  const nextContractSentPath = safe(body.contractSentPath || "");
  const nextContractSignedPath = safe(body.contractSignedPath || "");

  if (status === "contract_sent") {
    if (!nextContractSentPath) {
      return NextResponse.json(
        { ok: false, error: "contractSentPath is required when status = contract_sent" },
        { status: 400 }
      );
    }
    data.contractSentAt = now;
    data.contractSentPath = nextContractSentPath;
  }

  if (status === "contract_signed") {
    data.contractSignedAt = now;
    if (nextContractSignedPath) data.contractSignedPath = nextContractSignedPath;
  }

  const updated = await prisma.brandApplication.update({
    where: { id },
    data,
    select: {
      id: true,
      status: true,
      contractSentAt: true,
      contractSignedAt: true,
      contractSentPath: true,
      contractSignedPath: true,
    },
  });

  // Emails (best-effort)
  try {
    let contractDownloadUrl: string | undefined;

    if (status === "contract_sent") {
      contractDownloadUrl = await makeSignedDownloadUrl(nextContractSentPath);
    }

    await sendStatusEmail({
      status,
      applicantEmail: current.email,
      firstName: current.firstName,
      schedulerUrl: safe(body.schedulerUrl) || undefined,
      inviteLink: safe(body.inviteLink) || undefined,
      contractDownloadUrl,
    });
  } catch (e) {
    console.error("[brand-app status] email failed", e);
  }

  return NextResponse.json({ ok: true, application: updated });
}
