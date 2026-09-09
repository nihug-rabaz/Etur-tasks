import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { MalshabimAccessService } from "@/modules/malshabim/services/access.service";
import { MalshabimCandidateService } from "@/modules/malshabim/services/candidate.service";
import { NagadimAccessService } from "@/modules/nagadim/services/access.service";
import { NagadimCandidateService } from "@/modules/nagadim/services/candidate.service";
import type { ModuleAccessContext } from "@/shared/modules/types";

export type ScreeningModule = "agam" | "malshabim" | "nagadim" | "all";

function canModule(
  moduleId: "agam" | "malshabim" | "nagadim",
  access: ModuleAccessContext,
): boolean {
  return access.isPlatformAdmin || Boolean(access.moduleRoles[moduleId]);
}

function slimAgam(c: {
  id: string;
  full_name: string;
  personal_number: string;
  status: string;
  cycle_name?: string | null;
  phone?: string | null;
}) {
  return {
    id: c.id,
    name: c.full_name,
    personalNumber: c.personal_number,
    status: c.status,
    statusLabel: "ממתין",
    cycle: c.cycle_name ?? null,
    phone: c.phone ?? null,
    module: "agam" as const,
    href: `/agam/candidates/${c.id}`,
  };
}

function slimMalshabim(c: {
  id: string;
  full_name: string | null;
  candidate_status: string | null;
  phone?: string | null;
  personal_number?: string | null;
  city?: string | null;
  serial_number?: number | null;
}) {
  return {
    id: c.id,
    name: c.full_name ?? "ללא שם",
    serial: c.serial_number ?? null,
    personalNumber: c.personal_number ?? null,
    status: c.candidate_status,
    statusLabel: c.candidate_status,
    city: c.city ?? null,
    phone: c.phone ?? null,
    module: "malshabim" as const,
    href: `/malshabim/candidates/${c.id}`,
  };
}

function slimNagadim(c: {
  id: string;
  full_name: string;
  personal_number?: string | null;
  current_stage: string;
  phone?: string | null;
}) {
  return {
    id: c.id,
    name: c.full_name,
    personalNumber: c.personal_number ?? null,
    status: c.current_stage,
    statusLabel: c.current_stage,
    phone: c.phone ?? null,
    module: "nagadim" as const,
    href: `/nagadim/active`,
  };
}

/**
 * "מחכים בתהליך מיון" — module-specific waiting filters.
 * agam: status=pending
 * malshabim: ממתין לריאיון | בטיפול
 * nagadim: still on pipeline (all listed stages are in-process; exclude none by default)
 */
export async function listWaitingScreening(input: {
  access: ModuleAccessContext;
  module?: ScreeningModule;
  limit?: number;
}): Promise<{
  ok: boolean;
  summary: string;
  data: {
    total: number;
    byModule: Record<string, number>;
    candidates: Array<Record<string, unknown>>;
  };
}> {
  const moduleFilter = input.module ?? "all";
  const limit = Math.min(Math.max(input.limit ?? 80, 1), 200);
  const candidates: Array<Record<string, unknown>> = [];
  const byModule: Record<string, number> = {};

  if ((moduleFilter === "all" || moduleFilter === "agam") && canModule("agam", input.access)) {
    const access = await new AgamAccessService().requireAgamAccess();
    if (!("error" in access)) {
      const rows = await new AgamCandidateService().list(false, 300);
      const waiting = rows.filter((r) => r.status === "pending").slice(0, limit);
      byModule.agam = waiting.length;
      candidates.push(...waiting.map(slimAgam));
    }
  }

  if (
    (moduleFilter === "all" || moduleFilter === "malshabim") &&
    canModule("malshabim", input.access)
  ) {
    const access = await new MalshabimAccessService().requireMalshabimAccess();
    if (!("error" in access)) {
      const rows = await new MalshabimCandidateService().list(400);
      const waiting = rows
        .filter(
          (r) =>
            r.candidate_status === "ממתין לריאיון" ||
            r.candidate_status === "בטיפול" ||
            r.candidate_status === "חדש" ||
            r.candidate_status === "ממתין לעדכון",
        )
        .slice(0, limit);
      byModule.malshabim = waiting.length;
      candidates.push(...waiting.map(slimMalshabim));
    }
  }

  if (
    (moduleFilter === "all" || moduleFilter === "nagadim") &&
    canModule("nagadim", input.access)
  ) {
    const access = await new NagadimAccessService().requireNagadimAccess();
    if (!("error" in access)) {
      const rows = await new NagadimCandidateService().list(300);
      const waiting = rows.slice(0, limit);
      byModule.nagadim = waiting.length;
      candidates.push(...waiting.map(slimNagadim));
    }
  }

  const clipped = candidates.slice(0, limit);
  return {
    ok: true,
    summary: clipped.length
      ? `מצאתי ${clipped.length} ממתינים במיון`
      : "אין ממתינים כרגע",
    data: {
      total: clipped.length,
      byModule,
      candidates: clipped,
    },
  };
}
