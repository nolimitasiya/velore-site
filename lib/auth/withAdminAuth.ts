import "server-only";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export function withAdminAuth<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      await requireAdminSession();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(...args);
  };
}