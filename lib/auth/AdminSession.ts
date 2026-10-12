import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/adminDbSession";

export async function requireAdminSession(): Promise<{
  adminId: string;
  admin: {
    id: string;
    lastSeenWaitlistAt: Date | null;
    lastSeenApplicationsAt: Date | null;
  };
}> {
  const jar = await cookies();
  const token = jar.get("admin_authed")?.value;

  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  const session = await getAdminSession(token);

  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.adminId },
    select: {
      id: true,
      lastSeenWaitlistAt: true,
      lastSeenApplicationsAt: true,
    },
  });

  if (!admin) {
    throw new Error("UNAUTHENTICATED");
  }

  return { adminId: admin.id, admin };
}