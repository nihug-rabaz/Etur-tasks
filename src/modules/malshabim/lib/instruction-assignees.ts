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

/** @deprecated Name allowlist replaced by malshabim module roles. */
export function isMalshabimInstructionAssigneeName(
  _name?: string | null,
): boolean {
  return true;
}

function isAllowedUserId(
  userId: string | null | undefined,
  allowedUserIds?: Set<string> | null,
): boolean {
  if (!userId) return false;
  if (!allowedUserIds) return true;
  return allowedUserIds.has(userId);
}

/**
 * Keep only assignees with malshabim module access (user/admin).
 * When `allowedUserIds` is omitted, user_id presence is enough (legacy callers).
 */
export function sanitizeInstructionItemsForAllowlist(
  items: unknown[] | null | undefined,
  allowedUserIds?: Set<string> | null,
): unknown[] | undefined {
  if (items == null) return undefined;
  if (!Array.isArray(items)) return [];

  return items.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const item = raw as InstructionItemLike;
    const fromAssignees = Array.isArray(item.assignees)
      ? item.assignees.filter((a) =>
          isAllowedUserId(a?.user_id ?? null, allowedUserIds),
        )
      : [];

    let assignees = fromAssignees;
    if (
      assignees.length === 0 &&
      isAllowedUserId(item.assignee_user_id ?? null, allowedUserIds)
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
