import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

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

function hostOf(url) {
  try {
    return new URL(url.replace(/^postgresql:/i, "http:")).host;
  } catch {
    return "unknown";
  }
}

loadEnvLocal();
if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}
const databaseUrl = process.env.DATABASE_URL.trim();
console.log("Applying to host=", hostOf(databaseUrl));

const sql = neon(databaseUrl);

const profiles = await sql`
  select count(*)::int as c
  from information_schema.tables
  where table_schema = 'public' and table_name = 'profiles'
`;
const malshabim = await sql`
  select count(*)::int as c
  from information_schema.tables
  where table_schema = 'public' and table_name = 'malshabim_candidates'
`;
if (profiles[0]?.c !== 1 || malshabim[0]?.c !== 1) {
  console.error("Refusing migrate: this DB is not Etur (missing profiles/malshabim_candidates)");
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const files = [
  "0037_assistant_action_audit.sql",
  "0038_assistant_released_flag.sql",
];

for (const file of files) {
  const raw = readFileSync(join(here, "..", "supabase", "migrations", file), "utf8");
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
    await sql.query(statement);
    console.log("OK:", file, statement.slice(0, 50).replace(/\s+/g, " "));
  }
  console.log("Applied", file);
}

console.log("Done");
