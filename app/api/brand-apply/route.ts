import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const schema = z.object({
  brandName: z.string().min(2).max(120),
  website: z.string().max(300).optional().or(z.literal("")),
  email: z.string().email().max(200),
  productTypes: z.array(z.string().min(1).max(80)).min(1).max(10),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const created = await prisma.brandApplication.create({
      data: {
        brandName: data.brandName.trim(),
        website: data.website?.trim() || null,
        email: data.email.trim().toLowerCase(),
        productTypes: data.productTypes,
        notes: data.notes?.trim() || null,
      },
    });

    // Email you (optional but recommended)
    const resendKey = process.env.RESEND_API_KEY;
    const to = process.env.BRAND_APPLY_NOTIFY_TO; // e.g. "info@veiloraclub.com"
    const from = process.env.BRAND_APPLY_FROM || "onboarding@veiloraclub.com";

    if (resendKey && to) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from,
        to,
        subject: `New Brand Application – ${created.brandName}`,
        html: `
          <div style="font-family:ui-sans-serif,system-ui; line-height:1.5">
            <h2 style="margin:0 0 12px">New Brand Application</h2>
            <p><strong>Brand:</strong> ${escapeHtml(created.brandName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(created.email)}</p>
            <p><strong>Website/IG:</strong> ${escapeHtml(created.website ?? "-")}</p>
            <p><strong>Product types:</strong> ${created.productTypes.map(escapeHtml).join(", ")}</p>
            <p><strong>Notes:</strong><br/>${escapeHtml(created.notes ?? "-").replace(/\n/g, "<br/>")}</p>
            <hr style="margin:16px 0"/>
            <p style="color:#666; font-size:12px">
              Status: ${created.status} • Created: ${created.createdAt.toISOString()} • ID: ${created.id}
            </p>
          </div>
        `,
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
