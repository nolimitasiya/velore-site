import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { processOneNewsletterWelcomeEvent } from "@/lib/marketing/processNewsletterWelcomeEvent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_EVENTS_PER_RUN = 5;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[newsletter-welcome-cron] CRON_SECRET is not configured"
    );

    return NextResponse.json(
      { error: "Cron configuration error." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    console.warn(
      "[newsletter-welcome-cron] Unauthorized request rejected"
    );

    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  if (process.env.NEWSLETTER_WELCOME_WORKER_ENABLED !== "true") {
    return NextResponse.json({
      ok: true,
      enabled: false,
      message: "Newsletter welcome delivery is not enabled.",
    });
  }

  const results = {
    examined: 0,
    sent: 0,
    cancelled: 0,
    unknown: 0,
    conflicts: 0,
    stopped: false,
  };

  try {
    for (let index = 0; index < MAX_EVENTS_PER_RUN; index++) {
      const result = await processOneNewsletterWelcomeEvent(prisma, {
        enableProviderSubmission: true,
      });

      if (result.status === "EMPTY") {
        results.stopped = true;
        break;
      }

      results.examined++;

      switch (result.status) {
        case "SENT":
          results.sent++;
          break;

        case "CANCELLED":
          results.cancelled++;
          break;

        case "UNKNOWN":
          results.unknown++;
          break;

        case "CONFLICT":
          results.conflicts++;
          break;

        default:
          throw new Error(
            "Unexpected newsletter welcome worker result."
          );
      }
    }

    console.log(
      "[newsletter-welcome-cron] Run completed",
      results
    );

    return NextResponse.json({
      ok: true,
      enabled: true,
      ...results,
    });
  } catch {
    console.error(
      "[newsletter-welcome-cron] Worker execution failed"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Newsletter welcome processing failed.",
      },
      { status: 500 }
    );
  }
}