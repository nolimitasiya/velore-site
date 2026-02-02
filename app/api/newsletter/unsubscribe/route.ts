import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.veiloraclub.com";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/newsletter/unsubscribed?status=missing`);
  }

  // ✅ Do NOT unsubscribe here.
  // ✅ Only redirect user to a page where they confirm.
  return NextResponse.redirect(
    `${baseUrl}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
  );
}
