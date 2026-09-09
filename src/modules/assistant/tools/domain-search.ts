import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";
import { NagadimCandidateService } from "@/modules/nagadim/services/candidate.service";
import type { ModuleAccessContext } from "@/shared/modules/types";

export type DomainSearchModule = "agam" | "malshabim" | "nagadim" | "all";

function canModule(
  moduleId: "agam" | "malshabim" | "nagadim",
  access: ModuleAccessContext,
): boolean {
  return access.isPlatformAdmin || Boolean(access.moduleRoles[moduleId]);
}

function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

export async function searchDomainCandidates(input: {
  access: ModuleAccessContext;
  module?: DomainSearchModule;
  q: string;
  limit?: number;
}): Promise<{
  ok: boolean;
  summary: string;
  data: {
    query: string;
    total: number;
    totalMatched: number;
    truncated: boolean;
    candidates: Array<Record<string, unknown>>;
  };
}> {
  const q = normalizeQuery(input.q);
  if (q.length < 2) {
    return {
      ok: false,
      summary: "כתוב לפחות 2 תווים לחיפוש (עיר / שם / טלפון)",
      data: { query: input.q.trim(), total: 0, totalMatched: 0, truncated: false, candidates: [] },
    };
  }

  const moduleFilter = input.module ?? "all";
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 80);
  const candidates: Array<Record<string, unknown>> = [];
  let totalMatched = 0;

  if ((moduleFilter === "all" || moduleFilter === "malshabim") && canModule("malshabim", input.access)) {
    const access = await new MalshabimAccessService().requireMalshabimAccess();
    if (!("error" in access)) {
      const { rows, totalMatched: matched } = await new MalshabimCandidateService().searchText(
        q,
        limit,
      );
      totalMatched += matched;
      for (const c of rows) {
        candidates.push({
          id: c.id,
          module: "malshabim",
          name: c.full_name,
          serial: c.serial_number,
          city: c.city,
          phone: c.phone,
          status: c.candidate_status,
          href: `/malshabim/candidates/${c.id}`,
        });
      }
    }
  }

  if ((moduleFilter === "all" || moduleFilter === "agam") && canModule("agam", input.access)) {
    const access = await new AgamAccessService().requireAgamAccess();
    if (!("error" in access)) {
      const rows = await new AgamCandidateService().list(false, 2000);
      const filtered = rows.filter((c) => {
        const hay = [
          c.full_name,
          c.personal_number,
          c.phone,
          c.status,
          c.cycle_name,
          c.command,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q.toLowerCase());
      });
      totalMatched += filtered.length;
      for (const c of filtered.slice(0, limit)) {
        candidates.push({
          id: c.id,
          module: "agam",
          name: c.full_name,
          personalNumber: c.personal_number,
          phone: c.phone,
          status: c.status,
          city: null,
          href: `/agam/candidates/${c.id}`,
        });
      }
    }
  }

  if ((moduleFilter === "all" || moduleFilter === "nagadim") && canModule("nagadim", input.access)) {
    const access = await new NagadimAccessService().requireNagadimAccess();
    if (!("error" in access)) {
      const rows = await new NagadimCandidateService().list(2000);
      const filtered = rows.filter((c) => {
        const hay = [c.full_name, c.current_stage, c.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q.toLowerCase());
      });
      totalMatched += filtered.length;
      for (const c of filtered.slice(0, limit)) {
        candidates.push({
          id: c.id,
          module: "nagadim",
          name: c.full_name,
          status: c.current_stage,
          href: `/nagadim/active`,
        });
      }
    }
  }

  // Prefer malshabim city hits first when module=all; then round-robin remaining modules
  const malshabim = candidates.filter((c) => c.module === "malshabim");
  const others = candidates.filter((c) => c.module !== "malshabim");
  const merged: Array<Record<string, unknown>> = [];
  for (const row of malshabim) {
    if (merged.length >= limit) break;
    merged.push(row);
  }
  let i = 0;
  while (merged.length < limit && others.length > 0) {
    let added = false;
    if (i < others.length) {
      merged.push(others[i]!);
      added = true;
    }
    i += 1;
    if (!added) break;
  }

  const truncated = totalMatched > merged.length;
  return {
    ok: true,
    summary: merged.length
      ? truncated
        ? `מצאתי ${totalMatched} התאמות ל"${input.q.trim()}" (מציג ${merged.length})`
        : `מצאתי ${merged.length} מועמדים ל"${input.q.trim()}"`
      : `לא מצאתי מועמדים ל"${input.q.trim()}" בכל הדאטה בייס`,
    data: {
      query: input.q.trim(),
      total: merged.length,
      totalMatched,
      truncated,
      candidates: merged,
    },
  };
}

