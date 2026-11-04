import { NextRequest, NextResponse } from "next/server";
import { getTrustedSiteOrigin } from "@/lib/config/siteUrl";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getAuthenticatedShopper } from "@/lib/auth/ShopperSession";
import { classifyClientIp } from "@/lib/security/clientIpClassification";
import { hashRateLimitIp } from "@/lib/security/hashRateLimitIp";
import { parseFeedbackInput } from "@/lib/feedback/feedbackInput";
import { validateFeedbackPageUrl } from "@/lib/feedback/feedbackPageUrl";
import { createFeedbackSubmission } from "@/lib/feedback/createFeedbackSubmission";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Only accept submissions originating from our configured website.
    // Never derive the trusted origin from the incoming Host header.
    const trustedOrigin = getTrustedSiteOrigin();
    const requestOrigin = request.headers.get("origin");

    if (!requestOrigin || requestOrigin !== trustedOrigin) {
      return NextResponse.json(
        { error: "Feedback submissions must originate from Veilora Club." },
        { status: 403 }
      );
    }

    // Only accept JSON submissions.
const contentType = request.headers.get("content-type");

if (
  !contentType ||
  !/^application\/json(?:\s*;|$)/i.test(contentType)
) {
  return NextResponse.json(
    { error: "Content-Type must be application/json." },
    { status: 415 }
  );
}
    // Enforce a 10 KB request-body limit using actual bytes.
const MAX_FEEDBACK_BYTES = 10_000;

const contentLengthHeader = request.headers.get("content-length");

if (contentLengthHeader !== null) {
  const declaredLength = Number(contentLengthHeader);

  if (
    !Number.isSafeInteger(declaredLength) ||
    declaredLength < 0
  ) {
    return NextResponse.json(
      { error: "Invalid Content-Length header." },
      { status: 400 }
    );
  }

  if (declaredLength > MAX_FEEDBACK_BYTES) {
    return NextResponse.json(
      { error: "Feedback submission is too large." },
      { status: 413 }
    );
  }
}

// Read the request incrementally so an oversized body
// is rejected without buffering the entire payload.
const reader = request.body?.getReader();

if (!reader) {
  return NextResponse.json(
    { error: "Request body is required." },
    { status: 400 }
  );
}

const chunks: Uint8Array[] = [];
let totalBytes = 0;
let exceededLimit = false;

try {
  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    totalBytes += value.byteLength;

    if (totalBytes > MAX_FEEDBACK_BYTES) {
      exceededLimit = true;
      break;
    }

    chunks.push(value);
  }
} finally {
  if (exceededLimit) {
    await reader.cancel().catch(() => undefined);
  }

  reader.releaseLock();
}

if (exceededLimit) {
  return NextResponse.json(
    { error: "Feedback submission is too large." },
    { status: 413 }
  );
}

const bodyBytes = new Uint8Array(totalBytes);
let offset = 0;

for (const chunk of chunks) {
  bodyBytes.set(chunk, offset);
  offset += chunk.byteLength;
}

let bodyText: string;

try {
  bodyText = new TextDecoder("utf-8", {
    fatal: true,
  }).decode(bodyBytes);
} catch {
  return NextResponse.json(
    { error: "Request body must contain valid UTF-8." },
    { status: 400 }
  );
}
let body: unknown;

try {
  body = JSON.parse(bodyText);
} catch {
  return NextResponse.json(
    { error: "Invalid request body." },
    { status: 400 }
  );
}

const parsed = parseFeedbackInput(body);

if (!parsed.ok) {
  return NextResponse.json(
    { error: parsed.error },
    { status: 400 }
  );
}

const input = parsed.value;


    // Resolve shopper identity from the server-side session.
    const shopper = await getAuthenticatedShopper(request);

    // Used for guest deduplication without storing raw IP addresses.
    let guestIpHash: string | null = null;


    // Apply account-based limits to authenticated shoppers.
    if (shopper) {
      const limit = await rateLimit({
        key: `feedback:attempt:shopper:${shopper.id}`,
        limit: 30,
        windowMs: 60 * 60 * 1000,
      });

      if (!limit.ok) {
        return NextResponse.json(
          { error: "Too many submissions. Please try again later." },
          { status: 429 }
        );
      }
    } else {
      // Guest submissions require a trusted client IP.
      const clientIp = classifyClientIp(request);

      if (clientIp.status !== "TRUSTED") {
        return NextResponse.json(
          { error: "Guest feedback is temporarily unavailable." },
          { status: 403 }
        );
      }

    guestIpHash = hashRateLimitIp(clientIp.candidate);

const limit = await rateLimit({
  key: `feedback:attempt:guest:${guestIpHash}`,
  limit: 15,
  windowMs: 60 * 60 * 1000,
});

      if (!limit.ok) {
        return NextResponse.json(
          { error: "Too many submissions. Please try again later." },
          { status: 429 }
        );
      }
    }

    // Only trust a server-configured website origin.
    const validatedPage = validateFeedbackPageUrl(
        input.pageUrl,
        trustedOrigin
    );

    if (!validatedPage.ok) {
      return NextResponse.json(
        { error: validatedPage.error },
        { status: 400 }
      );
    }

    // Product information must come from the database.
   const product = input.productId
    ? await prisma.product.findFirst({
      where: {
        id: input.productId,
        isActive: true,
        publishedAt: {
          not: null,
        },
        status: "APPROVED",
        brand: {
          accountStatus: "ACTIVE",
          affiliateStatus: "ACTIVE",
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        sourceUrl: true,
        affiliateUrl: true,
        brand: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    })
  : null;

    if (input.productId && !product) {
      return NextResponse.json(
        { error: "The selected product could not be found." },
        { status: 400 }
      );
    }

    const productUrl = product
      ? `/${"b"}/${encodeURIComponent(product.brand.slug)}/p/${encodeURIComponent(product.slug)}`
      : null;

    const contactEmail = shopper
      ? shopper.email
      : input.contactEmail;

    const contactName = shopper
      ? [shopper.firstName, shopper.lastName]
          .filter(Boolean)
          .join(" ") || null
      : input.contactName;

const feedback = await createFeedbackSubmission({
  type: input.type,
  category: input.category,
  message: input.message,

  shopperId: shopper?.id ?? null,
  guestIpHash,

  contactEmail,
  contactName,
  // A valid shopper session does not prove email ownership.
// Until registration verification is implemented,
// never mark feedback contact emails as verified.
emailVerifiedBySession: false,

  productId: product?.id ?? null,
  productTitleSnapshot: product?.title ?? null,
  brandNameSnapshot: product?.brand.name ?? null,
  productUrlSnapshot: product
    ? product.affiliateUrl || product.sourceUrl
    : null,

  pageUrl: validatedPage.pageUrl ?? productUrl,
});

if (feedback.status === "RATE_LIMITED") {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(
      (feedback.retryAt.getTime() - Date.now()) / 1000
    )
  );

  return NextResponse.json(
    {
      error: "Too many submissions. Please try again later.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

    return NextResponse.json(
  {
    ok: true,
    feedbackId: feedback.id,
    duplicate: feedback.duplicate,
    message: feedback.duplicate
      ? "We've already received this feedback. Thank you!"
      : "Thank you! Your feedback has been received.",
  },
  { status: feedback.duplicate ? 200 : 201 }
);
  } catch (error) {
    console.error("Feedback submission failed:", error);

    return NextResponse.json(
      { error: "Unable to submit feedback. Please try again." },
      { status: 500 }
    );
  }
}