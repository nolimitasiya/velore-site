import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runPlatformHealthHistoryMaintenance,
} from "@/lib/platform-health/history/runHistoryMaintenance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(
  request: NextRequest
) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[platform-health-history-cron] CRON_SECRET is not configured"
    );

    return NextResponse.json(
      {
        error:
          "Cron configuration error.",
      },
      {
        status: 500,
      }
    );
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    authorization !==
    `Bearer ${cronSecret}`
  ) {
    console.warn(
      "[platform-health-history-cron] Unauthorized request rejected"
    );

    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const result =
      await runPlatformHealthHistoryMaintenance();

    if (!result.acquired) {
      console.log(
        "[platform-health-history-cron] Maintenance skipped because lock is already held"
      );

      return NextResponse.json({
        ok: true,
        skipped: true,
        reason:
          result.reason ??
          "HISTORY_LOCK_NOT_ACQUIRED",
      });
    }

    console.log(
      "[platform-health-history-cron] Maintenance completed",
      {
        hourly: result.hourly,
        daily: result.daily,
        retention: result.retention,
      }
    );

    return NextResponse.json({
      ok: true,
      skipped: false,
      now: result.now,
      hourly: result.hourly,
      daily: result.daily,
      retention: result.retention,
    });
  } catch (error) {
    console.error(
      "[platform-health-history-cron] Maintenance failed",
      error
    );

    return NextResponse.json(
      {
        error:
          "Platform Health history maintenance failed.",
      },
      {
        status: 500,
      }
    );
  }
}