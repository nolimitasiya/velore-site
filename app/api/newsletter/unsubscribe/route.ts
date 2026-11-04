import { NextResponse } from "next/server";
import { buildSiteUrl } from "@/lib/config/siteUrl";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  let unsubscribePageUrl: string;
  let unsubscribedPageUrl: string;

  try {
    unsubscribePageUrl = buildSiteUrl("/newsletter/unsubscribe");
    unsubscribedPageUrl = buildSiteUrl("/newsletter/unsubscribed");
  } catch {
    console.error("Newsletter unsubscribe URL configuration unavailable.");
    return new Response("Service temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!token) {
    return NextResponse.redirect(`${unsubscribedPageUrl}?status=missing`);
  }

  // ✅ Do NOT unsubscribe here.
  // ✅ Only redirect user to a page where they confirm.
  return NextResponse.redirect(
    `${unsubscribePageUrl}?token=${encodeURIComponent(token)}`
  );
}
