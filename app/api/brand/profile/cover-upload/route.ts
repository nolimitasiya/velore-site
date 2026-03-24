import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "");
}

export async function POST(req: Request) {
  try {
    const { brandId } = await requireBrandContext();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Please upload a JPG, PNG, or WEBP image." },
        { status: 400 }
      );
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { ok: false, error: "Image must be smaller than 10MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = sanitizeFileName(file.name || "cover-image");
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "jpg";
    const path = `${brandId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("brand-covers")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: uploadError.message || "Upload failed." },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("brand-covers")
      .getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      url: publicUrlData.publicUrl,
      path,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to upload cover image." },
      { status: 500 }
    );
  }
}