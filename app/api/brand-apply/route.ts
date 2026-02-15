// C:\Users\Asiya\projects\dalra\app\api\brand-apply\route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { brandApplicationReceivedEmail } from "@/lib/resend/templates/brand/applicationReceived";

const schema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(200),

  // ✅ required for long-term data quality
  countryCode: z.string().length(2),
  city: z.string().min(1).max(120),

  phone: z.string().max(60).optional().or(z.literal("")),
  website: z.string().max(300).optional().or(z.literal("")),
  socialMedia: z.string().max(300).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const countryCode = String(data.countryCode || "").trim().toUpperCase();
    const city = String(data.city || "").trim();

    const created = await prisma.brandApplication.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),

        // ✅ new fields (make sure Prisma model has them)
        countryCode,
        city,

        phone: data.phone?.trim() || null,
        website: data.website?.trim() || null,
        socialMedia: data.socialMedia?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    const resendKey = process.env.RESEND_API_KEY;
    const to = process.env.BRAND_APPLY_NOTIFY_TO; // your inbox
    const from = process.env.BRAND_APPLY_FROM || "onboarding@veiloraclub.com";
    const replyTo = process.env.BRAND_APPLY_REPLY_TO || "info@veiloraclub.com";

    if (resendKey) {
      const resend = new Resend(resendKey);

      // 1) Notify you (only if BRAND_APPLY_NOTIFY_TO is set)
      if (to) {
        await resend.emails.send({
          from,
          to,
          replyTo,
          subject: `New Brand Apply – ${created.firstName} ${created.lastName}`,
          html: `
            <div style="font-family:ui-sans-serif,system-ui; line-height:1.5">
              <h2 style="margin:0 0 12px">New Brand Apply</h2>
              <p><strong>Name:</strong> ${escapeHtml(created.firstName)} ${escapeHtml(created.lastName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(created.email)}</p>
              <p><strong>Location:</strong> ${escapeHtml(created.city ?? "-")}, ${escapeHtml(created.countryCode ?? "-")}</p>
              <p><strong>Phone:</strong> ${escapeHtml(created.phone ?? "-")}</p>
              <p><strong>Company website:</strong> ${escapeHtml(created.website ?? "-")}</p>
              <p><strong>Social media:</strong> ${escapeHtml(created.socialMedia ?? "-")}</p>
              <p><strong>Notes:</strong><br/>${escapeHtml(created.notes ?? "-").replace(/\\n/g, "<br/>")}</p>
              <hr style="margin:16px 0"/>
              <p style="color:#666; font-size:12px">
                Status: ${escapeHtml(String(created.status))} • Created: ${created.createdAt.toISOString()} • ID: ${created.id}
              </p>
            </div>
          `,
        });
      }

      // 2) Auto-reply to applicant (always)
      const { subject, html } = brandApplicationReceivedEmail({ firstName: created.firstName });
      await resend.emails.send({
        from: `Veilora Club <${from.includes("<") ? from : from}>`,
        to: created.email,
        replyTo,
        subject,
        html,
      });
    }

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    const msg =
      e?.name === "ZodError"
        ? "Please check the form fields and try again."
        : e?.message ?? "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
