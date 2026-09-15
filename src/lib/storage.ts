import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 3650;

/**
 * Uploads a file to a private bucket under the user's own folder and returns a
 * long-lived signed URL that can be stored in the database and shown publicly.
 */
export async function uploadImage(
  bucket: "avatars" | "project-images",
  userId: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("الملف المختار ليس صورة");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("حجم الصورة أكبر من 10 ميجابايت");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw new Error("تعذّر رفع الصورة، حاول مرة أخرى");

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
  if (error || !data?.signedUrl) throw new Error("تعذّر إنشاء رابط الصورة");

  return data.signedUrl;
}
