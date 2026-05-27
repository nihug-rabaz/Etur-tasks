import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

function normalize(value) {
  let trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const sql = neon(normalize(databaseUrl));

const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(here, "..", "supabase", "migrations", "0006_task_status_two_values.sql");
const raw = await readFile(migrationPath, "utf8");

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
  console.log(`> ${statement.split("\n")[0].slice(0, 80)}...`);
  await sql.query(statement);
}

const result = await sql.query("select status, count(*)::int as count from tasks group by status order by status");
console.log("Status distribution after migration:");
for (const row of result) {
  console.log(`  ${row.status}: ${row.count}`);
}
