/**
 * Only these people may approve/reject candidates awaiting admin approval.
 * Matched loosely against profile name (Hebrew).
 */
const APPROVER_NAME_PATTERNS = [
  /ישראל/u,
  /קובי/u,
] as const;

export function isMalshabimCandidateApprover(profile: {
  name?: string | null;
  email?: string | null;
}): boolean {
  const name = (profile.name ?? "").trim();
  if (!name) return false;
  return APPROVER_NAME_PATTERNS.some((pattern) => pattern.test(name));
}
