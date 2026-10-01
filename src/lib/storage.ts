import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
    if (!url || !key) throw new Error("Photo upload isn't configured (missing Supabase env vars).");
    // Publishable key only — it can write/read the listing-photos bucket per the RLS
    // policies set up for it, nothing more. Never use a service_role key here.
    supabase = createClient(url, key);
  }
  return supabase;
}

export async function uploadListingPhoto(file: File, listingId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${listingId}/${crypto.randomUUID()}.${ext}`;

  const client = getClient();
  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
