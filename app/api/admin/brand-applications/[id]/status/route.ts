// C:\Users\Asiya\projects\dalra\app\api\admin\brand-applications\[id]\status\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import {  syncBrandProfileToKlaviyo,  sendBrandLifecycleEventToKlaviyo,} from "@/lib/klaviyo/brandLifecycle";

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




export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const sendEmail = body.sendEmail !== false;
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
  lastName: true,

  companyName: true,
  phone: true,
  website: true,
  socialMedia: true,

  countryCode: true,
  city: true,

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
  data.contractSentAt = now;

  if (nextContractSentPath) {
    data.contractSentPath = nextContractSentPath;
  }
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

  

await prisma.brandApplicationActivity.create({
  data: {
    applicationId: id,
    type: "STATUS_CHANGED",
    message: `Status changed from ${prev} to ${status}`,
  },
});

try {
  await syncBrandProfileToKlaviyo({
    applicationId: current.id,
    firstName: current.firstName,
    lastName: current.lastName,
    email: current.email,

    companyName: current.companyName,
    phone: current.phone,
    website: current.website,
    socialMedia: current.socialMedia,

    countryCode: current.countryCode,
    city: current.city,

    stage: status,
  });

  console.log(
    "[brand-app status] Klaviyo profile synced",
    current.email,
    status
  );
} catch (e) {
  console.error(
    "[brand-app status] Klaviyo profile sync failed",
    e
  );
}

  // Emails (best-effort)
  // Emails (best-effort)
if (sendEmail) {
  try {
    if (status === "invited") {
      await sendBrandLifecycleEventToKlaviyo({
        eventName: "Brand Invited",

        applicationId: current.id,

        firstName: current.firstName,
        lastName: current.lastName,
        email: current.email,

        companyName: current.companyName,
        phone: current.phone,
        website: current.website,
        socialMedia: current.socialMedia,

        countryCode: current.countryCode,
        city: current.city,

        stage: "invited",

        schedulerUrl: safe(body.schedulerUrl) || undefined,
      });

      console.log(
        "[brand-app status] Klaviyo event accepted",
        "Brand Invited"
      );
    }

    if (status === "contract_sent") {
      await sendBrandLifecycleEventToKlaviyo({
        eventName: "Brand Contract Sent",

        applicationId: current.id,

        firstName: current.firstName,
        lastName: current.lastName,
        email: current.email,

        companyName: current.companyName,
        phone: current.phone,
        website: current.website,
        socialMedia: current.socialMedia,

        countryCode: current.countryCode,
        city: current.city,

        stage: "contract_sent",
      });

      console.log(
        "[brand-app status] Klaviyo event accepted",
        "Brand Contract Sent"
      );
    }

    if (status === "contract_signed") {
  await sendBrandLifecycleEventToKlaviyo({
    eventName: "Brand Contract Signed",

    applicationId: current.id,

    firstName: current.firstName,
    lastName: current.lastName,
    email: current.email,

    companyName: current.companyName,
    phone: current.phone,
    website: current.website,
    socialMedia: current.socialMedia,

    countryCode: current.countryCode,
    city: current.city,

    stage: "contract_signed",
  });

  console.log(
    "[brand-app status] Klaviyo event accepted",
    "Brand Contract Signed"
  );
}

if (status === "rejected") {
  await sendBrandLifecycleEventToKlaviyo({
    eventName: "Brand Rejected",

    applicationId: current.id,

    firstName: current.firstName,
    lastName: current.lastName,
    email: current.email,

    companyName: current.companyName,
    phone: current.phone,
    website: current.website,
    socialMedia: current.socialMedia,

    countryCode: current.countryCode,
    city: current.city,

    stage: "rejected",

    rejectionReason:
  safe(body.rejectionReason) ||
  "We're unable to move forward with your application at this stage.",
  });

  console.log(
    "[brand-app status] Klaviyo event accepted",
    "Brand Rejected"
  );
}

 
  } catch (e) {
    console.error(
  "[brand-app status] Klaviyo lifecycle event failed",
  e
);
  }
}


  return NextResponse.json({ ok: true, application: updated });
}
