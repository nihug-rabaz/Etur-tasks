import type { AgamCandidate } from "@/modules/agam/types";
import type { ModuleRole } from "@/shared/modules/types";
import { canRamad } from "@/modules/agam/lib/permissions";

export function redactCandidateForRole(candidate: AgamCandidate, role: ModuleRole): AgamCandidate {
  if (canRamad(role)) return candidate;
  return { ...candidate, ramad_notes: null };
}
