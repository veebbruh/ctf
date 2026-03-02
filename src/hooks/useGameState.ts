import { useState, useCallback, useMemo, useEffect } from "react";
import { challenges as initialChallenges, Challenge } from "@/data/challenges";
import {
  fetchChallengesFromSupabase,
  fetchCompetitionConfig,
  callCompetitionStartBackend,
  callCompetitionResetBackend,
  setCompetitionStartTime,
  clearCompetitionStartTime,
  upsertLeaderboardEntry,
  getLeaderboardUsername,
} from "@/lib/api";
import type { CompetitionConfig } from "@/lib/api";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const COMPETITION_DURATION = 60 * 60 * 1000; // 1 hour (fallback when config not available)
const SHARED_TIMER_POLL_MS = 5_000; // fallback poll every 5s when Realtime not available

function mergeChallengesWithSaved(
  source: Challenge[],
  savedJson: string | null
): Challenge[] {
  if (!savedJson || !source.length) return source;
  try {
    const parsed = JSON.parse(savedJson) as Challenge[];
    return source.map((c) => {
      const saved = parsed.find((p) => p.id === c.id);
      if (!saved) return c;
      return {
        ...c,
        solved: saved.solved ?? c.solved,
        solvedAt: saved.solvedAt ?? c.solvedAt,
      };
    });
  } catch {
    return source;
  }
}

