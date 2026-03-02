import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Award } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useGameState } from "@/hooks/useGameState";
import {
  fetchLeaderboardFromSupabase,
  upsertLeaderboardEntry,
  getLeaderboardPlayerId,
  getLeaderboardUsername,
} from "@/lib/api";

interface Player {
  rank: number;
  username: string;
  score: number;
  solved: number;
  lastSolveTime?: number;
  isYou?: boolean;
}

const TOP_N = 10;
const rankIcons = [Trophy, Medal, Award];
const rankColors = ["text-amber-400", "text-slate-300", "text-amber-600"];

const Leaderboard = () => {
  const { score, endTime, challenges, startTime, getElapsed } = useGameState();
  const [, setTick] = useState(0);
  const [remoteEntries, setRemoteEntries] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const playerId = getLeaderboardPlayerId();
  const displayName = getLeaderboardUsername();
  const solvedChallenges = challenges.filter((c) => c.solved);
  const lastSolveTime =
    solvedChallenges.length > 0
      ? Math.max(...solvedChallenges.map((c) => c.solvedAt || 0))
      : 0;

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboardFromSupabase()
      .then((rows) => {
        const list: Player[] = rows.map((r) => ({
          rank: 0,
          username: r.username,
          score: r.score,
          solved: r.solved_count,
          lastSolveTime: r.last_solve_time ?? undefined,
          isYou: r.player_id === playerId,
        }));
        setRemoteEntries(list);
      })
      .catch(() => setRemoteEntries([]))
      .finally(() => setLoading(false));
  }, [playerId, score, solvedChallenges.length]);

  useEffect(() => {
    if (score > 0) {
      upsertLeaderboardEntry({
        username: displayName,
        score,
        solvedCount: solvedChallenges.length,
        lastSolveTime: lastSolveTime || null,
      }).then(({ ok }) => {
        if (ok) {
          fetchLeaderboardFromSupabase().then((rows) => {
            setRemoteEntries(
              rows.map((r) => ({
                rank: 0,
                username: r.username,
                score: r.score,
                solved: r.solved_count,
                lastSolveTime: r.last_solve_time ?? undefined,
                isYou: r.player_id === playerId,
              }))
            );
          });
        }
      });
    }
  }, [score, solvedChallenges.length, lastSolveTime, playerId, displayName]);

  const you: Player = {
    rank: 0,
    username: displayName,
    score,
    solved: solvedChallenges.length,
    lastSolveTime,
    isYou: true,
  };

  const merged = remoteEntries.filter((p) => !p.isYou);
  const allPlayers = [you, ...merged]
    .filter((p) => p.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.lastSolveTime || 0) - (b.lastSolveTime || 0);
    })
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const top10 = allPlayers.slice(0, TOP_N);
  const youEntry = allPlayers.find((p) => p.isYou ?? p.username === displayName);
  const youRank = youEntry?.rank ?? null;
  const showYourPositionBelow = youRank != null && youRank > TOP_N;

  return (
    <DashboardLayout score={score} endTime={endTime}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-8">
          Leader<span className="neon-text">board</span>
        </h1>

        {allPlayers.length > 0 ? (
          <>
            {/* Top 10 Table with gold / silver / bronze for 1st, 2nd, 3rd */}
            <div className="glass-card overflow-hidden mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left px-6 py-3 text-xs font-mono text-muted-foreground uppercase">Rank</th>
                    <th className="text-left px-6 py-3 text-xs font-mono text-muted-foreground uppercase">Player</th>
                    <th className="text-right px-6 py-3 text-xs font-mono text-muted-foreground uppercase">Score</th>
                    <th className="text-right px-6 py-3 text-xs font-mono text-muted-foreground uppercase">Solved</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((player, i) => {
                    const isYou = player.isYou ?? player.username === displayName;
                    const Icon = player.rank <= 3 ? rankIcons[player.rank - 1] : null;
                    const iconColor = player.rank <= 3 ? rankColors[player.rank - 1] : "";
                    return (
                      <motion.tr
                        key={`${player.rank}-${player.username}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`border-b border-border/10 transition-colors ${isYou ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/30"}`}
                      >
                        <td className="px-6 py-3">
                          <span className="flex items-center gap-2">
                            {Icon ? (
                              <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} aria-hidden />
                            ) : null}
                            <span className={`font-mono font-bold ${player.rank <= 3 ? iconColor : "text-muted-foreground"}`}>
                              #{player.rank}
                            </span>
                          </span>
                        </td>
                        <td className={`px-6 py-3 font-medium ${isYou ? "text-primary font-bold" : ""}`}>
                          {player.username} {isYou && <span className="text-xs text-primary/60 ml-1">(you)</span>}
                        </td>
                        <td className="px-6 py-3 text-right font-mono">{player.score}</td>
                        <td className="px-6 py-3 text-right font-mono text-muted-foreground">{player.solved}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Your position (only when rank > 10) */}
            {showYourPositionBelow && youEntry && (
              <div className="glass-card overflow-hidden border-primary/40 ring-1 ring-primary/30">
                <p className="px-6 py-2 text-[10px] font-bold tracking-widest uppercase text-primary/70 border-b border-border/20">
                  Your position
                </p>
                <table className="w-full">
                  <tbody>
                    <tr className="bg-primary/10">
                      <td className="px-6 py-3 font-mono font-bold text-primary">#{youEntry.rank}</td>
                      <td className="px-6 py-3 font-medium text-primary font-bold">
                        {youEntry.username} <span className="text-xs text-primary/60 ml-1">(you)</span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono">{youEntry.score}</td>
                      <td className="px-6 py-3 text-right font-mono text-primary/70">{youEntry.solved}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="glass-card p-20 text-center border-dashed border-primary/20">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-primary/20" />
            <h3 className="text-xl font-bold uppercase tracking-widest text-primary/40">Leaderboard Clear</h3>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/20 mt-2">No active captures detected in the sequence</p>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Leaderboard;
