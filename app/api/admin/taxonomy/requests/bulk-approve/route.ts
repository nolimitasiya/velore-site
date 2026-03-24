import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { ProductType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { adminId } = await requireAdminSession();

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const productTypesById: Record<string, string[]> =
      body?.productTypesById && typeof body.productTypesById === "object" ? body.productTypesById : {};

    if (!ids.length) {
      return NextResponse.json({ ok: false, error: "No ids provided" }, { status: 400 });
    }

    const requests = await prisma.taxonomyRequest.findMany({
      where: { id: { in: ids }, status: "PENDING" },
      select: { id: true, type: true, name: true, slug: true },
    });

    await prisma.$transaction(async (tx) => {
      for (const tr of requests) {
        if (tr.type === "COLOUR") {
          await tx.colour.upsert({
            where: { slug: tr.slug },
            update: { name: tr.name },
            create: { slug: tr.slug, name: tr.name },
          });
        } else if (tr.type === "SIZE") {
          await tx.size.upsert({
            where: { slug: tr.slug },
            update: { name: tr.name },
            create: { slug: tr.slug, name: tr.name },
          });
        } else if (tr.type === "MATERIAL") {
          const mat = await tx.material.upsert({
            where: { slug: tr.slug },
            update: { name: tr.name },
            create: { slug: tr.slug, name: tr.name },
            select: { id: true },
          });

          const ptsRaw = Array.isArray(productTypesById[tr.id]) ? productTypesById[tr.id] : [];

// keep only valid enum values
const pts = ptsRaw.filter((x): x is ProductType =>
  (Object.values(ProductType) as string[]).includes(x)
);

if (pts.length) {
  await tx.materialAllowedProductType.createMany({
    data: pts.map((pt) => ({ materialId: mat.id, productType: pt })),
    skipDuplicates: true,
  });
}
        }
      }

      await tx.taxonomyRequest.updateMany({
        where: { id: { in: requests.map((r) => r.id) } },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedByAdminId: adminId,
        },
      });
    });

    return NextResponse.json({ ok: true, approved: requests.length });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to bulk approve" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}