/**
 * Writes VITE_* env vars to .env so Vite can inline them at build time.
 * Use on Netlify (or any CI) so Supabase/Firebase env vars are available during `vite build`.
 * Run before build: node scripts/write-env-for-build.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

const vars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
];

const lines = [];
for (const name of vars) {
  const value = process.env[name];
  if (value !== undefined && value !== "") {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"|'/g, (c) => "\\" + c);
    lines.push(`${name}="${escaped}"`);
  }
}

if (lines.length > 0) {
  fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
  console.log("[write-env-for-build] Wrote", lines.length, "env var(s) to .env for Vite build");
} else {
  if (process.env.CI || process.env.NETLIFY) {
    console.warn("[write-env-for-build] No VITE_SUPABASE_* (or other VITE_*) in process.env. Set them in Netlify → Site configuration → Environment variables, then redeploy.");
  }
}
