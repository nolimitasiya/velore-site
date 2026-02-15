import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function buffer(readable: ReadableStream<Uint8Array>) {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = (await headers()).get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whsec) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const rawBody = await buffer(req.body as any);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whsec);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }

  /* ======================================================
     CHECKOUT COMPLETED (SUBSCRIPTION OR ONE-OFF PAYMENT)
  ====================================================== */

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    /* -----------------------------
       SUBSCRIPTION STARTED
    ----------------------------- */

    if (session.mode === "subscription") {
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? "";

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? "";

      const sub = (await stripe.subscriptions.retrieve(
        subscriptionId
      )) as Stripe.Subscription;

      const brandId =
        sub.metadata?.brandId || session.metadata?.brandId;

      if (brandId) {
        const periodEnd =
          sub.items?.data?.[0]?.current_period_end;

        await prisma.brand.update({
          where: { id: brandId },
          data: {
            stripeCustomerId: customerId || undefined,
            stripeSubscriptionId: subscriptionId || undefined,
            stripeSubscriptionStatus: sub.status,
            currentPeriodEnd: periodEnd
              ? new Date(periodEnd * 1000)
              : undefined,
            accountStatus:
              sub.status === "active" ? "ACTIVE" : "PENDING",
          },
        });
      }
    }

    /* -----------------------------
       ONE-TIME FEATURE PAYMENT
    ----------------------------- */

    if (session.mode === "payment") {
      const bookingId = session.metadata?.featureBookingId;

      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? "";

      if (bookingId) {
        await prisma.featureBooking.update({
          where: { id: bookingId },
          data: {
            status: "PAID",
            stripePaymentIntentId: paymentIntent || undefined,
          },
        });

        const booking = await prisma.featureBooking.findUnique({
          where: { id: bookingId },
          select: { slotId: true },
        });

        if (booking?.slotId) {
          await prisma.featureSlot.update({
            where: { id: booking.slotId },
            data: { bookedCount: { increment: 1 } },
          });
        }
      }
    }
  }

  /* ======================================================
     INVOICE PAID
  ====================================================== */

  if (event.type === "invoice.payment_succeeded") {
  const invoice = event.data.object as Stripe.Invoice;

  const subscriptionId =
    typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : (invoice as any).subscription?.id ?? "";

  const customerId =
    typeof (invoice as any).customer === "string"
      ? (invoice as any).customer
      : (invoice as any).customer?.id ?? "";

  const brand = await prisma.brand.findFirst({
    where: {
      OR: [
        subscriptionId ? { stripeSubscriptionId: subscriptionId } : undefined,
        customerId ? { stripeCustomerId: customerId } : undefined,
      ].filter(Boolean) as any,
    },
    select: { id: true },
  });

  if (brand) {
    await prisma.brand.update({
      where: { id: brand.id },
      data: {
        stripeSubscriptionStatus: invoice.status || "paid",
        lastInvoiceId: invoice.id,
        lastInvoiceStatus: invoice.status || undefined,
        accountStatus: "ACTIVE",
        pastDueSince: null,
      },
    });
  }
}

  /* ======================================================
     INVOICE FAILED
  ====================================================== */


if (event.type === "invoice.payment_failed") {
  const invoice = event.data.object as Stripe.Invoice;

  const subscriptionId =
    typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : (invoice as any).subscription?.id ?? "";

  const customerId =
    typeof (invoice as any).customer === "string"
      ? (invoice as any).customer
      : (invoice as any).customer?.id ?? "";

  const brand = await prisma.brand.findFirst({
    where: {
      OR: [
        subscriptionId ? { stripeSubscriptionId: subscriptionId } : undefined,
        customerId ? { stripeCustomerId: customerId } : undefined,
      ].filter(Boolean) as any,
    },
    select: { id: true, pastDueSince: true },
  });

  if (brand) {
    await prisma.brand.update({
      where: { id: brand.id },
      data: {
        stripeSubscriptionStatus: "past_due",
        lastInvoiceId: invoice.id,
        lastInvoiceStatus: invoice.status || undefined,
        pastDueSince: brand.pastDueSince ?? new Date(),
      },
    });
  }
}



  /* ======================================================
     SUBSCRIPTION CANCELLED
  ====================================================== */

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const brandId = sub.metadata?.brandId;

    if (brandId) {
      await prisma.brand.update({
        where: { id: brandId },
        data: {
          stripeSubscriptionStatus: "canceled",
          accountStatus: "TERMINATED",
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
