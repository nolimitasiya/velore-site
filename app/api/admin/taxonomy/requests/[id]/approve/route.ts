import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { ProductType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing request id (bad route call)" },
        { status: 400 }
      );
    }

    const { adminId } = await requireAdminSession();

    const body = await req.json().catch(() => ({}));
    const bodyPTs: ProductType[] = Array.isArray(body?.productTypes)
      ? body.productTypes.filter((x: any): x is ProductType =>
          typeof x === "string" && Object.values(ProductType).includes(x as ProductType)
        )
      : [];

    const tr = await prisma.taxonomyRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        type: true,
        name: true,
        slug: true,
        productTypes: true,
      },
    });

    if (!tr) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (tr.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: "Request is not pending" },
        { status: 409 }
      );
    }

    if (tr.type === "COLOUR") {
      await prisma.colour.upsert({
        where: { slug: tr.slug },
        update: { name: tr.name },
        create: { slug: tr.slug, name: tr.name },
      });
    } else if (tr.type === "SIZE") {
      await prisma.size.upsert({
        where: { slug: tr.slug },
        update: { name: tr.name },
        create: { slug: tr.slug, name: tr.name },
      });
    } else if (tr.type === "MATERIAL") {
      const mat = await prisma.material.upsert({
        where: { slug: tr.slug },
        update: { name: tr.name },
        create: { slug: tr.slug, name: tr.name },
        select: { id: true },
      });

      const finalPTs: ProductType[] = bodyPTs.length ? bodyPTs : tr.productTypes;

      if (!finalPTs.length) {
        return NextResponse.json(
          { ok: false, error: "Material must have at least one product type" },
          { status: 400 }
        );
      }

      await prisma.materialAllowedProductType.createMany({
        data: finalPTs.map((pt) => ({
          materialId: mat.id,
          productType: pt,
        })),
        skipDuplicates: true,
      });
    } else {
      return NextResponse.json({ ok: false, error: "Unsupported type" }, { status: 400 });
    }

    await prisma.taxonomyRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByAdminId: adminId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to approve" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}