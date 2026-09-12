import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncWaitlistSubscriberToKlaviyo } from "@/lib/klaviyo/waitlist";

export const runtime = "nodejs";


function capitaliseName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayName(rawName: string, email: string) {
  const n = (rawName || "").trim();

  if (!n || n.includes("@")) {
    const local = (email.split("@")[0] || "there")
      .replace(/[._-]+/g, " ")
      .trim();

    return local ? capitaliseName(local) : "There";
  }

  return capitaliseName(n);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const email = String(body.email || "").trim().toLowerCase();
  const rawName = String(body.name || "");

  if (!rawName.trim() || !email) {
    return NextResponse.json(
      { error: "Missing name or email" },
      { status: 400 }
    );
  }

  if (!email.includes("@")) {
    return NextResponse.json(
      { error: "Invalid email" },
      { status: 400 }
    );
  }

  const friendlyName = displayName(rawName, email);

  try {
    // Save subscriber in Veilora DB
    await prisma.waitlistSubscriber.upsert({
      where: { email },
      update: { name: friendlyName },
      create: { name: friendlyName, email },
    });

    // Sync subscriber to Klaviyo
    try {
      await syncWaitlistSubscriberToKlaviyo({
        email,
        name: friendlyName,
      });
    } catch (err) {
      console.error("[waitlist] Klaviyo sync failed", err);
    }

    

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[waitlist] DB error", e);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}