import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";
import { processCatalogueHealthTarget } from "@/lib/catalogue-health/processTarget";
import { syncCatalogueHealthTarget } from "@/lib/catalogue-health/syncTargets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      targetId: string;
    }>;
  }
) {
  await requireAdminSession();

  const { targetId } = await context.params;

  const target = await prisma.catalogueHealthTarget.findUnique({
    where: {
      id: targetId,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!target) {
    return NextResponse.json(
      {
        ok: false,
        error: "Catalogue health target not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (!target.isActive) {
    return NextResponse.json(
      {
        ok: false,
        error: "This monitoring target is retired.",
      },
      {
        status: 409,
      }
    );
  }

  try {
    const syncResult =
  await syncCatalogueHealthTarget(target.id);

if (syncResult.outcome === "TARGET_NOT_FOUND") {
  return NextResponse.json(
    {
      ok: false,
      error: "Catalogue health target not found.",
    },
    {
      status: 404,
    }
  );
}

if (syncResult.outcome === "SOURCE_REMOVED") {
  return NextResponse.json(
    {
      ok: false,
      error:
        "The catalogue resource for this monitoring target no longer exists.",
    },
    {
      status: 409,
    }
  );
}

const result =
  await processCatalogueHealthTarget(target.id);

return NextResponse.json({
  ok: true,
  sync: syncResult,
  result,
});

  } catch (error) {
    console.error("[catalogue-health] manual recheck failed", {
      targetId,
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Catalogue health recheck failed.",
      },
      {
        status: 500,
      }
    );
  }
}