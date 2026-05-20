import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

const sql = neon(databaseUrl.trim().replace(/^['"]|['"]$/g, ""));

await sql`delete from tasks`;
await sql`delete from profiles`;

const [{ count }] = await sql`select count(*)::int as count from profiles`;
console.log(`profiles remaining: ${count} (expected 0). First Google sign-in will create admin.`);
