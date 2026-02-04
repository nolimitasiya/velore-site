import { cookies } from "next/headers";

export async function requireBrandSession() {
  const jar = await cookies();

  const userId = jar.get("brand_authed")?.value ?? null;
  const brandId = jar.get("brand_id")?.value ?? null;

  if (!userId || !brandId) throw new Error("UNAUTHENTICATED");

  return { userId, brandId };
}
