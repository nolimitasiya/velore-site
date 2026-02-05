import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { sendNewsletterConfirmEmail } from "@/lib/resend/templates/marketing/newsletterConfirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // ✅ must be inside the request handler
    await requireAdminSession();

    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const sub = await prisma.newsletterSubscriber.findUnique({
      where: { id },
      select: { id: true, email: true, status: true, unsubscribeToken: true },
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
  } catch (e: any) {
    const msg = e?.message ?? "Unauthorized";
    const status = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
