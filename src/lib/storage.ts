import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { MAX_PHOTO_BYTES, extForType, sniffImageType } from "./images";

const BUCKET = "listing-photos";

// Built lazily, on first real use — not at module load. This file gets pulled into a shared
// server chunk via actions.ts, so a module-scope createClient() call ran for every page
// (including unrelated ones like /_not-found) at build time, and threw the whole build over
// a missing env var that only this feature actually needs.
let supabase: SupabaseClient | null = null;
function getClient() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;
    if (!url || !key) throw new Error("Photo upload is not configured (missing Supabase env vars).");
    // Publishable key only — it can write/read the listing-photos bucket per the RLS
    // policies set up for it, nothing more. Never use a service_role key here.
    supabase = createClient(url, key);
  }
  return supabase;
}

// A problem with the file itself (shown to the user), as opposed to an infrastructure error.
export class PhotoError extends Error {}

// Validates (real image, size cap) and uploads. `folder` is a random id rather than the
// listing id, so photos can be uploaded before the listing row exists — a failed upload
// then never leaves a half-created listing behind.
export async function uploadListingPhoto(file: File, folder: string): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) throw new PhotoError(`"${file.name}" is larger than 5 MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw new PhotoError(`"${file.name}" is not a JPEG, PNG, WebP or GIF image.`);

  const path = `${folder}/${crypto.randomUUID()}.${extForType(type)}`;
  const client = getClient();
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, { contentType: type });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
