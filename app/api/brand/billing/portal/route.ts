import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { brandId } = await requireBrandContext();
  const stripe = getStripe();

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { stripeCustomerId: true },
  });

  if (!brand?.stripeCustomerId) {
    return NextResponse.json({ ok: false, error: "NO_CUSTOMER" }, { status: 400 });
  }

  const origin = req.headers.get("origin") || "http://localhost:3000";
  const returnUrl = `${origin}/brand/billing`;

  const session = await stripe.billingPortal.sessions.create({
    customer: brand.stripeCustomerId,
    return_url: returnUrl,
    configuration: process.env.STRIPE_BILLING_PORTAL_CONFIG_ID || undefined,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
