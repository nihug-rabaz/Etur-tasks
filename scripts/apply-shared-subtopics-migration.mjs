import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(here, "..", "supabase", "migrations", "0010_shared_subtopics.sql");
const sql = neon(databaseUrl.trim().replace(/^['"]|['"]$/g, ""));

for (const statement of readFileSync(migrationPath, "utf8")
  .split(";")
  .map((part) => part.trim())
  .filter(Boolean)) {
  await sql.query(`${statement};`);
}

console.log("Migration 0010_shared_subtopics applied.");