export async function getDomainCandidate(input: {
  access: ModuleAccessContext;
  module: "agam" | "malshabim" | "nagadim";
  id: string;
}): Promise<{ ok: boolean; summary: string; data?: Record<string, unknown> }> {
  const id = input.id.trim();
  if (!id) return { ok: false, summary: "חסר id" };
  if (!canModule(input.module, input.access)) {
    return { ok: false, summary: `אין הרשאה למודול ${input.module}` };
  }

  if (input.module === "malshabim") {
    const access = await new MalshabimAccessService().requireMalshabimAccess();
    if ("error" in access) return { ok: false, summary: String(access.error ?? "אין הרשאה") };
    const c = await new MalshabimCandidateService().getById(id);
    if (!c) return { ok: false, summary: "מועמד לא נמצא" };
    return {
      ok: true,
      summary: c.full_name || "מועמד",
      data: {
        id: c.id,
        module: "malshabim",
        name: c.full_name,
        serial: c.serial_number,
        city: c.city,
        phone: c.phone,
        idNumber: c.id_number,
        personalNumber: c.personal_number,
        status: c.candidate_status,
        advancedStatus: c.advanced_status,
        statusType: c.status_type,
        requestType: c.request_type,
        track: c.recruitment_track,
        enlistmentDate: c.enlistment_date,
        interviewAt: c.interview_at,
        interviewSummary: c.interview_summary,
        interviewerNotes: c.interviewer_notes,
        instructions: c.instructions,
        quizScore: c.quiz_score,
        quizPassed: c.quiz_passed,
        href: `/malshabim/candidates/${c.id}`,
      },
    };
  }

  if (input.module === "agam") {
    const access = await new AgamAccessService().requireAgamAccess();
    if ("error" in access) return { ok: false, summary: String(access.error ?? "אין הרשאה") };
    const c = await new AgamCandidateService().getById(id);
    if (!c) return { ok: false, summary: "מועמד לא נמצא" };
    return {
      ok: true,
      summary: c.full_name,
      data: {
        id: c.id,
        module: "agam",
        name: c.full_name,
        personalNumber: c.personal_number,
        phone: c.phone,
        status: c.status,
        command: c.command,
        cycle: c.cycle_name,
        gaps: c.gaps,
        ramadNotes: c.ramad_notes,
        href: `/agam/candidates/${c.id}`,
      },
    };
  }

  const access = await new NagadimAccessService().requireNagadimAccess();
  if ("error" in access) return { ok: false, summary: String(access.error ?? "אין הרשאה") };
  const c = await new NagadimCandidateService().getById(id);
  if (!c) return { ok: false, summary: "מועמד לא נמצא" };
  return {
    ok: true,
    summary: c.full_name,
    data: {
      id: c.id,
      module: "nagadim",
      name: c.full_name,
      status: c.current_stage,
      notes: c.notes,
      stageEvents: (c.stage_events ?? []).slice(0, 12).map((e) => ({
        stage: e.stage,
        person: e.person_name,
        date: e.event_date,
        notes: e.notes,
      })),
      href: `/nagadim/active`,
    },
  };
}
