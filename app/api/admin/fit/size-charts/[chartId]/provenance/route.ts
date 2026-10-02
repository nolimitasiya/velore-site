import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ chartId: string }>;
  }
) {
  await requireAdminSession();

  const { chartId } = await params;

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 }
    );
  }

  const sourceUrl =
    typeof body.sourceUrl === "string"
      ? body.sourceUrl.trim()
      : "";

  const sourceNotes =
    typeof body.sourceNotes === "string"
      ? body.sourceNotes.trim()
      : "";

  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Enter a valid http or https source URL.",
        },
        { status: 400 }
      );
    }
  }

  let lastVerifiedAt: Date | null = null;

  if (
    typeof body.lastVerifiedAt === "string" &&
    body.lastVerifiedAt.trim()
  ) {
    const parsedDate = new Date(
      `${body.lastVerifiedAt.trim()}T12:00:00.000Z`
    );

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        {
          ok: false,
          error: "Enter a valid verification date.",
        },
        { status: 400 }
      );
    }

    lastVerifiedAt = parsedDate;
  }

  const existingChart =
    await prisma.brandSizeChart.findUnique({
      where: {
        id: chartId,
      },
      select: {
        id: true,
      },
    });

  if (!existingChart) {
    return NextResponse.json(
      {
        ok: false,
        error: "Size chart not found.",
      },
      { status: 404 }
    );
  }

  await prisma.brandSizeChart.update({
    where: {
      id: chartId,
    },
    data: {
      sourceUrl: sourceUrl || null,
      sourceNotes: sourceNotes || null,
      lastVerifiedAt,
    },
  });

  return NextResponse.json({
    ok: true,
  });
}