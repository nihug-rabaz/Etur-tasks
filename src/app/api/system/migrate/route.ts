import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import initialCandidates from "@/modules/malshabim/data/initial-candidates.json";

const MIGRATION_TOKEN = "etur-db-migrate-2026-auth";

const MALSHABIM_SQL = [
  `create table if not exists public.malshabim_candidates (
    id uuid primary key default gen_random_uuid(),
    legacy_base44_id text unique,
    full_name text,
    phone text,
    id_number text,
    personal_number text,
    serial_number integer,
    city text,
    photo_url text,
    candidate_status text not null default 'חדש',
    advanced_status text not null default 'בטיפול',
    status_type text,
    request_type text,
    recruitment_track text,
    enlistment_date date,
    interview_at timestamptz,
    next_status_update_at timestamptz,
    observance jsonb not null default '{}'::jsonb,
    quiz_questions jsonb not null default '[]'::jsonb,
    quiz_score real,
    quiz_passed boolean not null default false,
    quiz_skipped boolean not null default false,
    interview_summary text,
    interviewer_notes text,
    instructions text,
    instruction_items jsonb not null default '[]'::jsonb,
    instruction_recipients jsonb not null default '[]'::jsonb,
    is_draft boolean not null default false,
    draft_step integer,
    update_log jsonb not null default '[]'::jsonb,
    created_by uuid references public.profiles (id) on delete set null,
    created_by_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists idx_malshabim_candidates_created_at
    on public.malshabim_candidates (created_at desc)`,
  `create index if not exists idx_malshabim_candidates_status
    on public.malshabim_candidates (candidate_status, advanced_status)`,
  `create index if not exists idx_malshabim_candidates_serial
    on public.malshabim_candidates (serial_number)`,
  `create index if not exists idx_malshabim_candidates_id_number
    on public.malshabim_candidates (id_number)`,
  `create index if not exists idx_malshabim_candidates_personal_number
    on public.malshabim_candidates (personal_number)`,
  `create index if not exists idx_malshabim_candidates_legacy
    on public.malshabim_candidates (legacy_base44_id)
    where legacy_base44_id is not null`,
];

const NAGADIM_SQL = [
  `create table if not exists public.nagadim_candidates (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    notes text,
    current_stage text not null default 'מוקד איתור',
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists idx_nagadim_candidates_created_at
    on public.nagadim_candidates (created_at desc)`,
  `create index if not exists idx_nagadim_candidates_stage
    on public.nagadim_candidates (current_stage)`,
  `create table if not exists public.nagadim_stage_events (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null references public.nagadim_candidates (id) on delete cascade,
    stage text not null,
    person_name text,
    event_date date,
    notes text,
    command text,
    unit text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists idx_nagadim_stage_events_candidate
    on public.nagadim_stage_events (candidate_id, stage, event_date desc nulls last, created_at desc)`,
  `create table if not exists public.nagadim_positions (
    id uuid primary key default gen_random_uuid(),
    command text,
    division text,
    brigade text,
    unit text,
    activity_level text,
    gap_status text not null default 'open'
      check (gap_status in ('open', 'closed', 'permanently_closed')),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists idx_nagadim_positions_gap_status
    on public.nagadim_positions (gap_status, created_at desc)`,
  `create index if not exists idx_nagadim_positions_command
    on public.nagadim_positions (command)`,
  `create table if not exists public.nagadim_position_candidates (
    id uuid primary key default gen_random_uuid(),
    position_id uuid not null references public.nagadim_positions (id) on delete cascade,
    full_name text not null,
    decision text,
    sort_order integer not null default 0,
    notes text,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists idx_nagadim_position_candidates_position
    on public.nagadim_position_candidates (position_id, sort_order, created_at)`,
];

