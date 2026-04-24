import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { uploadStyleFeedImage } from "@/lib/storage/styleFeed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 6 * 1024 * 1024;
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 1500;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function getImageDimensions(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const { imageSize } = await import("image-size");
  const result = imageSize(buffer);

  return {
    width: result.width || 0,
    height: result.height || 0,
  };
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "File is required." }, { status: 400 });
    }

    

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Only JPG, PNG and WebP files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "Image must be 6MB or smaller." },
        { status: 400 }
      );
    }

    const { width, height } = await getImageDimensions(file);

    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      return NextResponse.json(
        {
          ok: false,
          error: `Image must be at least ${MIN_WIDTH}x${MIN_HEIGHT}.`,
        },
        { status: 400 }
      );
    }

    const uploaded = await uploadStyleFeedImage({ file });

    return NextResponse.json({
      ok: true,
      imageUrl: uploaded.imageUrl,
      imagePath: uploaded.imagePath,
      imageWidth: width,
      imageHeight: height,
      imageFocalX: 50,
      imageFocalY: 50,
    });
  } catch (error) {
    console.error("POST /api/admin/upload/style-feed failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Upload failed.",
      },
      { status: 500 }
    );
  }
}