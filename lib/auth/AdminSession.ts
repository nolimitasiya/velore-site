import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function requireAdminSession(): Promise<{ adminId: string }> {
  const jar = await cookies(); // ✅ await (cookies is async in your Next version)
  const adminId = jar.get("admin_authed")?.value ?? null;

  if (!adminId) throw new Error("UNAUTHENTICATED");

  const ok = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true },
  });

  if (!ok) throw new Error("UNAUTHENTICATED");
  return { adminId };
}
