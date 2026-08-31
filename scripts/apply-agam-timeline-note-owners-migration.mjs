import { config } from "dotenv";
import postgres from "postgres";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const connectionString = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Missing POSTGRES_URL_NON_POOLING or POSTGRES_URL");
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: "require", max: 1 });
const migration = await fs.readFile(
  path.join(__dirname, "..", "supabase", "migrations", "0032_agam_timeline_note_owners.sql"),
  "utf8",
);

try {
  const statements = migration
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  console.log(`Applied ${statements.length} statements`);
} finally {
  await sql.end();
}
