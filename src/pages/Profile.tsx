import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, LogIn, LogOut, Shield } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useGameState } from "@/hooks/useGameState";
import {
  getCurrentTeam,
  setCurrentTeam,
  clearCurrentTeam,
  verifyTeamLogin,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { score, endTime } = useGameState();
  const [teamUsername, setTeamUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentTeam, setCurrentTeamState] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentTeamState(getCurrentTeam());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!teamUsername.trim() || !password.trim()) {
      setError("Enter team name and password.");
      return;
    }
    setLoading(true);
    const result = await verifyTeamLogin(teamUsername.trim(), password);
    setLoading(false);
    if (result.ok) {
      setCurrentTeam(result.team_username);
      setCurrentTeamState(result.team_username);
      setTeamUsername("");
      setPassword("");
      toast({ title: "Logged in", description: `Team: ${result.team_username}` });
    } else {
      setError(result.error);
      toast({ title: "Login failed", description: result.error, variant: "destructive" });
    }
  };

  const handleLogout = () => {
    clearCurrentTeam();
    setCurrentTeamState(null);
    toast({ title: "Logged out" });
  };

  return (
    <DashboardLayout score={score} endTime={endTime}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-2">
          Profile
        </h1>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary/50 mb-8">
          Team login — your scores appear under this identity on the leaderboard
        </p>

        {currentTeam ? (
          <div className="glass-card p-8 max-w-md">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-primary/50">Logged in as</p>
                <p className="text-xl font-bold tracking-tight">{currentTeam}</p>
              </div>
            </div>
            <p className="text-[11px] tracking-wide text-primary/70 mb-6">
              Your submissions and score are recorded under <strong>{currentTeam}</strong> on the leaderboard.
            </p>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-primary/30 text-primary hover:bg-primary/10 uppercase tracking-widest text-xs font-bold"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        ) : (
          <div className="glass-card p-8 max-w-md">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-widest">Team login</h2>
            </div>
            <p className="text-[11px] tracking-wide text-primary/70 mb-6">
              Use your team name and password from Geminathon 26 registration. Once logged in, your score will appear under your team name on the leaderboard.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="team" className="text-[10px] font-bold tracking-widest uppercase text-primary/60">
                  Team name
                </Label>
                <Input
                  id="team"
                  type="text"
                  value={teamUsername}
                  onChange={(e) => setTeamUsername(e.target.value)}
                  placeholder="e.g. Error 404"
                  className="mt-1 bg-primary/5 border-primary/20 text-xs font-mono uppercase"
                  autoComplete="username"
                />
              </div>
              <div>
                <Label htmlFor="pwd" className="text-[10px] font-bold tracking-widest uppercase text-primary/60">
                  Password
                </Label>
                <Input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 bg-primary/5 border-primary/20 text-xs"
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-[10px] font-bold uppercase text-destructive">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-black hover:bg-white font-bold uppercase tracking-widest text-xs"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {loading ? "Checking…" : "Log in"}
              </Button>
            </form>
          </div>
        )}

        {!currentTeam && (
          <p className="mt-6 text-[10px] text-primary/40 uppercase tracking-widest max-w-md">
            Not logged in? Your progress is still saved on this device and will show as &quot;You&quot; on the leaderboard until you log in with a team.
          </p>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
