import { NextRequest, NextResponse } from "next/server";

import { runCatalogueHealthBatch } from "@/lib/catalogue-health/runBatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[catalogue-health-cron] CRON_SECRET is not configured"
    );

    return NextResponse.json(
      { error: "Cron configuration error." },
      { status: 500 }
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    console.warn(
      "[catalogue-health-cron] Unauthorized request rejected"
    );

    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const result = await runCatalogueHealthBatch({
      batchSize: 40,
      concurrency: 5,
      perDomainConcurrency: 2,
      syncTargets: true,
    });

    console.log(
      "[catalogue-health-cron] Run completed",
      {
        durationMs: result.durationMs,
        dueTargetsSelected:
          result.dueTargetsSelected,
        succeeded: result.succeeded,
        failed: result.failed,
        lockAcquired: result.lockAcquired,
        timings: result.timings,
      }
    );

    return NextResponse.json({
      ok: true,

      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      durationMs: result.durationMs,

      lockAcquired: result.lockAcquired,

      dueTargetsSelected:
        result.dueTargetsSelected,
      succeeded: result.succeeded,
      failed: result.failed,

      timings: result.timings,

      sync: result.sync,
    });
  } catch (error) {
    console.error(
      "[catalogue-health-cron] Run failed",
      error
    );

    return NextResponse.json(
      {
        error: "Catalogue Health run failed.",
      },
      { status: 500 }
    );
  }
}