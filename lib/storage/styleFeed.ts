import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = process.env.SUPABASE_STYLE_FEED_BUCKET || "public-media";

function extFromMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export async function uploadStyleFeedImage(args: {
  file: File;
}) {
  const ext = extFromMime(args.file.type);
  if (!ext) {
    throw new Error("Unsupported file type.");
  }

  const arrayBuffer = await args.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

const imagePath = `storefront/style-feed/${Date.now()}-${randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(imagePath, buffer, {
      contentType: args.file.type,
      upsert: false,
      cacheControl: "31536000",
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(imagePath);

  return {
    imagePath,
    imageUrl: data.publicUrl,
  };
}