function normalizeDatabaseUrl(raw: string): string {
  let url = raw.trim();
  if (
    (url.startsWith("'") && url.endsWith("'")) ||
    (url.startsWith('"') && url.endsWith('"'))
  ) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

function parseJsonField(val: unknown, fallback: unknown) {
  if (val == null || val === "") return fallback;
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function toBool(val: unknown) {
  if (val === true || val === "true" || val === "TRUE" || val === "1") return true;
  if (val === false || val === "false" || val === "FALSE" || val === "0") return false;
  return null;
}

function toNumber(val: unknown) {
  if (val == null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function emptyToNull(val: unknown) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

export async function GET(request: Request) {
  const token = request.headers.get("x-migration-token");
  if (token !== MIGRATION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing DATABASE_URL" }, { status: 500 });
  }

  const sql = neon(normalizeDatabaseUrl(rawUrl));
  const tables = await sql`
    select table_name 
    from information_schema.tables 
    where table_schema = 'public'
    order by table_name
  `;

  return NextResponse.json({
    status: "ready",
    existingTables: tables.map((t) => (t as { table_name: string }).table_name),
  });
}

export async function POST(request: Request) {
  const token = request.headers.get("x-migration-token");
  if (token !== MIGRATION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing DATABASE_URL" }, { status: 500 });
  }

  const sql = neon(normalizeDatabaseUrl(rawUrl));
  const executedStatements: string[] = [];

  // 1. Run Malshabim migration
  for (const stmt of MALSHABIM_SQL) {
    await sql.query(stmt);
    executedStatements.push(stmt.slice(0, 50).trim() + "...");
  }

  // 2. Run Nagadim migration
  for (const stmt of NAGADIM_SQL) {
    await sql.query(stmt);
    executedStatements.push(stmt.slice(0, 50).trim() + "...");
  }

  // 3. Import initial candidates if not yet imported
  let candidatesImported = 0;
  const countRes = (await sql`select count(*)::int as count from public.malshabim_candidates`) as Array<{ count: number }>;
  const existingCount = countRes[0]?.count ?? 0;

  if (existingCount === 0 && Array.isArray(initialCandidates) && initialCandidates.length > 0) {
    for (const raw of initialCandidates as Record<string, unknown>[]) {
      if (toBool(raw.is_sample) === true) continue;
      const legacyId = emptyToNull(raw.id);
      const fullName = emptyToNull(raw.full_name);
      if (!legacyId && !fullName) continue;

      const observance = parseJsonField(raw.observance, {});
      const quizQuestions = parseJsonField(raw.quiz_questions, []);
      const instructionItems = parseJsonField(raw.instruction_items, []);
      const instructionRecipients = parseJsonField(raw.instruction_recipients, []);
      const updateLog = parseJsonField(raw.update_log, []);

      await sql`
        insert into public.malshabim_candidates (
          legacy_base44_id,
          full_name,
          phone,
          id_number,
          personal_number,
          serial_number,
          city,
          photo_url,
          candidate_status,
          advanced_status,
          status_type,
          request_type,
          recruitment_track,
          enlistment_date,
          interview_at,
          next_status_update_at,
          observance,
          quiz_questions,
          quiz_score,
          quiz_passed,
          quiz_skipped,
          interview_summary,
          interviewer_notes,
          instructions,
          instruction_items,
          instruction_recipients,
          is_draft,
          draft_step,
          update_log,
          created_by_name
        ) values (
          ${legacyId},
          ${fullName},
          ${emptyToNull(raw.phone)},
          ${emptyToNull(raw.id_number)},
          ${emptyToNull(raw.personal_number)},
          ${toNumber(raw.serial_number)},
          ${emptyToNull(raw.city)},
          ${emptyToNull(raw.photo_url)},
          ${emptyToNull(raw.candidate_status) || "חדש"},
          ${emptyToNull(raw.advanced_status) || "בטיפול"},
          ${emptyToNull(raw.status_type)},
          ${emptyToNull(raw.request_type)},
          ${emptyToNull(raw.recruitment_track)},
          ${emptyToNull(raw.enlistment_date) ? String(raw.enlistment_date).slice(0, 10) : null},
          ${emptyToNull(raw.interview_at)},
          ${emptyToNull(raw.next_status_update_at)},
          ${JSON.stringify(observance)}::jsonb,
          ${JSON.stringify(quizQuestions)}::jsonb,
          ${toNumber(raw.quiz_score)},
          ${toBool(raw.quiz_passed) ?? false},
          ${toBool(raw.quiz_skipped) ?? false},
          ${emptyToNull(raw.interview_summary)},
          ${emptyToNull(raw.interviewer_notes)},
          ${emptyToNull(raw.instructions)},
          ${JSON.stringify(instructionItems)}::jsonb,
          ${JSON.stringify(instructionRecipients)}::jsonb,
          ${toBool(raw.is_draft) ?? false},
          ${toNumber(raw.draft_step)},
          ${JSON.stringify(updateLog)}::jsonb,
          ${emptyToNull(raw.created_by_name)}
        )
        on conflict (legacy_base44_id) do nothing
      `;
      candidatesImported += 1;
    }
  }

  // 4. Verify table counts
  const finalMalshabim = (await sql`select count(*)::int as count from public.malshabim_candidates`) as Array<{ count: number }>;
  const finalNagadimCandidates = (await sql`select count(*)::int as count from public.nagadim_candidates`) as Array<{ count: number }>;
  const finalNagadimPositions = (await sql`select count(*)::int as count from public.nagadim_positions`) as Array<{ count: number }>;

  return NextResponse.json({
    success: true,
    executedStatements: executedStatements.length,
    candidatesImported,
    counts: {
      malshabim_candidates: finalMalshabim[0]?.count ?? 0,
      nagadim_candidates: finalNagadimCandidates[0]?.count ?? 0,
      nagadim_positions: finalNagadimPositions[0]?.count ?? 0,
    },
  });
}
