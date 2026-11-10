/**
 * Profiles allowed as הנחיות לביצוע assignees:
 * ישראל עידאן, קובי קליין, Ari Schwartz / אריאל שווארץ.
 * Prefer compound name matches to avoid unrelated ישראל/קובי/אריאל profiles.
 */
export function isMalshabimInstructionAssigneeName(
  name?: string | null,
): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return false;

  // ישראל עידאן
  if (
    (/ישראל/u.test(trimmed) && /עידאן/u.test(trimmed)) ||
    (/israel/iu.test(trimmed) && /idan/iu.test(trimmed))
  ) {
    return true;
  }

  // קובי קליין
  if (
    (/קובי/u.test(trimmed) && /קליין/u.test(trimmed)) ||
    (/kobi/iu.test(trimmed) && /klein/iu.test(trimmed)) ||
    (/coby/iu.test(trimmed) && /klein/iu.test(trimmed))
  ) {
    return true;
  }

  // Ari Schwartz / אריאל שווארץ / שוורץ
  const hasSchwartz =
    /schwartz/iu.test(trimmed) || /שוו?ארץ/u.test(trimmed);
  if (
    (hasSchwartz && (/אריאל/u.test(trimmed) || /\bari\b/iu.test(trimmed))) ||
    /^ari\s+schwartz$/iu.test(trimmed)
  ) {
    return true;
  }

  return false;
}

type InstructionAssigneeLike = {
  user_id?: string | null;
  name?: string | null;
  email?: string | null;
};

type InstructionItemLike = {
  assignees?: InstructionAssigneeLike[] | null;
  assignee_user_id?: string | null;
  assignee_name?: string | null;
  assignee_email?: string | null;
  recipients?: string[] | null;
  [key: string]: unknown;
};

/** Drop assignees whose names are outside the allowlist (server-side gate). */
export function sanitizeInstructionItemsForAllowlist(
  items: unknown[] | null | undefined,
): unknown[] | undefined {
  if (items == null) return undefined;
  if (!Array.isArray(items)) return [];

  return items.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const item = raw as InstructionItemLike;
    const fromAssignees = Array.isArray(item.assignees)
      ? item.assignees.filter((a) =>
          isMalshabimInstructionAssigneeName(a?.name ?? null),
        )
      : [];

    let assignees = fromAssignees;
    if (
      assignees.length === 0 &&
      item.assignee_user_id &&
      isMalshabimInstructionAssigneeName(item.assignee_name ?? null)
    ) {
      assignees = [
        {
          user_id: item.assignee_user_id,
          name: item.assignee_name ?? null,
          email: item.assignee_email ?? null,
        },
      ];
    }

    const primary = assignees[0] ?? null;
    return {
      ...item,
      assignees,
      assignee_user_id: primary?.user_id ?? null,
      assignee_name: primary?.name ?? null,
      assignee_email: primary?.email ?? null,
      recipients: assignees
        .map((a) => a.user_id)
        .filter((id): id is string => Boolean(id)),
    };
  });
}
