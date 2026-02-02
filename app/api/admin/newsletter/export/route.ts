import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function csvEscape(v: string) {
  const s = String(v ?? "");
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const subs = await prisma.newsletterSubscriber.findMany({
    where: { status: "subscribed" },
    orderBy: { createdAt: "desc" },
    select: { email: true, source: true, createdAt: true },
  });

  const header = ["email", "source", "createdAt"].join(",");
  const rows = subs.map((s) =>
    [s.email, s.source ?? "", s.createdAt.toISOString()].map(csvEscape).join(",")
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="veilora-newsletter-subscribers.csv"`,
    },
  });
}
