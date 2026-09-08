/**
 * Import Base44 Candidate_export CSV into malshabim_candidates.
 *
 * Usage:
 *   node scripts/import-malshabim-candidates.mjs [path-to-csv]
 *
 * Default CSV path:
 *   C:/Users/liad0/Downloads/Candidate_export (1).csv
 *
 * Requires DATABASE_URL in .env.local (valid Neon URL).
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import XLSX from "xlsx";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
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
}

function parseJsonField(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toBool(value) {
  if (value === true || value === "true" || value === "TRUE" || value === "1") return true;
  if (value === false || value === "false" || value === "FALSE" || value === "0") return false;
  return null;
}

function toNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function emptyToNull(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

loadEnvLocal();

const isDryRun = process.argv.includes("--dry-run");
const databaseUrl = (process.env.DATABASE_URL || "").trim();
if (!isDryRun && (!databaseUrl || databaseUrl.length < 20 || !/^postgres/.test(databaseUrl))) {
  console.error(
    "DATABASE_URL missing or invalid in .env.local. Pass --dry-run to test parse, or configure Neon URL.",
  );
  process.exit(1);
}

const csvArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const defaultCsv = "C:/Users/liad0/Downloads/Candidate_export (1).csv";
const csvPath = resolve(csvArg || defaultCsv);
if (!existsSync(csvPath)) {
  console.error("CSV not found:", csvPath);
  process.exit(1);
}

const rawCsv = readFileSync(csvPath, "utf8");
const workbook = XLSX.read(rawCsv, { type: "string" });
const firstSheetName = workbook.SheetNames[0];
const records = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
  defval: "",
});

if (isDryRun) {
  let valid = 0;
  let sampleCount = 0;
  for (const row of records) {
    if (toBool(row.is_sample) === true) {
      sampleCount += 1;
    } else if (emptyToNull(row.id) || emptyToNull(row.full_name)) {
      valid += 1;
    }
  }
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        csv: csvPath,
        totalRows: records.length,
        validCandidates: valid,
        sampleRows: sampleCount,
        firstCandidateSample: {
          id: records[0]?.id,
          name: records[0]?.full_name,
          city: records[0]?.city,
          status: records[0]?.candidate_status,
        },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const sql = neon(databaseUrl);

let inserted = 0;
let updated = 0;
let skipped = 0;
let samples = 0;

for (const row of records) {
  if (toBool(row.is_sample) === true) {
    samples += 1;
    skipped += 1;
    continue;
  }

  const legacyId = emptyToNull(row.id);
  const fullName = emptyToNull(row.full_name);
  if (!legacyId && !fullName) {
    skipped += 1;
    continue;
  }

  const payload = {
    legacy_base44_id: legacyId,
    full_name: fullName,
    phone: emptyToNull(row.phone),
    id_number: emptyToNull(row.id_number),
    personal_number: emptyToNull(row.personal_number),
    serial_number: toNumber(row.serial_number),
    city: emptyToNull(row.city),
    photo_url: emptyToNull(row.photo_url),
    candidate_status: emptyToNull(row.candidate_status) || "חדש",
    advanced_status: emptyToNull(row.advanced_status) || "בטיפול",
    status_type: emptyToNull(row.status_type),
    request_type: emptyToNull(row.request_type),
    recruitment_track: emptyToNull(row.recruitment_track),
    enlistment_date: emptyToNull(row.enlistment_date),
    interview_at: emptyToNull(row.interview_at),
    next_status_update_at: emptyToNull(row.next_status_update_at),
    observance: parseJsonField(row.observance, {}),
    quiz_questions: parseJsonField(row.quiz_questions, []),
    quiz_score: toNumber(row.quiz_score),
    quiz_passed: toBool(row.quiz_passed) ?? false,
    quiz_skipped: toBool(row.quiz_skipped) ?? false,
    interview_summary: emptyToNull(row.interview_summary),
    interviewer_notes: emptyToNull(row.interviewer_notes),
    instructions: emptyToNull(row.instructions),
    instruction_items: parseJsonField(row.instruction_items, []),
    instruction_recipients: parseJsonField(row.instruction_recipients, []),
    is_draft: toBool(row.is_draft) ?? false,
    draft_step: toNumber(row.draft_step),
    update_log: parseJsonField(row.update_log, []),
    created_by_name: emptyToNull(row.created_by),
  };

  const existing = legacyId
    ? await sql`
        select id from malshabim_candidates
        where legacy_base44_id = ${legacyId}
        limit 1
      `
    : [];

  if (existing.length > 0) {
    await sql`
      update malshabim_candidates set
        full_name = ${payload.full_name},
        phone = ${payload.phone},
        id_number = ${payload.id_number},
        personal_number = ${payload.personal_number},
        serial_number = ${payload.serial_number},
        city = ${payload.city},
        photo_url = ${payload.photo_url},
        candidate_status = ${payload.candidate_status},
        advanced_status = ${payload.advanced_status},
        status_type = ${payload.status_type},
        request_type = ${payload.request_type},
        recruitment_track = ${payload.recruitment_track},
        enlistment_date = ${payload.enlistment_date},
        interview_at = ${payload.interview_at},
        next_status_update_at = ${payload.next_status_update_at},
        observance = ${JSON.stringify(payload.observance)}::jsonb,
        quiz_questions = ${JSON.stringify(payload.quiz_questions)}::jsonb,
        quiz_score = ${payload.quiz_score},
        quiz_passed = ${payload.quiz_passed},
        quiz_skipped = ${payload.quiz_skipped},
        interview_summary = ${payload.interview_summary},
        interviewer_notes = ${payload.interviewer_notes},
        instructions = ${payload.instructions},
        instruction_items = ${JSON.stringify(payload.instruction_items)}::jsonb,
        instruction_recipients = ${JSON.stringify(payload.instruction_recipients)}::jsonb,
        is_draft = ${payload.is_draft},
        draft_step = ${payload.draft_step},
        update_log = ${JSON.stringify(payload.update_log)}::jsonb,
        created_by_name = ${payload.created_by_name},
        updated_at = now()
      where id = ${existing[0].id}
    `;
    updated += 1;
  } else {
    await sql`
      insert into malshabim_candidates (
        legacy_base44_id, full_name, phone, id_number, personal_number, serial_number,
        city, photo_url, candidate_status, advanced_status, status_type, request_type,
        recruitment_track, enlistment_date, interview_at, next_status_update_at,
        observance, quiz_questions, quiz_score, quiz_passed, quiz_skipped,
        interview_summary, interviewer_notes, instructions, instruction_items,
        instruction_recipients, is_draft, draft_step, update_log, created_by_name
      ) values (
        ${payload.legacy_base44_id},
        ${payload.full_name},
        ${payload.phone},
        ${payload.id_number},
        ${payload.personal_number},
        ${payload.serial_number},
        ${payload.city},
        ${payload.photo_url},
        ${payload.candidate_status},
        ${payload.advanced_status},
        ${payload.status_type},
        ${payload.request_type},
        ${payload.recruitment_track},
        ${payload.enlistment_date},
        ${payload.interview_at},
        ${payload.next_status_update_at},
        ${JSON.stringify(payload.observance)}::jsonb,
        ${JSON.stringify(payload.quiz_questions)}::jsonb,
        ${payload.quiz_score},
        ${payload.quiz_passed},
        ${payload.quiz_skipped},
        ${payload.interview_summary},
        ${payload.interviewer_notes},
        ${payload.instructions},
        ${JSON.stringify(payload.instruction_items)}::jsonb,
        ${JSON.stringify(payload.instruction_recipients)}::jsonb,
        ${payload.is_draft},
        ${payload.draft_step},
        ${JSON.stringify(payload.update_log)}::jsonb,
        ${payload.created_by_name}
      )
    `;
    inserted += 1;
  }
}

console.log(
  JSON.stringify(
    {
      csv: csvPath,
      rows: records.length,
      inserted,
      updated,
      skipped,
      samplesSkipped: samples,
    },
    null,
    2,
  ),
);

