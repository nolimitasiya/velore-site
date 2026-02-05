import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { requireAdminSession } from "@/lib/auth/AdminSession";

import { sendNewsletterConfirmEmail } from "@/lib/resend/templates/marketing/newsletterConfirm";

export const runtime = "nodejs";
await requireAdminSession();

export async function POST(req: Request) {
  const adminId = req.headers.get("cookie")?.includes("admin_authed=");
  if (!adminId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const sub = await prisma.newsletterSubscriber.findUnique({
    where: { id },
    select: { id: true, email: true, status: true, unsubscribeToken: true }

  });

  if (!sub) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (sub.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Not pending" }, { status: 400 });
  }

  const confirmToken = crypto.randomBytes(24).toString("hex");

  const updated = await prisma.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { confirmToken },
    select: { email: true, confirmToken: true, unsubscribeToken: true },
  });

  if (!updated.unsubscribeToken) {
    return NextResponse.json({ ok: false, error: "Missing unsub token" }, { status: 500 });
  }

  await sendNewsletterConfirmEmail({
    to: updated.email,
    confirmToken: updated.confirmToken!,
    unsubscribeToken: updated.unsubscribeToken,
    
  });

  return NextResponse.json({ ok: true });
}
