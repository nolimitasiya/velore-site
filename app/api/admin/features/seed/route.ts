import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// UK style: weeks start Monday
function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0 ... Sun=6
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function POST(req: Request) {
  await requireAdminSession();

  const body = await req.json().catch(() => ({}));
  const weeks = Math.min(Math.max(Number(body.weeks || 12), 4), 104);

  const now = new Date();
  let weekStart = startOfWeekMonday(now);

  // create (or keep) weekly slots for both features
  for (let i = 0; i < weeks; i++) {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);

    // TREND slot (capacity 1 per week)
    await prisma.featureSlot.upsert({
      where: {
        type_startDate: {
          type: "TREND_SPOTLIGHT",
          startDate: start,
        },
      },
      create: {
        type: "TREND_SPOTLIGHT",
        startDate: start,
        endDate: end,
        capacity: 1,
      },
      update: {
        // keep as-is (no overwrite). If you ever want to update capacity:
        // capacity: 1,
        // endDate: end,
      },
    });

    // STYLE FEED slot (capacity 2 packages per week, adjust if you want)
    await prisma.featureSlot.upsert({
      where: {
        type_startDate: {
          type: "STYLE_FEED",
          startDate: start,
        },
      },
      create: {
        type: "STYLE_FEED",
        startDate: start,
        endDate: end,
        capacity: 2,
      },
      update: {
        // same note as above
      },
    });

    // advance to next week
    weekStart.setDate(weekStart.getDate() + 7);
  }

  return NextResponse.json({ ok: true, weeksSeeded: weeks });
}