export function useGameState() {
  const [startTime, setStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem("ctf_start_time");
    return saved ? Number(saved) : null;
  });

  const [durationMs, setDurationMs] = useState(COMPETITION_DURATION);

  const endTime = startTime ? startTime + durationMs : null;

  const [challengeList, setChallengeList] = useState<Challenge[]>(() => {
    const saved = localStorage.getItem("ctf_challenges");
    if (saved) {
      const parsed = JSON.parse(saved) as Challenge[];
      return parsed.map((c) => {
        const original = initialChallenges.find((oc) => oc.id === c.id);
        return {
          ...c,
          hintTimes: c.hintTimes || original?.hintTimes || [15 * 60000, 30 * 60000],
          fileUrl: c.fileUrl || original?.fileUrl,
        };
      });
    }
    return initialChallenges;
  });

  const [challengesLoadedFromSupabase, setChallengesLoadedFromSupabase] = useState(false);

  // Sync start time (and duration) from shared config so all clients see the same timer
  useEffect(() => {
    let cancelled = false;

    const apply = (config: CompetitionConfig, fromRealtime = false) => {
      if (cancelled) return;
      const d = (config.duration_seconds || 3600) * 1000;
      setDurationMs(d);
      if (config.started_at) {
        const serverStart = new Date(config.started_at).getTime();
        setStartTime(serverStart);
        localStorage.setItem("ctf_start_time", String(serverStart));
      } else if (fromRealtime) {
        setStartTime(null);
        localStorage.removeItem("ctf_start_time");
      }
    };

    // Initial fetch + periodic poll (fallback when Realtime is unavailable)
    fetchCompetitionConfig().then(apply);
    const interval = setInterval(() => fetchCompetitionConfig().then(apply), SHARED_TIMER_POLL_MS);

    // Refetch when user returns to the tab so they see the timer immediately
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchCompetitionConfig().then(apply);
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Live updates: when admin starts/resets timer, everyone gets it instantly
    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;
    let supabaseClient: ReturnType<typeof getSupabase> | null = null;
    if (isSupabaseConfigured()) {
      try {
        supabaseClient = getSupabase();
        channel = supabaseClient
          .channel("competition-config-live")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "competition_config" },
            (payload: { new?: { started_at: string | null; duration_seconds?: number }; old?: unknown }) => {
              if (cancelled || !payload.new) return;
              const row = payload.new;
              const started_at = row.started_at ?? null;
              const duration_seconds = Number(row.duration_seconds) || 3600;
              apply({ started_at, duration_seconds }, true);
            }
          )
          .subscribe();
      } catch {
        // Supabase not configured or Realtime not enabled for table; polling is enough
      }
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      if (supabaseClient && channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    if (challengesLoadedFromSupabase) return;
    let cancelled = false;
    fetchChallengesFromSupabase().then((remote) => {
      if (cancelled || !remote.length) return;
      const saved = localStorage.getItem("ctf_challenges");
      const merged = mergeChallengesWithSaved(remote, saved);
      setChallengeList(merged);
      localStorage.setItem("ctf_challenges", JSON.stringify(merged));
      setChallengesLoadedFromSupabase(true);
    });
    return () => {
      cancelled = true;
    };
  }, [challengesLoadedFromSupabase]);

  const save = (list: Challenge[]) => {
    setChallengeList(list);
    localStorage.setItem("ctf_challenges", JSON.stringify(list));
  };

  const startTimer = useCallback(async () => {
    // Prefer backend so server sets authoritative time and all clients get it reliably
    let res = await callCompetitionStartBackend();
    if (!res.ok) {
      res = await setCompetitionStartTime();
    }
    const now = Date.now();
    const serverStartMs = res.ok && "started_at" in res && res.started_at
      ? new Date(res.started_at).getTime()
      : now;
    localStorage.setItem("ctf_start_time", String(serverStartMs));
    setStartTime(serverStartMs);
  }, []);

  const getElapsed = useCallback(() => {
    if (!startTime) return 0;
    return Date.now() - startTime;
  }, [startTime]);

  const getCurrentPoints = useCallback(
    (challenge: Challenge) => {
      if (!startTime) return challenge.basePoints;

      const base = challenge.basePoints;
      // If solved, use the solvedAt time; otherwise, use current time
      const now = challenge.solved ? (challenge.solvedAt || Date.now()) : Date.now();
      const elapsed = now - startTime;

      // 1. Calculate base points (with deduction if hints were available/used)
      let earnedPoints = base;
      if (elapsed >= challenge.hintTimes[1]) {
        earnedPoints = Math.floor(base * 0.5);
      } else if (elapsed >= challenge.hintTimes[0]) {
        earnedPoints = Math.floor(base * 0.75);
      }

      // 2. Add Time Left Bonus (1 point per second remaining)
      const timeLeftSeconds = Math.max(0, Math.floor((durationMs - elapsed) / 1000));

      return earnedPoints + timeLeftSeconds;
    },
    [startTime, durationMs]
  );

  const getAvailableHints = useCallback(
    (challenge: Challenge) => {
      const elapsed = getElapsed();
      const hints: string[] = [];
      if (elapsed >= challenge.hintTimes[0]) hints.push(challenge.hints[0]);
      if (elapsed >= challenge.hintTimes[1]) hints.push(challenge.hints[1]);
      return hints;
    },
    [getElapsed]
  );

  const submitFlag = useCallback(
    (challengeId: string, flag: string): boolean => {
      if (!startTime || !endTime || Date.now() > endTime) return false;
      const challenge = challengeList.find((c) => c.id === challengeId);
      if (!challenge || challenge.solved) return false;
      if (flag.trim() === challenge.flag) {
        const updated = challengeList.map((c) =>
          c.id === challengeId ? { ...c, solved: true, solvedAt: Date.now() } : c
        );
        save(updated);

        const newScore = updated
          .filter((c) => c.solved)
          .reduce((sum, c) => {
            const base = c.basePoints;
            const elapsed = (c.solvedAt ?? Date.now()) - startTime;
            let earned = base;
            if (elapsed >= c.hintTimes[1]) earned = Math.floor(base * 0.5);
            else if (elapsed >= c.hintTimes[0]) earned = Math.floor(base * 0.75);
            const timeLeft = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
            return sum + earned + timeLeft;
          }, 0);
        const solvedCount = updated.filter((c) => c.solved).length;
        const lastSolveTime = Math.max(...updated.filter((c) => c.solved).map((c) => c.solvedAt ?? 0));

        upsertLeaderboardEntry({
          username: getLeaderboardUsername(),
          score: newScore,
          solvedCount,
          lastSolveTime: lastSolveTime || null,
        }).catch((err) => console.warn("Leaderboard sync failed:", err));

        return true;
      }
      return false;
    },
    [challengeList, startTime, durationMs]
  );

  const score = useMemo(
    () =>
      challengeList
        .filter((c) => c.solved)
        .reduce((sum, c) => sum + getCurrentPoints(c), 0),
    [challengeList, getCurrentPoints]
  );

  const resetGame = useCallback(async () => {
    let res = await callCompetitionResetBackend();
    if (!res.ok) {
      await clearCompetitionStartTime();
    }
    localStorage.removeItem("ctf_start_time");
    localStorage.removeItem("ctf_challenges");
    window.location.reload();
  }, []);

  return {
    challenges: challengeList,
    startTime,
    endTime,
    score,
    isStarted: !!startTime,
    getCurrentPoints,
    getAvailableHints,
    getElapsed,
    submitFlag,
    startTimer,
    resetGame,
  };
}
