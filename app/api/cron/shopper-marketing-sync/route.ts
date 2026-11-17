import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { processOneShopperMarketingSync } from "@/lib/marketing/processShopperMarketingSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[shopper-marketing-sync] CRON_SECRET is not configured"
    );

    return NextResponse.json(
      { error: "Cron configuration error." },
      { status: 500 }
    );
  }

  if (
    request.headers.get("authorization") !==
    `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  if (
    process.env.SHOPPER_MARKETING_SYNC_WORKER_ENABLED !==
    "true"
  ) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      message: "Shopper marketing synchronisation is disabled.",
    });
  }

  try {
    const providerSubmissionEnabled =
      process.env.SHOPPER_MARKETING_PROVIDER_SUBMISSION_ENABLED ===
      "true";

    const result = await processOneShopperMarketingSync(
      prisma,
      {
        enableProviderSubmission: providerSubmissionEnabled,
      }
    );

    return NextResponse.json({
      ok: true,
      enabled: true,
      providerSubmissionEnabled,
      result,
    });
  } catch {
    console.error(
      "[shopper-marketing-sync] Worker execution failed"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Shopper marketing synchronisation failed.",
      },
      { status: 500 }
    );
  }
}
