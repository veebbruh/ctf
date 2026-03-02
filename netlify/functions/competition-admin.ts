import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const COMPETITION_CONFIG_KEY = "default";

/** Get authoritative UTC "now" from timezone API so all clients share the same clock. */
async function getAuthoritativeUtcIso(): Promise<string> {
  const key = process.env.TIMEZONEDB_API_KEY;
  if (key) {
    try {
      const res = await fetch(
        `https://api.timezonedb.com/v2.1/get-time-zone?key=${encodeURIComponent(key)}&format=json&by=zone&zone=Etc/UTC`
      );
      if (res.ok) {
        const data = (await res.json()) as { status?: string; timestamp?: number; gmtOffset?: number };
        if (data.status === "OK" && typeof data.timestamp === "number") {
          const utcMs = (data.timestamp - (data.gmtOffset || 0)) * 1000;
          return new Date(utcMs).toISOString();
        }
      }
    } catch {
      // fall through to fallback
    }
  }
  try {
    const res = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC");
    if (res.ok) {
      const data = (await res.json()) as { datetime?: string; unixtime?: number };
      if (data.datetime) return data.datetime;
      if (typeof data.unixtime === "number") return new Date(data.unixtime * 1000).toISOString();
    }
  } catch {
    // fall through
  }
  return new Date().toISOString();
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for the competition admin backend.");
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
  }

  let action: "start" | "reset";
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    action = body.action === "reset" ? "reset" : "start";
  } catch {
    action = "start";
  }

  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (action === "reset") {
      const { error } = await supabase
        .from("competition_config")
        .update({ started_at: null, updated_at: now })
        .eq("key", COMPETITION_CONFIG_KEY);
      if (error) {
        return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true, action: "reset" }) };
    }

    // start: set started_at from timezone API (authoritative UTC so everyone shares same clock)
    const startedAt = await getAuthoritativeUtcIso();
    const { error } = await supabase
      .from("competition_config")
      .update({ started_at: startedAt, updated_at: now })
      .eq("key", COMPETITION_CONFIG_KEY);
    if (error) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, action: "start", started_at: startedAt }),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: message }) };
  }
};
