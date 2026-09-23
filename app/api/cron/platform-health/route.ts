import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getPlatformHealthConfig,
} from "@/lib/platform-health/config";
import {
  runPlatformHealthBatch,
} from "@/lib/platform-health/runBatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest
) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[platform-health-cron] CRON_SECRET is not configured"
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
      "[platform-health-cron] Unauthorized request rejected"
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

  const {
    baseUrl,
    healthCheckSecret,
  } = getPlatformHealthConfig();

  if (
    !baseUrl ||
    !healthCheckSecret
  ) {
    console.error(
      "[platform-health-cron] Platform Health configuration is incomplete"
    );

    return NextResponse.json(
      {
        error:
          "Platform Health configuration error.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const result =
      await runPlatformHealthBatch({
        batchSize: 20,
        concurrency: 4,
        syncChecks: true,
        baseUrl,
        healthCheckSecret,
      });

    console.log(
      "[platform-health-cron] Run completed",
      {
        durationMs:
          result.durationMs,
        lockAcquired:
          result.lockAcquired,
        checksSelected:
          result.checksSelected,
        checksSucceeded:
          result.checksSucceeded,
        checksFailed:
          result.checksFailed,
        runStatus:
          result.runStatus,
      }
    );

    return NextResponse.json({
      ok: true,

      startedAt:
        result.startedAt,
      finishedAt:
        result.finishedAt,
      durationMs:
        result.durationMs,

      lockAcquired:
        result.lockAcquired,

      checksSelected:
        result.checksSelected,
      checksSucceeded:
        result.checksSucceeded,
      checksFailed:
        result.checksFailed,

      runId:
        result.runId,
      runStatus:
        result.runStatus,

      sync:
        result.sync,

      results:
        result.results,
    });
  } catch (error) {
    console.error(
      "[platform-health-cron] Run failed",
      error
    );

    return NextResponse.json(
      {
        error:
          "Platform Health run failed.",
      },
      {
        status: 500,
      }
    );
  }
}