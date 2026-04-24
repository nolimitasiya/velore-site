import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseOptionalDate(value: unknown) {
  if (value == null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseOptionalString(value: unknown) {
  const str = String(value ?? "").trim();
  return str ? str : null;
}

function parseOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseOptionalPosition(value: unknown) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) return null;
  return num;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await context.params;

    const existing = await prisma.collectionMerchItem.findUnique({
      where: { id },
      select: {
        id: true,
        pageKey: true,
        bucket: true,
        position: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Merch item not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);

    const note = body && "note" in body ? parseOptionalString(body.note) : undefined;
    const startsAt =
      body && "startsAt" in body ? parseOptionalDate(body.startsAt) : undefined;
    const endsAt =
      body && "endsAt" in body ? parseOptionalDate(body.endsAt) : undefined;
    const isActive =
      body && "isActive" in body ? parseOptionalBoolean(body.isActive) : undefined;
    const requestedPosition =
      body && "position" in body ? parseOptionalPosition(body.position) : undefined;

    if (
      startsAt !== undefined &&
      endsAt !== undefined &&
      startsAt &&
      endsAt &&
      startsAt > endsAt
    ) {
      return NextResponse.json(
        { error: "startsAt must be before endsAt." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (requestedPosition && requestedPosition !== existing.position) {
        const maxPositionItem = await tx.collectionMerchItem.findFirst({
          where: {
            pageKey: existing.pageKey,
            bucket: existing.bucket,
          },
          orderBy: { position: "desc" },
          select: { position: true },
        });

        const maxPosition = maxPositionItem?.position ?? 1;
        const safePosition = Math.min(requestedPosition, maxPosition);

        if (safePosition < existing.position) {
          await tx.collectionMerchItem.updateMany({
            where: {
              pageKey: existing.pageKey,
              bucket: existing.bucket,
              position: {
                gte: safePosition,
                lt: existing.position,
              },
            },
            data: {
              position: { increment: 1 },
            },
          });
        } else if (safePosition > existing.position) {
          await tx.collectionMerchItem.updateMany({
            where: {
              pageKey: existing.pageKey,
              bucket: existing.bucket,
              position: {
                gt: existing.position,
                lte: safePosition,
              },
            },
            data: {
              position: { decrement: 1 },
            },
          });
        }

        await tx.collectionMerchItem.update({
          where: { id },
          data: { position: safePosition },
        });
      }

      return tx.collectionMerchItem.update({
        where: { id },
        data: {
          ...(note !== undefined ? { note } : {}),
          ...(startsAt !== undefined ? { startsAt } : {}),
          ...(endsAt !== undefined ? { endsAt } : {}),
          ...(isActive !== undefined && isActive !== null ? { isActive } : {}),
        },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              price: true,
              currency: true,
              isActive: true,
              status: true,
              publishedAt: true,
              badges: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              images: {
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("PATCH /api/admin/merchandising/[id] failed", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That position is already taken." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update merchandising item." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await context.params;

    const existing = await prisma.collectionMerchItem.findUnique({
      where: { id },
      select: {
        id: true,
        pageKey: true,
        bucket: true,
        position: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Merch item not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.collectionMerchItem.delete({
        where: { id },
      });

      await tx.collectionMerchItem.updateMany({
        where: {
          pageKey: existing.pageKey,
          bucket: existing.bucket,
          position: {
            gt: existing.position,
          },
        },
        data: {
          position: { decrement: 1 },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/merchandising/[id] failed", error);
    return NextResponse.json(
      { error: "Failed to delete merchandising item." },
      { status: 500 }
    );
  }
}