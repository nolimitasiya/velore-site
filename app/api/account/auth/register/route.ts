import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendShopperWelcomeEmail } from "@/lib/email/sendShopperWelcomeEmail";

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.shopper.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const shopper = await prisma.shopper.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashed,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
      },
    });

    // Fire welcome email — non-blocking, don't fail registration if email fails
    sendShopperWelcomeEmail({
      to: shopper.email,
      firstName: shopper.firstName,
    }).catch((err) => console.error("[welcome-email]", err));

    const res = NextResponse.json({ ok: true, shopperId: shopper.id });
    res.cookies.set("shopper_authed", shopper.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}