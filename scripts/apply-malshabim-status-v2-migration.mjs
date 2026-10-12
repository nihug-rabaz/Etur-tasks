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
const databaseUrl = (process.env.DATABASE_URL || "").trim();
if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}
const sql = neon(databaseUrl);
const here = dirname(fileURLToPath(import.meta.url));
const migration = "0041_malshabim_candidate_status_v2.sql";
const raw = readFileSync(join(here, "..", "supabase", "migrations", migration), "utf8");

const host = new URL(databaseUrl.replace(/^postgresql:/i, "http:")).host;
console.log("host=", host);

const hasTable = await sql`
  select exists(
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'malshabim_candidates'
  ) as ok
`;
if (!hasTable[0]?.ok) {
  console.error(
    "Refusing migrate: this DB is not Etur (missing malshabim_candidates). Fix DATABASE_URL in .env.local.",
  );
  process.exit(1);
}

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
}

const counts = await sql`
  select candidate_status, count(*)::int as n
  from public.malshabim_candidates
  group by candidate_status
  order by candidate_status
`;
console.log(`Applied ${statements.length} statements from ${migration}`);
console.log("Status counts:", counts);
