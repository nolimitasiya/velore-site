import type { ReactNode } from "react";
import SiteShell from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import AdminTopBar from "@/components/admin/AdminTopBar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { admin } = await requireAdminSession();
  const lastSeen = admin.lastSeenWaitlistAt ?? new Date(0);
  const unseenWaitlistCount = await prisma.waitlistSubscriber.count({
  where: { createdAt: { gt: admin.lastSeenWaitlistAt ?? new Date(0) } },
});

const unseenApplicationsCount = await prisma.brandApplication.count({
  where: { createdAt: { gt: admin.lastSeenApplicationsAt ?? new Date(0) } },
});

  return (
    <SiteShell>
      <div className="min-h-screen bg-white">
        <header className="border-b">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <AdminTopBar
  unseenWaitlistCount={unseenWaitlistCount}
  unseenApplicationsCount={unseenApplicationsCount}
/>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      </div>
    </SiteShell>
  );
}