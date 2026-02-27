import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function requireAdminSession(): Promise<{
  adminId: string;
  admin: { id: string; lastSeenWaitlistAt: Date | null; lastSeenApplicationsAt: Date | null };
}> {
  const jar = await cookies();
  const adminId = jar.get("admin_authed")?.value ?? null;

  if (!adminId) throw new Error("UNAUTHENTICATED");

  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, lastSeenWaitlistAt: true, lastSeenApplicationsAt: true },
  });

  if (!admin) throw new Error("UNAUTHENTICATED");

  return { adminId, admin };
}