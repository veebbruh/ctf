import { getSupabase, testSupabaseConnection } from "@/lib/supabase";
import type { Challenge } from "@/data/challenges";

const PLAYER_ID_KEY = "ctf_player_id";
const TEAM_USERNAME_KEY = "ctf_team_username";

/** Get or create a persistent player id for this browser. */
export function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

/** Get currently logged-in team username (from team_credentials), or null. */
export function getCurrentTeam(): string | null {
  return localStorage.getItem(TEAM_USERNAME_KEY);
}

/** Set current team after successful login. */
export function setCurrentTeam(teamUsername: string): void {
  localStorage.setItem(TEAM_USERNAME_KEY, teamUsername);
}

/** Clear team login (logout). */
export function clearCurrentTeam(): void {
  localStorage.removeItem(TEAM_USERNAME_KEY);
}

/** Identity used for leaderboard: team username if logged in, else browser player_id. */
export function getLeaderboardPlayerId(): string {
  return getCurrentTeam() ?? getPlayerId();
}

/** Display name for leaderboard: team name if logged in, else "You". */
export function getLeaderboardUsername(): string {
  return getCurrentTeam() ?? "You";
}

/** Escape % and _ for use in Supabase .ilike() so they are treated as literals. */
function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Verify team credentials against Supabase team_credentials. Returns team_username on success. Team name is matched case-insensitively. */
export async function verifyTeamLogin(
  teamUsername: string,
  password: string
): Promise<{ ok: true; team_username: string } | { ok: false; error: string }> {
  try {
    const client = getSupabase();
    const trimmed = teamUsername.trim();
    if (!trimmed) return { ok: false, error: "Enter team name and password." };
    const { data, error } = await client
      .from("team_credentials")
      .select("team_username, password")
      .ilike("team_username", escapeIlike(trimmed))
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data || data.password !== password.trim()) {
      return { ok: false, error: "Invalid team name or password." };
    }
    return { ok: true, team_username: data.team_username };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isConfigError = message.toLowerCase().includes("supabase") && message.toLowerCase().includes("configured");
    return {
      ok: false,
      error: isConfigError
        ? "Team login is temporarily unavailable. The event server may not be configured yet—please try again later or contact the organizer."
        : message,
    };
  }
}

/** Test Supabase connection. Call on app init or settings. */
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  return testSupabaseConnection();
}

/** Row shape from Supabase challenges table (snake_case). */
interface ChallengeRow {
  id: string;
  title: string;
  category: string;
  description: string;
  base_points: number;
  flag: string;
  hints: string[] | [string, string];
  hint_times: number[] | [number, number];
  file_url?: string | null;
}

function mapRowToChallenge(row: ChallengeRow): Challenge {
  const hints: [string, string] = Array.isArray(row.hints) && row.hints.length >= 2
    ? [row.hints[0], row.hints[1]]
    : ["", ""];
  const hintTimes: [number, number] = Array.isArray(row.hint_times) && row.hint_times.length >= 2
    ? [Number(row.hint_times[0]), Number(row.hint_times[1])]
    : [15 * 60000, 30 * 60000];
  return {
    id: row.id,
    title: row.title,
    category: row.category as Challenge["category"],
    description: row.description,
    basePoints: Number(row.base_points),
    flag: row.flag,
    hints,
    hintTimes,
    solved: false,
    fileUrl: row.file_url ?? undefined,
  };
}

/** Fetch challenges from Supabase. Returns [] on error or missing table. */
export async function fetchChallengesFromSupabase(): Promise<Challenge[]> {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from("challenges")
      .select("id, title, category, description, base_points, flag, hints, hint_times, file_url")
      .order("base_points", { ascending: true });

    if (error) {
      console.warn("Supabase challenges fetch failed:", error.message);
      return [];
    }
    if (!data?.length) return [];
    return data.map((row) => mapRowToChallenge(row as unknown as ChallengeRow));
  } catch (e) {
    console.warn("fetchChallengesFromSupabase error:", e);
    return [];
  }
}

