import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const sortOrder = Number.isFinite(Number(body.sortOrder))
      ? Number(body.sortOrder)
      : 0;
    const isActive = Boolean(body.isActive);

    if (!name) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required." },
        { status: 400 }
      );
    }

    const continent = await prisma.continent.update({
      where: { id },
      data: {
        name,
        imageUrl,
        sortOrder,
        isActive,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        imageUrl: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return NextResponse.json({ continent });
  } catch (error) {
    console.error("Failed to update continent", error);
    return NextResponse.json(
      { error: "Failed to update continent." },
      { status: 500 }
    );
  }
}