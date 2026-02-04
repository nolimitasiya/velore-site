import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandSession } from "@/lib/brandAuth";

export async function GET() {
  try {
    const { companyId } = await requireBrandSession();

    const jobs = await prisma.importJob.findMany({
      where: {
        type: "brand_products",
        meta: { path: ["companyId"], equals: companyId } as any,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ ok: true, jobs });
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
