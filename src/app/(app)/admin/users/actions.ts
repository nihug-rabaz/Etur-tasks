"use server";

import { revalidatePath } from "next/cache";
import { AuthorizationService } from "@/services/authorization.service";
import { NeonDatabase } from "@/lib/db/neon";

export async function updateUserRoleAction(formData: FormData) {
  const authorizationService = new AuthorizationService();
  await authorizationService.ensureAdmin();
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role"));
  const sql = NeonDatabase.createClient();
  await sql`update profiles set role = ${role} where id = ${userId}`;
  revalidatePath("/admin/users");
}

export async function syncUserPermissionsAction(formData: FormData) {
  const authorizationService = new AuthorizationService();
  await authorizationService.ensureAdmin();
  const userId = String(formData.get("userId"));
  const selectedSubtopicIds = formData
    .getAll("subtopicIds")
    .map((value) => String(value))
    .filter(Boolean);
  const sql = NeonDatabase.createClient();
  await sql`delete from user_subtopic_permissions where user_id = ${userId}`;
  if (selectedSubtopicIds.length > 0) {
    await sql`
      insert into user_subtopic_permissions (user_id, subtopic_id)
      select ${userId}, subtopics.id
      from subtopics
      where subtopics.id = any(${selectedSubtopicIds})
      on conflict (user_id, subtopic_id) do nothing
    `;
  }
  revalidatePath("/admin/users");
}

export async function approveUserAction(formData: FormData) {
  const authorizationService = new AuthorizationService();
  const admin = await authorizationService.ensureAdmin();
  const userId = String(formData.get("userId"));
  const sql = NeonDatabase.createClient();
  await sql`
    update profiles
    set is_approved = true, approved_at = now(), approved_by = ${admin.id}
    where id = ${userId}
  `;
  revalidatePath("/admin/users");
}

export async function setUserPendingAction(formData: FormData) {
  const authorizationService = new AuthorizationService();
  await authorizationService.ensureAdmin();
  const userId = String(formData.get("userId"));
  const sql = NeonDatabase.createClient();
  await sql`
    update profiles
    set is_approved = false, approved_at = null, approved_by = null
    where id = ${userId}
  `;
  revalidatePath("/admin/users");
}
