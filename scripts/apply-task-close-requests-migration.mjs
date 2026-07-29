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
const migrationPath = join(here, "..", "supabase", "migrations", "0017_task_close_requests.sql");
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

console.log("task_close_requests migration applied.");
