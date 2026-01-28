import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Missing credentials" }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // cookie stores who is logged in
  res.cookies.set("admin_authed", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  console.log("Found user?", Boolean(user), user?.email);
  console.log("API DB:", (process.env.DIRECT_URL ?? process.env.DATABASE_URL)?.slice(0, 60));
  console.log("LOGIN email:", email);


  return res;
}
