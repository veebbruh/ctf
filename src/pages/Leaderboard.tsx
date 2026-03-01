import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Award } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useGameState } from "@/hooks/useGameState";
import {
  fetchLeaderboardFromSupabase,
  upsertLeaderboardEntry,
  getPlayerId,
} from "@/lib/api";

interface Player {
  rank: number;
  username: string;
  score: number;
  solved: number;
  lastSolveTime?: number;
  isYou?: boolean;
}

const rankIcons = [Trophy, Medal, Award];
const rankColors = ["text-warning", "text-muted-foreground", "text-warning/60"];

const Leaderboard = () => {
  const { score, endTime, challenges, startTime, getElapsed } = useGameState();
  const [, setTick] = useState(0);
  const [remoteEntries, setRemoteEntries] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const playerId = getPlayerId();
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
        username: "You",
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
  }, [score, solvedChallenges.length, lastSolveTime, playerId]);

  const you: Player = {
    rank: 0,
    username: "You",
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

  return (
    <DashboardLayout score={score} endTime={endTime}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-8">
          Leader<span className="neon-text">board</span>
        </h1>

        {allPlayers.length > 0 ? (
          <>
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
              {[1, 0, 2].map((podiumIndex) => {
                const player = allPlayers[podiumIndex];
                if (!player) return null;
                const Icon = rankIcons[player.rank - 1] || Trophy;
                const isYou = player.username === "You";

                return (
                  <motion.div
                    key={player.rank}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: podiumIndex * 0.15 }}
                    className={`glass-card p-5 text-center ${player.rank === 1 ? "neon-glow row-span-1 -mt-4" : player.rank === 2 ? "violet-glow" : ""
                      } ${isYou ? "border-primary/50" : ""}`}
                  >
                    <Icon className={`w-8 h-8 mx-auto mb-2 ${rankColors[player.rank - 1] || "text-muted-foreground"}`} />
                    <div className="font-mono text-2xl font-bold neon-text">#{player.rank}</div>
                    <div className={`font-semibold mt-1 ${isYou ? "text-primary" : ""}`}>{player.username}</div>
                    <div className="text-sm text-muted-foreground">{player.score} pts</div>
                    <div className="text-xs text-muted-foreground">{player.solved} solved</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Full Table */}
            <div className="glass-card overflow-hidden">
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
                  {allPlayers.map((player, i) => {
                    const isYou = player.isYou ?? player.username === "You";
                    return (
                      <motion.tr
                        key={player.username}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`border-b border-border/10 transition-colors ${isYou ? "bg-primary/5" : "hover:bg-muted/30"
                          }`}
                      >
                        <td className="px-6 py-3">
                          <span className={`font-mono font-bold ${player.rank <= 3 ? "neon-text" : "text-muted-foreground"}`}>
                            #{player.rank}
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
