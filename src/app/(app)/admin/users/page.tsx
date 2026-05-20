import { AuthorizationService } from "@/services/authorization.service";
import { UserService } from "@/services/user.service";
import { NeonDatabase } from "@/lib/db/neon";
import { toHebrewSubtopicLabel } from "@/lib/ui/labels";
import { UsersManagementPanel } from "@/components/admin/users-management-panel";
import {
  approveUserAction,
  setUserPendingAction,
  syncUserPermissionsAction,
  updateUserRoleAction,
} from "@/app/(app)/admin/users/actions";

const domainLabelMap: Record<string, string> = {
  Recruitment: "איתור",
  Positioning: "מיצוב",
  General: "כללי",
};

export default async function AdminUsersPage() {
  const authorizationService = new AuthorizationService();
  await authorizationService.ensureAdmin();
  const userService = new UserService();
  const users = await userService.getUsers();
  const sql = NeonDatabase.createClient();
  const subtopics = await sql<Array<{ id: string; name: string; domain_name: string; domain_slug: string }>>`
    select distinct on (d.slug, s.name)
      s.id,
      s.name,
      d.name as domain_name,
      d.slug as domain_slug
    from subtopics s
    join domains d on d.id = s.domain_id
    order by
      d.slug,
      s.name,
      s.id
  `;
  const permissionRows = await sql<Array<{ user_id: string; subtopic_id: string; subtopic_name: string }>>`
    select usp.user_id, usp.subtopic_id, s.name as subtopic_name
    from user_subtopic_permissions usp
    join subtopics s on s.id = usp.subtopic_id
    order by s.name
  `;
  const permissionsByUser = new Map<string, Array<{ subtopic_id: string; subtopic_name: string }>>();
  for (const row of permissionRows) {
    const current = permissionsByUser.get(row.user_id) ?? [];
    current.push({ subtopic_id: row.subtopic_id, subtopic_name: row.subtopic_name });
    permissionsByUser.set(row.user_id, current);
  }
  const subtopicsByDomain = new Map<string, Array<{ id: string; name: string; domain_name: string }>>();
  for (const subtopic of subtopics) {
    const current = subtopicsByDomain.get(subtopic.domain_slug) ?? [];
    current.push({ id: subtopic.id, name: subtopic.name, domain_name: subtopic.domain_name });
    subtopicsByDomain.set(subtopic.domain_slug, current);
  }

  const permissionGroups = Array.from(subtopicsByDomain.entries()).map(([domainSlug, items]) => ({
    domainSlug,
    domainLabel: domainLabelMap[items[0]?.domain_name ?? ""] ?? items[0]?.domain_name ?? domainSlug,
    items: items.map((subtopic) => ({
      id: subtopic.id,
      name: toHebrewSubtopicLabel(subtopic.name),
    })),
  }));

  const permissionsRecord: Record<string, string[]> = {};
  for (const user of users) {
    permissionsRecord[user.id] = (permissionsByUser.get(user.id) ?? []).map((p) => p.subtopic_id);
  }

  const usersPayload = users.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? null,
    role: user.role,
    telegram_id: user.telegram_id,
    avatar: user.avatar,
    is_approved: user.is_approved,
    approved_at: user.approved_at != null ? String(user.approved_at) : null,
    approved_by: user.approved_by ?? null,
    created_at: String(user.created_at),
  }));

  return (
    <section className="pb-8">
      <UsersManagementPanel
        users={usersPayload}
        permissionGroups={permissionGroups}
        permissionsByUser={permissionsRecord}
        updateRoleAction={updateUserRoleAction}
        syncPermissionsAction={syncUserPermissionsAction}
        approveUserAction={approveUserAction}
        setPendingAction={setUserPendingAction}
      />
    </section>
  );
}
