import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getBrandSession } from "@/lib/auth/brandDbSession";

export async function requireBrandSession(): Promise<{ userId: string }> {
  const jar = await cookies();
  const token = jar.get("brand_authed")?.value;

  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  const session = await getBrandSession(token);

  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return { userId: user.id };
}

export async function requireBrandContext(): Promise<{
  userId: string;
  brandId: string;
}> {
  const { userId } = await requireBrandSession();

  const jar = await cookies();
  const brandId = jar.get("brand_id")?.value;

  if (!brandId) {
    throw new Error("UNAUTHENTICATED");
  }

  const membership = await prisma.brandMembership.findFirst({
    where: {
      userId,
      brandId,
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("FORBIDDEN");
  }

  return { userId, brandId };
}