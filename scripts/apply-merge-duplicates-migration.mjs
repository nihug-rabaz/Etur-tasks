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
const migrationPath = join(here, "..", "supabase", "migrations", "0008_merge_duplicate_subtopics.sql");
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

console.log("Subtopics BEFORE migration:");
const before = await sql.query(
  "select s.id, s.name, d.slug, (select count(*) from tasks t where t.subtopic_id = s.id)::int as tasks from subtopics s join domains d on d.id = s.domain_id order by d.slug, s.name, s.id",
);
for (const row of before) {
  console.log(`  ${row.slug} | ${row.name} | ${row.id} | tasks: ${row.tasks}`);
}

for (const statement of statements) {
  const preview = statement.split("\n")[0].slice(0, 80);
  console.log(`> ${preview}...`);
  await sql.query(statement);
}

console.log("\nSubtopics AFTER migration:");
const after = await sql.query(
  "select s.id, s.name, d.slug, (select count(*) from tasks t where t.subtopic_id = s.id)::int as tasks from subtopics s join domains d on d.id = s.domain_id order by d.slug, s.name",
);
for (const row of after) {
  console.log(`  ${row.slug} | ${row.name} | ${row.id} | tasks: ${row.tasks}`);
}

console.log("\nUser permissions AFTER migration:");
const perms = await sql.query(
  "select usp.user_id, s.name, usp.subtopic_id from user_subtopic_permissions usp join subtopics s on s.id = usp.subtopic_id order by usp.user_id, s.name",
);
for (const row of perms) {
  console.log(`  user=${row.user_id} | ${row.name} | ${row.subtopic_id}`);
}
