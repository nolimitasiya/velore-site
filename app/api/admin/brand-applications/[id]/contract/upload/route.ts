// C:\Users\Asiya\projects\dalra\app\api\admin\brand-applications\[id]\contract\upload\route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeKind(v: string | null) {
  const k = String(v || "").toLowerCase();
  if (k === "sent" || k === "signed") return k as "sent" | "signed";
  return null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const { searchParams } = new URL(req.url);
    const kind = safeKind(searchParams.get("kind"));
    if (!kind) {
      return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ ok: false, error: "Only PDF files allowed" }, { status: 400 });
    }

    // Build storage path
    const path = `brand-applications/${id}/contract-${kind}.pdf`;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin.storage.from("contracts").upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true, // allow re-upload
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
