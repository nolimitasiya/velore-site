import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await requireAdminSession();

  const events = await prisma.adminCalendarEvent.findMany({
    orderBy: { date: "asc" },
  });

  const serialized = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    time: e.time ?? null,
    description: e.description ?? null,
    color: e.color,
  }));

  return <CalendarClient initialEvents={serialized} />;
}