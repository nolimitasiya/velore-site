import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getAuthenticatedShopper } from "@/lib/auth/ShopperSession";

export async function GET(
  request: NextRequest
) {
  const shopper =
    await getAuthenticatedShopper(request);

  if (!shopper) {
    return NextResponse.json(
      {
        shopper: null,
      },
      {
        status: 401,
      }
    );
  }

  return NextResponse.json({
    shopper,
  });
}