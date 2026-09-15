// C:\Users\Asiya\projects\dalra\app\api\brand-apply\route.ts
import { NextRequest, NextResponse,} from "next/server";import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {  ANALYTICS_SESSION_COOKIE,} from "@/lib/analytics/session";
import { Resend } from "resend";
import { sendBrandApplicationToKlaviyo } from "@/lib/klaviyo/brandApplication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORM = ["SHOPIFY", "GODADDY", "WIX", "OTHER"] as const;

// helpers
const trimToNull = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

const upper = (v: unknown) => String(v ?? "").trim().toUpperCase();

const schema = z
  .object({
    firstName: z.string().min(1).max(80).transform((s) => s.trim()),
    lastName: z.string().min(1).max(80).transform((s) => s.trim()),
    email: z.string().email().max(200).transform((s) => s.trim().toLowerCase()),

    // ✅ NEW
    companyName: z.string().min(1).max(160).transform((s) => s.trim()),
    platformHosted: z.enum(PLATFORM),
    platformHostedOther: z
      .string()
      .max(120)
      .optional()
      .nullable()
      .transform((s) => (s == null ? null : s.trim())),

    // ✅ required for long-term data quality
    countryCode: z
      .string()
      .length(2)
      .transform((s) => s.trim().toUpperCase()),
    city: z.string().min(1).max(120).transform((s) => s.trim()),

    // optional text fields (allow "" but store null)
    phone: z.string().max(60).optional().or(z.literal("")).transform(trimToNull),
    website: z.string().max(300).optional().or(z.literal("")).transform(trimToNull),
    socialMedia: z.string().max(300).optional().or(z.literal("")).transform(trimToNull),
    notes: z.string().max(2000).optional().or(z.literal("")).transform(trimToNull),
  })
  .superRefine((val, ctx) => {
    // If OTHER -> require platformHostedOther
    if (val.platformHosted === "OTHER") {
      const other = String(val.platformHostedOther ?? "").trim();
      if (!other) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["platformHostedOther"],
          message: "Please specify which platform you are hosted on.",
        });
      }
    }
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);

    // Normalised values already, but keep these explicit:
    const city = data.city;

/*
 * Snapshot the visitor's acquisition attribution
 * onto the brand application.
 *
 * Attribution must never block an application,
 * so a missing/invalid session simply results
 * in an unattributed application.
 */
const analyticsSessionId =
  req.cookies
    .get(ANALYTICS_SESSION_COOKIE)
    ?.value
    ?.trim() || null;

let analyticsSession: {
  id: string;
  acquisitionSource: string | null;
  acquisitionMedium: string | null;
  acquisitionCampaign: string | null;
  acquisitionContent: string | null;
  acquisitionTerm: string | null;
  landingPath: string | null;
  referrer: string | null;
} | null = null;

if (analyticsSessionId) {
  try {
    analyticsSession =
      await prisma.analyticsSession.findUnique({
        where: {
          id: analyticsSessionId,
        },
        select: {
          id: true,
          acquisitionSource: true,
          acquisitionMedium: true,
          acquisitionCampaign: true,
          acquisitionContent: true,
          acquisitionTerm: true,
          landingPath: true,
          referrer: true,
        },
      });
  } catch (err) {
    console.error(
      "[brand-apply] Attribution lookup failed",
      err
    );
  }
}

const created =
  await prisma.brandApplication.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,

      // ✅ NEW
      companyName: data.companyName,
      platformHosted: data.platformHosted,
      platformHostedOther:
        data.platformHosted === "OTHER" ? (data.platformHostedOther?.trim() || null) : null,

      countryCode: data.countryCode,
      city: data.city,

      phone: data.phone,
      website: data.website,
      socialMedia: data.socialMedia,
      notes: data.notes,

      
      // ✅ Acquisition attribution
      analyticsSessionId: analyticsSessionId,
      acquisitionSource: analyticsSession?.acquisitionSource ?? null,
      acquisitionMedium: analyticsSession?.acquisitionMedium ?? null,
      acquisitionCampaign: analyticsSession?.acquisitionCampaign ?? null,
      acquisitionContent: analyticsSession?.acquisitionContent ?? null,
      acquisitionTerm: analyticsSession?.acquisitionTerm ?? null,
      landingPath: analyticsSession?.landingPath ?? null,
      referrer: analyticsSession?.referrer ?? null,
    },
    
  });
  

try {
  await sendBrandApplicationToKlaviyo({
    applicationId: created.id,

    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,

    companyName: data.companyName,
    countryCode: data.countryCode,
    city: data.city,

    website: data.website,
    socialMedia: data.socialMedia,

    platformHosted:
      data.platformHosted === "OTHER"
        ? data.platformHostedOther || "OTHER"
        : data.platformHosted,

        analyticsSessionId:
  created.analyticsSessionId,

acquisitionSource:
  created.acquisitionSource,

acquisitionMedium:
  created.acquisitionMedium,

acquisitionCampaign:
  created.acquisitionCampaign,

acquisitionContent:
  created.acquisitionContent,

acquisitionTerm:
  created.acquisitionTerm,

landingPath:
  created.landingPath,

referrer:
  created.referrer,
  
  });
} catch (err) {
  console.error(
    "[brand-apply] Klaviyo event failed",
    err
  );
}

    const resendKey = process.env.RESEND_API_KEY;
    const to = process.env.BRAND_APPLY_NOTIFY_TO; // your inbox
    const from = process.env.BRAND_APPLY_FROM || "onboarding@veiloraclub.com";
    const replyTo = process.env.BRAND_APPLY_REPLY_TO || "info@veiloraclub.com";

    if (resendKey) {
      const resend = new Resend(resendKey);

      // 1) Notify you (only if BRAND_APPLY_NOTIFY_TO is set)
      if (to) {
        const hostedDisplay =
          created.platformHosted === "OTHER"
            ? `OTHER — ${created.platformHostedOther ?? ""}`.trim()
            : String(created.platformHosted ?? "-");

        await resend.emails.send({
          from,
          to,
          replyTo,
          subject: `New Brand Apply – ${created.companyName || `${created.firstName} ${created.lastName}`}`,
          html: `
            <div style="font-family:ui-sans-serif,system-ui; line-height:1.5">
              <h2 style="margin:0 0 12px">New Brand Application</h2>

              <p><strong>Company:</strong> ${escapeHtml(created.companyName ?? "-")}</p>
              <p><strong>Hosted on:</strong> ${escapeHtml(hostedDisplay || "-")}</p>

              <p><strong>Contact:</strong> ${escapeHtml(created.firstName)} ${escapeHtml(created.lastName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(created.email)}</p>

              <p><strong>Location:</strong> ${escapeHtml(created.city ?? "-")}, ${escapeHtml(created.countryCode ?? "-")}</p>
              <p><strong>Phone:</strong> ${escapeHtml(created.phone ?? "-")}</p>
              <p><strong>Website:</strong> ${escapeHtml(created.website ?? "-")}</p>
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

    }

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    // In prod, keep message generic. In dev, expose Zod issues for faster debugging.
    const isZod = e?.name === "ZodError";
    const dev = process.env.NODE_ENV !== "production";

    return NextResponse.json(
      {
        ok: false,
        error: isZod ? "Please check the form fields and try again." : e?.message ?? "Unexpected error",
        ...(dev && isZod ? { issues: e.issues } : {}),
      },
      { status: 400 }
    );
  }
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
