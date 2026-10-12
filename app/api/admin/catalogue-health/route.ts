import { NextResponse } from "next/server";

import { runCatalogueHealthBatch } from "@/lib/catalogue-health/runBatch";
import { withAdminAuth } from "@/lib/auth/withAdminAuth";

export const dynamic = "force-dynamic";

export const POST = withAdminAuth(async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "Catalogue Health manual test route is disabled in production.",
      },
      {
        status: 404,
      }
    );
  }

  try {
    const result = await runCatalogueHealthBatch({
      batchSize: 5,
      concurrency: 2,
      syncTargets: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[catalogue-health-test] Failed",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown Catalogue Health error",
      },
      {
        status: 500,
      }
    );
  }
});