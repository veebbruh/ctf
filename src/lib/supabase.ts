import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

/** True if Supabase env vars are set and client is available. */
export function isSupabaseConfigured(): boolean {
  return supabase != null;
}

/** Get Supabase client. Throws if env vars are missing. */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

/** Test Supabase connection and API key by running a simple query. */
export async function testSupabaseConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const { error } = await client.from("challenges").select("id").limit(1);
    if (error) {
      const { error: e2 } = await client.from("leaderboard").select("id").limit(1);
      if (e2) return { ok: false, error: error.message || e2.message };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export { supabase };
