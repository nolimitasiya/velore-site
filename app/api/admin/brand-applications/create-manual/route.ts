import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORM = ["SHOPIFY", "GODADDY", "WIX", "OTHER"] as const;

const trimToNull = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

const schema = z.object({
  firstName: z.string().min(1).max(80).transform((s) => s.trim()),
  lastName: z.string().min(1).max(80).transform((s) => s.trim()),
  email: z.string().email().max(200).transform((s) => s.trim().toLowerCase()),
  phone: z.string().max(60).optional().or(z.literal("")).transform(trimToNull),

  companyName: z.string().min(1).max(160).transform((s) => s.trim()),
  website: z.string().max(300).optional().or(z.literal("")).transform(trimToNull),

  countryCode: z.string().length(2).transform((s) => s.trim().toUpperCase()),
  city: z.string().min(1).max(120).transform((s) => s.trim()),

  platformHosted: z.enum(PLATFORM),
  platformHostedOther: z.string().max(120).optional().nullable().transform(trimToNull),

  socialMedia: z.string().max(300).optional().or(z.literal("")).transform(trimToNull),
  notes: z.string().max(2000).optional().or(z.literal("")).transform(trimToNull),

  applicationSource: z
    .enum(["MANUAL", "INSTAGRAM_OUTREACH", "EMAIL_OUTREACH", "REFERRAL", "OTHER"])
    .default("MANUAL"),
});

export async function POST(req: Request) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);

    const created = await prisma.brandApplication.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,

        companyName: data.companyName,
        website: data.website,

        countryCode: data.countryCode,
        city: data.city,

        platformHosted: data.platformHosted,
        platformHostedOther:
          data.platformHosted === "OTHER"
            ? data.platformHostedOther
            : null,

        socialMedia: data.socialMedia,
        notes: data.notes,

        applicationSource: data.applicationSource,
        status: "contacted",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Failed to create manual brand application",
        issues: e?.issues,
      },
      { status: 400 },
    );
  }
}