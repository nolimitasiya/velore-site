import { NextResponse } from "next/server";
import { CatalogueHealthIssueStatus } from "@prisma/client";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action = "acknowledge" | "ignore";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      issueId: string;
    }>;
  }
) {
  await requireAdminSession();

  const { issueId } = await context.params;

  const body = await request.json().catch(() => null);
  const action = body?.action as Action | undefined;

  if (action !== "acknowledge" && action !== "ignore") {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid catalogue health issue action.",
      },
      { status: 400 }
    );
  }

  const issue = await prisma.catalogueHealthIssue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!issue) {
    return NextResponse.json(
      {
        ok: false,
        error: "Catalogue health issue not found.",
      },
      { status: 404 }
    );
  }

  const now = new Date();

  if (action === "acknowledge") {
    if (issue.status !== CatalogueHealthIssueStatus.OPEN) {
      return NextResponse.json(
        {
          ok: false,
          error: "Only open issues can be acknowledged.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.catalogueHealthIssue.update({
      where: { id: issue.id },
      data: {
        status: CatalogueHealthIssueStatus.ACKNOWLEDGED,
        acknowledgedAt: now,
      },
      select: {
        id: true,
        status: true,
        acknowledgedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      issue: updated,
    });
  }

  if (
    issue.status !== CatalogueHealthIssueStatus.OPEN &&
    issue.status !== CatalogueHealthIssueStatus.ACKNOWLEDGED
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Only active issues can be ignored.",
      },
      { status: 409 }
    );
  }

  const updated = await prisma.catalogueHealthIssue.update({
    where: { id: issue.id },
    data: {
      status: CatalogueHealthIssueStatus.IGNORED,
      ignoredAt: now,
    },
    select: {
      id: true,
      status: true,
      ignoredAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    issue: updated,
  });
}