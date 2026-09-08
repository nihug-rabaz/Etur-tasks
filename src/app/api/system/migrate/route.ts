import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import initialCandidates from "@/modules/malshabim/data/initial-candidates.json";

const MIGRATION_TOKEN = "etur-db-migrate-2026-auth";

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

  const malshabimSample = await sql`
    select id, full_name, candidate_status, created_at 
    from public.malshabim_candidates 
    limit 5
  `;

  const totalMalshabim = (await sql`select count(*)::int as count from public.malshabim_candidates`) as Array<{ count: number }>;

  return NextResponse.json({
    status: "ready",
    existingTables: tables.map((t) => (t as { table_name: string }).table_name),
    totalMalshabim: totalMalshabim[0]?.count ?? 0,
    sample: malshabimSample,
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

  // Import all 79 candidates
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of initialCandidates as Record<string, unknown>[]) {
    if (toBool(raw.is_sample) === true) {
      skipped += 1;
      continue;
    }
    const legacyId = emptyToNull(raw.id);
    const fullName = emptyToNull(raw.full_name);
    if (!legacyId && !fullName) {
      skipped += 1;
      continue;
    }

    const observance = parseJsonField(raw.observance, {});
    const quizQuestions = parseJsonField(raw.quiz_questions, []);
    const instructionItems = parseJsonField(raw.instruction_items, []);
    const instructionRecipients = parseJsonField(raw.instruction_recipients, []);
    const updateLog = parseJsonField(raw.update_log, []);

    const res = await sql`
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
      on conflict (legacy_base44_id) do update set
        full_name = excluded.full_name,
        phone = excluded.phone,
        city = excluded.city,
        candidate_status = excluded.candidate_status,
        advanced_status = excluded.advanced_status,
        updated_at = now()
      returning (xmax = 0) as is_insert
    `;

    if ((res as Array<{ is_insert: boolean }>)[0]?.is_insert) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  const finalMalshabim = (await sql`select count(*)::int as count from public.malshabim_candidates`) as Array<{ count: number }>;

  return NextResponse.json({
    success: true,
    inserted,
    updated,
    skipped,
    totalCount: finalMalshabim[0]?.count ?? 0,
  });
}
