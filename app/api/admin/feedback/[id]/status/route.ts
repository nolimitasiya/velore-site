import { NextRequest, NextResponse } from "next/server";
import { getTrustedSiteOrigin } from "@/lib/config/siteUrl";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ISSUE_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "RESOLVED",
  "DISMISSED",
] as const;

const IDEA_STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "IMPLEMENTED",
  "DISMISSED",
] as const;

type FeedbackStatus =
  | (typeof ISSUE_STATUSES)[number]
  | (typeof IDEA_STATUSES)[number];

function isValidStatus(
  type: "ISSUE" | "IDEA",
  status: unknown
): status is FeedbackStatus {
  if (typeof status !== "string") {
    return false;
  }

  const allowed: readonly string[] =
    type === "ISSUE" ? ISSUE_STATUSES : IDEA_STATUSES;

  return allowed.includes(status);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Require a same-origin browser request before processing mutations.
  const origin = request.headers.get("origin");

  let expectedOrigin: string;

  try {
    expectedOrigin = getTrustedSiteOrigin();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server configuration unavailable." },
      { status: 503 }
    );
  }

  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json(
      { ok: false, error: "Request origin not allowed." },
      { status: 403 }
    );
  }

  // Authenticate before reading or changing feedback.
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid feedback ID." },
        { status: 400 }
      );
    }

    const contentType =
      request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { ok: false, error: "Expected JSON." },
        { status: 415 }
      );
    }

    const body: unknown = await request.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("status" in body)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const requestedStatus = body.status;

    const feedback = await prisma.feedbackSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
      },
    });

    if (!feedback) {
      return NextResponse.json(
        { ok: false, error: "Feedback not found." },
        { status: 404 }
      );
    }

    if (!isValidStatus(feedback.type, requestedStatus)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid status for this feedback type.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.feedbackSubmission.update({
      where: { id },
      data: {
        status: requestedStatus,
      },
      select: {
        id: true,
        type: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      feedback: updated,
    });
  } catch {
    console.error("[admin-feedback] Status update failed");

    return NextResponse.json(
      { ok: false, error: "Unable to update feedback." },
      { status: 500 }
    );
  }
}