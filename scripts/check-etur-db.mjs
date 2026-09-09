import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();
const url = (process.env.DATABASE_URL || "").trim();
if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}
try {
  const host = new URL(url.replace(/^postgresql:/, "http:")).host;
  console.log("host=", host);
} catch {
  console.log("host=parse_fail");
}

const sql = neon(url);
const tables = ["profiles", "malshabim_candidates", "assistant_action_audit", "app_settings"];
for (const name of tables) {
  const rows = await sql`
    select count(*)::int as c
    from information_schema.tables
    where table_schema = 'public' and table_name = ${name}
  `;
  console.log(name, rows[0]?.c === 1 ? "yes" : "no");
}
