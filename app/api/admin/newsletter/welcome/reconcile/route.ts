import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { getTrustedSiteOrigin } from "@/lib/config/siteUrl";
import { prisma } from "@/lib/prisma";
import {
  reconcileNewsletterWelcomeEvent,
} from "@/lib/marketing/reconcileNewsletterWelcomeEvent";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8192;

type ReconciliationBody = {
  eventId: string;
  evidenceReference: string;
  reason: string;
  providerMessageId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validText(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maximum
  );
}

function validProviderMessageId(value: unknown): value is string {
  return (
    validText(value, 500) &&
    !/\s/.test(value)
  );
}

function parseBody(value: unknown): ReconciliationBody | null {
  if (!isRecord(value)) return null;

  const allowedKeys = new Set([
    "eventId",
    "providerMessageId",
    "evidenceReference",
    "reason",
  ]);

  const keys = Object.keys(value);

  if (
    keys.length !== allowedKeys.size ||
    keys.some((key) => !allowedKeys.has(key))
  ) {
    return null;
  }

  if (
    !validText(value.eventId, 100) ||
    !validProviderMessageId(value.providerMessageId) ||
    !validText(value.evidenceReference, 500) ||
    !validText(value.reason, 2000)
  ) {
    return null;
  }

  return {
    eventId: value.eventId.trim(),
    providerMessageId: value.providerMessageId.trim(),
    evidenceReference: value.evidenceReference.trim(),
    reason: value.reason.trim(),
  };
}
export async function POST(request: NextRequest) {
  // Require the exact trusted site origin for admin mutations.
  let expectedOrigin: string;

  try {
    expectedOrigin = getTrustedSiteOrigin();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server configuration unavailable" },
      { status: 503 }
    );
  }

  const origin = request.headers.get("origin");

  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json(
      { ok: false, error: "Request origin not allowed" },
      { status: 403 }
    );
  }

  let adminId: string;

  try {
    const session = await requireAdminSession();
    adminId = session.adminId;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
      return NextResponse.json(
        { ok: false, error: "Expected JSON" },
        { status: 415 }
      );
    }

    const declaredLength = request.headers.get("content-length");

    if (
      declaredLength !== null &&
      Number(declaredLength) > MAX_BODY_BYTES
    ) {
      return NextResponse.json(
        { ok: false, error: "Request too large" },
        { status: 413 }
      );
    }

    // Read incrementally so an oversized body is never fully buffered.
    if (!request.body) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        totalBytes += value.byteLength;

        if (totalBytes > MAX_BODY_BYTES) {
          await reader.cancel().catch(() => undefined);

          return NextResponse.json(
            { ok: false, error: "Request too large" },
            { status: 413 }
          );
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const raw = Buffer.concat(chunks).toString("utf8");

    let decoded: unknown;

    try {
      decoded = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const body = parseBody(decoded);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid reconciliation request" },
        { status: 400 }
      );
    }

    const result = await reconcileNewsletterWelcomeEvent(prisma, {
      ...body,
      adminId,
    });

    if (result.outcome === "CONFLICT") {
      return NextResponse.json(
        { ok: false, error: "Event cannot be reconciled" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      outcome: result.outcome,
      status: result.status,
    });
  } catch (error) {
    console.error(
      "Newsletter welcome reconciliation failed",
      error instanceof Error ? error.name : "Unknown error"
    );

    return NextResponse.json(
      { ok: false, error: "Reconciliation failed" },
      { status: 500 }
    );
  }
}