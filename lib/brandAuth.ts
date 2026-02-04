import { cookies } from "next/headers";

export async function requireBrandSession() {
  // ✅ In your Next version, cookies() is async
  const cookieStore = await cookies();

  const userId = cookieStore.get("brand_authed")?.value || null;
  const companyId = cookieStore.get("brand_company_id")?.value || null;

  if (!userId || !companyId) {
    throw new Error("UNAUTHENTICATED");
  }

  return { userId, companyId };
}
