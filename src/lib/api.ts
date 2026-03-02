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

/** Verify team credentials against Supabase team_credentials. Returns team_username on success. */
export async function verifyTeamLogin(
  teamUsername: string,
  password: string
): Promise<{ ok: true; team_username: string } | { ok: false; error: string }> {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from("team_credentials")
      .select("team_username, password")
      .eq("team_username", teamUsername.trim())
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data || data.password !== password.trim()) {
      return { ok: false, error: "Invalid team name or password." };
    }
    return { ok: true, team_username: data.team_username };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
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
  const hints = Array.isArray(row.hints) && row.hints.length >= 2
    ? [row.hints[0], row.hints[1]] as [string, string]
    : ["", ""];
  const hintTimes = Array.isArray(row.hint_times) && row.hint_times.length >= 2
    ? [Number(row.hint_times[0]), Number(row.hint_times[1])] as [number, number]
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
