// C:\Users\Asiya\projects\dalra\app\api\currency\ecb\route.ts
import { NextResponse } from "next/server";
import { getEcbRates } from "@/lib/currency/rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rates = await getEcbRates();
  return NextResponse.json(
    { rates, at: Date.now() },
    {
      headers: {
        // browser cache short; server-side getEcbRates already caches 12h
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}
