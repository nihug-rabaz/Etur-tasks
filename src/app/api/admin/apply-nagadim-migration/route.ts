import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { Env } from "@/lib/env";

export const runtime = "nodejs";

/** Inline copy of supabase/migrations/0042_nagadim_candidate_enrichment.sql for serverless bundle. */
const MIGRATION_SQL = `
alter table public.nagadim_candidates
  add column if not exists phone text,
  add column if not exists id_number text,
  add column if not exists personal_number text,
  add column if not exists family_status text,
  add column if not exists children_count integer,
  add column if not exists residence text,
  add column if not exists pipeline_outcome text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nagadim_candidates_pipeline_outcome_check'
  ) then
    alter table public.nagadim_candidates
      add constraint nagadim_candidates_pipeline_outcome_check
      check (pipeline_outcome is null or pipeline_outcome in ('גויס', 'לא גויס'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nagadim_candidates_children_count_check'
  ) then
    alter table public.nagadim_candidates
      add constraint nagadim_candidates_children_count_check
      check (children_count is null or children_count >= 0);
  end if;
end $$;

alter table public.nagadim_stage_events
  add column if not exists result text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nagadim_stage_events_result_check'
  ) then
    alter table public.nagadim_stage_events
      add constraint nagadim_stage_events_result_check
      check (
        result is null
        or result in ('עבר', 'לא עבר', 'לא מתאים לפיקוד')
      );
  end if;
end $$;

update public.nagadim_candidates
set current_stage = case current_stage
  when 'בדיקת סגל' then 'אישור מדור סגל'
  when 'ראיון פרויקטור נגדים' then 'ראיון רב הנגדים'
  when 'בדיקת עומק' then 'נשלח לפיקוד'
  when 'ראיון פיקודים ויחידות' then 'ראיון פיקודים'
  else current_stage
end
where current_stage in (
  'בדיקת סגל',
  'ראיון פרויקטור נגדים',
  'בדיקת עומק',
  'ראיון פיקודים ויחידות'
);

update public.nagadim_stage_events
set stage = case stage
  when 'בדיקת סגל' then 'אישור מדור סגל'
  when 'ראיון פרויקטור נגדים' then 'ראיון רב הנגדים'
  when 'בדיקת עומק' then 'נשלח לפיקוד'
  when 'ראיון פיקודים ויחידות' then 'ראיון פיקודים'
  else stage
end
where stage in (
  'בדיקת סגל',
  'ראיון פרויקטור נגדים',
  'בדיקת עומק',
  'ראיון פיקודים ויחידות'
);

create index if not exists idx_nagadim_candidates_id_number
  on public.nagadim_candidates (id_number);

create index if not exists idx_nagadim_candidates_personal_number
  on public.nagadim_candidates (personal_number);

create index if not exists idx_nagadim_candidates_pipeline_outcome
  on public.nagadim_candidates (pipeline_outcome);
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

function authorize(request: Request): boolean {
  const expected = Env.get("MIGRATION_TOKEN") || Env.get("CRON_SECRET");
  if (!expected) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${expected}`;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
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
    select exists(
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'nagadim_stage_events'
        and column_name = 'result'
    ) as ok
  `;

  return NextResponse.json({
    ok: true,
    migration: "0042_nagadim_candidate_enrichment.sql",
    statements: statements.length,
    columns: (columns as { column_name: string }[]).map((row) => row.column_name),
    stageResultColumn: Boolean((resultCol as { ok: boolean }[])[0]?.ok),
  });
}
