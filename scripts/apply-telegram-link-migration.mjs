import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

const sql = neon(
  databaseUrl.startsWith("'") || databaseUrl.startsWith('"')
    ? databaseUrl.slice(1, -1)
    : databaseUrl,
);

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, "..", "supabase", "migrations", "0005_telegram_link.sql");
const raw = readFileSync(file, "utf8");

const statements = raw
  .split(";")
  .map((part) => part.trim())
  .filter((part) => part.length > 0);

for (const statement of statements) {
  await sql.query(statement);
}

console.log("Telegram link migration applied");
