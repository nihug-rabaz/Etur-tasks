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
if (!databaseUrl || databaseUrl === "[SENSITIVE]") {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);
const here = dirname(fileURLToPath(import.meta.url));
const migration = "0059_dovrut_workflow_redesign.sql";
const raw = readFileSync(join(here, "..", "supabase", "migrations", migration), "utf8");

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

const cols = await sql`
  select column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'dovrut_concepts'
    and column_name in ('briefing_done_at', 'archived_at', 'last_approval_note')
  order by column_name
`;
const tables = await sql`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
    and table_name in (
      'dovrut_approval_tokens',
      'dovrut_workflow_settings',
      'dovrut_news_seen'
    )
  order by table_name
`;

console.log(`Applied ${statements.length} statements from ${migration}`);
console.log(
  "concept columns:",
  cols.map((r) => r.column_name).join(", ") || "(none)",
);
console.log(
  "tables:",
  tables.map((r) => r.table_name).join(", ") || "(none)",
);
