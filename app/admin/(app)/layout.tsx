import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import AdminTopBar from "@/components/admin/AdminTopBar";
import AdminShell from "@/components/AdminShell";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAppLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal?: ReactNode;
}) {

  noStore();
  const { admin } = await requireAdminSession();

  const unseenWaitlistCount = await prisma.waitlistSubscriber.count({
    where: { createdAt: { gt: admin.lastSeenWaitlistAt ?? new Date(0) } },
  });

  const unseenApplicationsCount = await prisma.brandApplication.count({
    where: { createdAt: { gt: admin.lastSeenApplicationsAt ?? new Date(0) } },
  });

 return (
  <AdminShell fullWidth>
    <div className="flex min-h-screen bg-[#faf8f4]">
      <AdminTopBar
        unseenWaitlistCount={unseenWaitlistCount}
        unseenApplicationsCount={unseenApplicationsCount}
      />

      <main className="flex-1 overflow-y-auto px-8 py-8 bg-[#faf8f4]">
        {children}
      </main>

      {modal}
    </div>
  </AdminShell>
);
}