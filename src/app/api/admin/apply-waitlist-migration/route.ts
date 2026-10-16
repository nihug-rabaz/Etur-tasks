import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { Env } from "@/lib/env";
import { AuthorizationService } from "@/services/authorization.service";

export const runtime = "nodejs";

/** Inline copy of supabase/migrations/0043_malshabim_interview_waitlist.sql for serverless bundle. */
const MIGRATION_SQL = `
create table if not exists public.malshabim_interview_waitlist (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_malshabim_interview_waitlist_created_at
  on public.malshabim_interview_waitlist (created_at desc);
`;

function splitSqlStatements(raw: string): string[] {
  const withoutLineComments = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements: string[] = [];
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

async function authorize(request: Request): Promise<boolean> {
  const expected = Env.get("MIGRATION_TOKEN") || Env.get("CRON_SECRET");
  if (expected) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${expected}`) return true;
  }
  try {
    await new AuthorizationService().ensureAdmin();
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return NextResponse.json({ error: "Missing DATABASE_URL" }, { status: 500 });
  }

  const statements = splitSqlStatements(MIGRATION_SQL);
  const sql = neon(databaseUrl);

  for (const statement of statements) {
    await sql.query(statement);
  }

  const table = await sql`
    select exists(
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'malshabim_interview_waitlist'
    ) as ok
  `;

  const count = await sql`
    select count(*)::int as n from public.malshabim_interview_waitlist
  `;

  return NextResponse.json({
    ok: Boolean((table as { ok: boolean }[])[0]?.ok),
    migration: "0043_malshabim_interview_waitlist.sql",
    statements: statements.length,
    waitlistRows: (count as { n: number }[])[0]?.n ?? 0,
  });
}
