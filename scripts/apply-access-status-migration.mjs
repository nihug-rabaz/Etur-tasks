import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

function loadEnvLocal() {
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
}

loadEnvLocal();
const sql = neon(process.env.DATABASE_URL.trim());
const here = dirname(fileURLToPath(import.meta.url));

async function runFile(name) {
  const raw = readFileSync(join(here, "..", "supabase", "migrations", name), "utf8");
  const statements = raw
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    console.log(`> ${statement.split("\n")[0].slice(0, 90)}`);
    await sql.query(statement);
  }
}

await runFile("0020_revert_task_cancelled.sql");
await runFile("0021_profile_access_status.sql");

const access = await sql`select access_status, count(*)::int as count from profiles group by access_status order by access_status`;
console.log("profiles access_status:", access);
const tasks = await sql`select status, count(*)::int as count from tasks group by status order by status`;
console.log("tasks status:", tasks);
