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
    select: {
      id: true,
      name: true,
      billingEmail: true,
      stripeCustomerId: true,
      contractAcceptedAt: true,
      contractVersion: true,
    },
  });

  if (!brand) return NextResponse.json({ ok: false, error: "Brand not found" }, { status: 404 });

  // hard gate: must accept contract first
  if (!brand.contractAcceptedAt) {
    return NextResponse.json({ ok: false, error: "CONTRACT_NOT_ACCEPTED" }, { status: 400 });
  }

  const priceId = process.env.STRIPE_PRICE_SUBSCRIPTION_GBP;
  if (!priceId) throw new Error("Missing STRIPE_PRICE_SUBSCRIPTION_GBP");

  const taxRate = process.env.STRIPE_TAX_RATE_UK_VAT;

  const origin = req.headers.get("origin") || "http://localhost:3000";
  const successUrl = `${origin}/brand/billing?status=success`;
  const cancelUrl = `${origin}/brand/billing?status=cancel`;

  let customerId = brand.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: brand.name,
      email: brand.billingEmail || undefined,
      metadata: { brandId: brand.id },
    });
    customerId = customer.id;

    await prisma.brand.update({
      where: { id: brandId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
        tax_rates: taxRate ? [taxRate] : undefined,
      },
    ],
    subscription_data: {
      metadata: {
        brandId,
        contractVersion: brand.contractVersion || "v1",
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: false,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
