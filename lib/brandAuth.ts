import "server-only";

import { requireBrandContext } from "@/lib/auth/BrandSession";

/**
 * Compatibility wrapper for existing imports.
 * Authentication and brand membership are validated centrally.
 */
export async function requireBrandSession(): Promise<{
  userId: string;
  brandId: string;
}> {
  return requireBrandContext();
}