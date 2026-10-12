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

/** Split SQL on semicolons outside dollar-quoted blocks ($$ ... $$). */
function splitSqlStatements(raw) {
  const withoutLineComments = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = [];
  let current = "";
  let inDollar = false;

  for (let i = 0; i < withoutLineComments.length; i++) {
    const ch = withoutLineComments[i];
    const next = withoutLineComments[i + 1];

    if (ch === "$" && next === "$") {
      inDollar = !inDollar;
      current += "$$";
      i++;
      continue;
    }

    if (ch === ";" && !inDollar) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

// Prefer already-injected env (e.g. `vercel env run -e production`); else .env.local
if (!process.env.DATABASE_URL) loadEnvLocal();
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl || databaseUrl === "[SENSITIVE]") {
  console.error(
    "DATABASE_URL missing or redacted. Run via: vercel env run -e production -- node scripts/apply-nagadim-enrichment-migration.mjs",
  );
  process.exit(1);
}
try {
  const host = new URL(databaseUrl).hostname;
  console.log("Applying against host:", host);
} catch {
  console.error("DATABASE_URL is not a valid URL");
  process.exit(1);
}

const sql = neon(databaseUrl);
const here = dirname(fileURLToPath(import.meta.url));
const migration = "0042_nagadim_candidate_enrichment.sql";
const raw = readFileSync(join(here, "..", "supabase", "migrations", migration), "utf8");
const statements = splitSqlStatements(raw);

for (const statement of statements) {
  await sql.query(statement);
}

const columns = await sql`
  select column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'nagadim_candidates'
    and column_name = any(${[
      "phone",
      "id_number",
      "personal_number",
      "family_status",
      "children_count",
      "residence",
      "pipeline_outcome",
    ]})
  order by column_name
`;

const resultCol = await sql`
  select column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'nagadim_stage_events'
    and column_name = 'result'
`;

const stages = await sql`
  select current_stage, count(*)::int as n
  from public.nagadim_candidates
  group by current_stage
  order by current_stage
`;

console.log(`Applied ${statements.length} statements from ${migration}`);
console.log(
  "Candidate columns:",
  columns.map((r) => r.column_name),
);
console.log("Stage result column:", resultCol.map((r) => r.column_name));
console.log("Stage counts:", stages);
