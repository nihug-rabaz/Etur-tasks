import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
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
  } catch {
    // optional
  }
}

loadEnvLocal();
const databaseUrl = (process.env.DATABASE_URL || "").trim();
if (!databaseUrl || databaseUrl === "[SENSITIVE]") {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = neon(databaseUrl);
const namePatterns = ["%עידאן%", "%עידן%", "%קובי%"];

const profiles = await sql`
  select id, name, email, role
  from profiles
  where is_approved = true
    and (
      name ilike ${namePatterns[0]}
      or name ilike ${namePatterns[1]}
      or name ilike ${namePatterns[2]}
    )
  order by name
`;

console.log("matched profiles:", profiles.length);
for (const p of profiles) {
  console.log(`- ${p.name} <${p.email}> platform=${p.role}`);
  await sql`
    insert into user_module_roles (user_id, module_id, role)
    values (${p.id}, ${"malshabim"}, ${"admin"})
    on conflict (user_id, module_id) do update
    set role = ${"admin"}
  `;
  console.log(`  → malshabim admin set`);
}
