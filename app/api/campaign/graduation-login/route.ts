import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "graduation_campaign_authed";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    const expectedPassword =
      process.env.GRADUATION_CAMPAIGN_PASSWORD;

    if (!expectedPassword) {
      console.error(
        "GRADUATION_CAMPAIGN_PASSWORD is not configured"
      );

      return NextResponse.json(
        {
          ok: false,
          message: "Campaign access is not configured.",
        },
        { status: 500 }
      );
    }

    if (password !== expectedPassword) {
      return NextResponse.json(
        {
          ok: false,
          message: "Incorrect password.",
        },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      ok: true,
    });

    res.cookies.set({
      name: COOKIE_NAME,
      value: "1",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return res;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Unable to sign in.",
      },
      { status: 400 }
    );
  }
}