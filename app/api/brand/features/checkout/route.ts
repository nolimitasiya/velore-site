import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { brandId } = await requireBrandContext();
  const stripe = getStripe();

  const body = await req.json();
  const slotId = String(body.slotId || "");
  if (!slotId) return NextResponse.json({ ok:false, error:"Missing slotId" }, { status: 400 });

  const slot = await prisma.featureSlot.findUnique({
    where: { id: slotId },
    select: { id:true, type:true, capacity:true, bookedCount:true, startDate:true, endDate:true },
  });
  if (!slot) return NextResponse.json({ ok:false, error:"Slot not found" }, { status: 404 });
  if (slot.bookedCount >= slot.capacity) return NextResponse.json({ ok:false, error:"Slot full" }, { status: 409 });

  // create a reserved booking (unique by brandId+slotId)
  const booking = await prisma.featureBooking.upsert({
    where: { brandId_slotId: { brandId, slotId } },
    update: { status: "RESERVED" },
    create: {
      brandId,
      slotId,
      type: slot.type,
      status: "RESERVED",
      currency: "GBP",
      payload: body.payload ?? undefined, // optional (selected products/posts)
    },
    select: { id: true, type: true },
  });

  const origin = req.headers.get("origin") || "http://localhost:3000";
  const successUrl = `${origin}/brand/features?paid=1`;
  const cancelUrl = `${origin}/brand/features?cancel=1`;

  const priceId =
    booking.type === "TREND_SPOTLIGHT"
      ? process.env.STRIPE_PRICE_TREND_WEEK_GBP
      : process.env.STRIPE_PRICE_STYLE_PACKAGE_GBP;

  if (!priceId) throw new Error("Missing feature price env var");

  const taxRate = process.env.STRIPE_TAX_RATE_UK_VAT;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      { price: priceId, quantity: 1, tax_rates: taxRate ? [taxRate] : undefined },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      brandId,
      featureBookingId: booking.id,
      featureType: booking.type,
      slotId,
    },
  });

  await prisma.featureBooking.update({
    where: { id: booking.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return NextResponse.json({ ok: true, url: session.url });
}
