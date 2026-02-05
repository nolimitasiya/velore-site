import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function requireBrandSession(): Promise<{ userId: string }> {
  const jar = await cookies();
  const userId = jar.get("brand_authed")?.value ?? null;

  if (!userId) throw new Error("UNAUTHENTICATED");

  const ok = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!ok) throw new Error("UNAUTHENTICATED");

  return { userId };
}

export async function requireBrandContext(): Promise<{ userId: string; brandId: string }> {
  const jar = await cookies();

  const userId = jar.get("brand_authed")?.value ?? null;
  const brandId = jar.get("brand_id")?.value ?? null;

  if (!userId || !brandId) throw new Error("UNAUTHENTICATED");

  // Optional hard check (prevents cookie tampering)
  const ok = await prisma.brandMembership.findFirst({
    where: { userId, brandId },
    select: { id: true },
  });

  if (!ok) throw new Error("FORBIDDEN");

  return { userId, brandId };
}