/** Leaderboard row from Supabase (snake_case). */
export interface LeaderboardEntry {
  id?: string;
  player_id: string;
  username: string;
  score: number;
  solved_count: number;
  last_solve_time?: number | null;
  updated_at?: string;
}

/** Fetch leaderboard from Supabase. Returns [] on error. */
export async function fetchLeaderboardFromSupabase(): Promise<LeaderboardEntry[]> {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from("leaderboard")
      .select("id, player_id, username, score, solved_count, last_solve_time, updated_at")
      .order("score", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("Supabase leaderboard fetch failed:", error.message);
      return [];
    }
    return (data ?? []) as LeaderboardEntry[];
  } catch (e) {
    console.warn("fetchLeaderboardFromSupabase error:", e);
    return [];
  }
}

/** Competition config from Supabase (for shared timer). */
export interface CompetitionConfig {
  started_at: string | null;
  duration_seconds: number;
}

const COMPETITION_CONFIG_KEY = "default";

/** Fetch competition config (start time + duration). Returns null started_at and 3600 duration on error or when Supabase is not configured. */
export async function fetchCompetitionConfig(): Promise<CompetitionConfig> {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from("competition_config")
      .select("started_at, duration_seconds")
      .eq("key", COMPETITION_CONFIG_KEY)
      .maybeSingle();

    if (error || !data) {
      return { started_at: null, duration_seconds: 3600 };
    }
    return {
      started_at: (data as { started_at: string | null }).started_at ?? null,
      duration_seconds: Number((data as { duration_seconds: number }).duration_seconds) || 3600,
    };
  } catch {
    return { started_at: null, duration_seconds: 3600 };
  }
}

const COMPETITION_ADMIN_FN = "/.netlify/functions/competition-admin";

/** Get authoritative UTC "now" from timezone API so all clients share the same clock. Returns ISO string or null on failure. */
export async function getAuthoritativeUtcIso(): Promise<string | null> {
  const key = import.meta.env.VITE_TIMEZONEDB_API_KEY;
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
      // fall through
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
    // ignore
  }
  return null;
}

/** Call backend to start timer (server sets authoritative time). Use this first; fall back to setCompetitionStartTime() if backend is unavailable. */
export async function callCompetitionStartBackend(): Promise<{ ok: boolean; error?: string; started_at?: string }> {
  try {
    const res = await fetch(COMPETITION_ADMIN_FN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string; started_at?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: data.ok, error: data.error, started_at: data.started_at };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Call backend to reset timer. Use this first; fall back to clearCompetitionStartTime() if backend is unavailable. */
export async function callCompetitionResetBackend(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(COMPETITION_ADMIN_FN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: data.ok, error: data.error };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Set competition start time from client (fallback when backend is unavailable). Uses timezone API for authoritative UTC when available. */
export async function setCompetitionStartTime(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const startedAt = (await getAuthoritativeUtcIso()) ?? new Date().toISOString();
    const updatedAt = new Date().toISOString();
    const { error } = await client
      .from("competition_config")
      .update({ started_at: startedAt, updated_at: updatedAt })
      .eq("key", COMPETITION_CONFIG_KEY);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Clear competition start time from client (fallback when backend is unavailable). */
export async function clearCompetitionStartTime(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const { error } = await client
      .from("competition_config")
      .update({ started_at: null, updated_at: new Date().toISOString() })
      .eq("key", COMPETITION_CONFIG_KEY);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Upsert current player's score into Supabase leaderboard. */
export async function upsertLeaderboardEntry(params: {
  username: string;
  score: number;
  solvedCount: number;
  lastSolveTime: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getSupabase();
    const playerId = getLeaderboardPlayerId();
    const row = {
      player_id: playerId,
      username: params.username,
      score: params.score,
      solved_count: params.solvedCount,
      last_solve_time: params.lastSolveTime,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from("leaderboard")
      .upsert(row, {
        onConflict: "player_id",
        ignoreDuplicates: false,
      });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
