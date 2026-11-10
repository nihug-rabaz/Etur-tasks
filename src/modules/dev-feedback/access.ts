import { Env } from "@/lib/env";
export {
  canSubmitDevFeedback,
  LIAD_MODULES,
  resolveDevAssigneeTarget,
  moduleLabel,
  LABEL_DEV_FEEDBACK,
  LABEL_AWAITING_KOBI,
  LABEL_APPROVED,
  LABEL_REJECTED,
  moduleLabelTag,
  parseModuleIdFromLabels,
} from "@/modules/dev-feedback/constants";

export function isDevFeedbackKobiApprover(profileEmail?: string | null): boolean {
  const expected = (Env.get("JIRA_KOBI_EMAIL") || "kobyklein88@gmail.com")
    .trim()
    .toLowerCase();
  const email = (profileEmail ?? "").trim().toLowerCase();
  return Boolean(email) && email === expected;
}
