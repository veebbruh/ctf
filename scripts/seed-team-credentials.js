/**
 * Reads Geminathon 26 Team Formation CSV, extracts unique team names,
 * generates a password per team, and writes a Supabase migration SQL file.
 * Run: node scripts/seed-team-credentials.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "public", "Geminathon 26 Team Formation (Responses) (1).csv");
const OUT_PATH = path.join(__dirname, "..", "supabase", "migrations", "20250302000005_seed_team_credentials.sql");

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "G26";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function escapeSql(str) {
  if (str == null) return "NULL";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const csv = fs.readFileSync(CSV_PATH, "utf8");
const lines = csv.split(/\r?\n/).filter((line) => line.trim());

const header = lines[0];
const teamNameIndex = header.split(",").map((h) => h.trim()).indexOf("Team Name");
if (teamNameIndex === -1) {
  console.error("Could not find 'Team Name' column");
  process.exit(1);
}

const seen = new Set();
const teams = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const parts = line.split(",");
  const name = (parts[teamNameIndex] || "").trim();
  if (!name || /^\d+$/.test(name) || name.length < 2) continue;
  if (seen.has(name)) continue;
  seen.add(name);
  teams.push(name);
}

const credentials = teams.map((teamName) => ({
  team_username: teamName,
  team_name: teamName,
  password: generatePassword(),
}));

const sqlLines = [
  "-- Team credentials for Geminathon 26 (from team formation CSV); team name = username, generated password per team",
  "insert into public.team_credentials (team_username, team_name, password)",
  "values",
  credentials
    .map(
      (c) =>
        `  (${escapeSql(c.team_username)}, ${escapeSql(c.team_name)}, ${escapeSql(c.password)})`
    )
    .join(",\n"),
  "on conflict (team_username) do update set",
  "  team_name = excluded.team_name,",
  "  password = excluded.password;",
  "",
  "-- Export for distribution (team_username, password):",
  ...credentials.map((c) => `-- ${c.team_username} | ${c.password}`),
];

function escapeCsv(str) {
  const s = String(str);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? '"' + s.replace(/"/g, '""') + '"' : s;
}

fs.writeFileSync(OUT_PATH, sqlLines.join("\n"), "utf8");
console.log(`Written ${credentials.length} team credentials to ${OUT_PATH}`);
console.log("Passwords also listed as comments at the bottom of the file.");

const outDir = path.join(__dirname, "output");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const csvPath = path.join(outDir, "team-credentials.csv");
const csvLines = ["team_username,password", ...credentials.map((c) => `${escapeCsv(c.team_username)},${escapeCsv(c.password)}`)];
fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");
console.log(`Written ${csvPath} (for distribution; do not commit).`);
