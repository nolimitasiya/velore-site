// lib/auth/BrandSession.ts
import { cookies } from "next/headers";

export async function requireBrandSession(): Promise<{
  userId: string;
  brandId: string;
}> {
  const jar = await cookies(); // 👈 THIS is the fix

  const userId = jar.get("brand_authed")?.value ?? null;
  const brandId = jar.get("brand_id")?.value ?? null;

  if (!userId || !brandId) {
    throw new Error("UNAUTHENTICATED");
  }

  return {
    userId: String(userId),
    brandId: String(brandId),
  };
}
