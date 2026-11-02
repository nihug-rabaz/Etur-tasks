import { BaseService } from "@/services/base.service";
import { AppUrls } from "@/lib/urls/app-urls";
import {
  DEFAULT_APPROVAL_FLAGS,
  getInitialApprovalStatus,
  getNextApprovalStatus,
  type ApprovalRequirementFlags,
} from "@/modules/dovrut/lib/approval-flows";
import type { DovrutListScope } from "@/modules/dovrut/lib/record-scope";
import { DovrutProjectService } from "@/modules/dovrut/services/project.service";
import { ModuleRoleService } from "@/shared/services/module-role.service";
import { OneSignalService } from "@/services/onesignal.service";
import type {
  DovrutActivityLog,
  DovrutApprovalStatus,
  DovrutConcept,
  DovrutConceptType,
  DovrutDomain,
  DovrutWorkStatus,
} from "@/modules/dovrut/types";

function flagsFromConcept(concept: Pick<
  DovrutConcept,
  "requires_branch_head" | "requires_deputy_commander" | "requires_chief_rabbi"
>): ApprovalRequirementFlags {
  return {
    requires_branch_head: Boolean(concept.requires_branch_head),
    requires_deputy_commander: Boolean(concept.requires_deputy_commander),
    requires_chief_rabbi: Boolean(concept.requires_chief_rabbi),
  };
}

export class DovrutConceptService extends BaseService {
  public async list(filters?: {
    projectId?: string;
    type?: DovrutConceptType;
    approvalStatus?: DovrutApprovalStatus;
    activeOnly?: boolean;
    scope?: DovrutListScope;
  }): Promise<DovrutConcept[]> {
    const db = this.getDb();
    const scope = filters?.scope ?? "working";
    const projectId = filters?.projectId || null;
    const type = filters?.type ?? null;
    const approvalStatus = filters?.approvalStatus ?? null;
    return db<DovrutConcept[]>`
      select c.*, p.name as project_name
      from dovrut_concepts c
      join dovrut_projects p on p.id = c.project_id
      where (${projectId}::uuid is null or c.project_id = ${projectId})
        and (${type}::text is null or c.type = ${type})
        and (${approvalStatus}::text is null or c.approval_status = ${approvalStatus})
        and (
          ${scope} = 'deleted' and c.deleted_at is not null
          or ${scope} = 'drafts' and c.deleted_at is null and c.is_draft
            and c.archived_at is null
          or ${scope} = 'working' and c.deleted_at is null
            and c.archived_at is null
            and (not c.is_draft or ${projectId}::uuid is not null)
          or ${scope} = 'archived' and c.archived_at is not null and c.deleted_at is null
        )
        and (
          ${!(filters?.activeOnly ?? false)}::boolean
          or coalesce(c.work_status_article, c.work_status_social, 'planning') <> 'approved'
        )
      order by c.updated_at desc
    `;
  }

  public async getById(id: string): Promise<DovrutConcept | null> {
    const db = this.getDb();
    const rows = await db<DovrutConcept[]>`
      select c.*, p.name as project_name
      from dovrut_concepts c
      join dovrut_projects p on p.id = c.project_id
      where c.id = ${id}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async create(
    input: {
      name: string;
      project_id: string;
      type: DovrutConceptType;
      domain?: DovrutDomain | null;
      interviewees?: string[];
      media_outlet?: string | null;
      interviewer?: string | null;
      needs_briefing?: boolean;
      requires_chief_rabbi?: boolean;
      requires_deputy_commander?: boolean;
      requires_branch_head?: boolean;
      target_audience?: string | null;
      target_audiences?: string[];
      domains?: DovrutDomain[];
      is_draft?: boolean;
      link?: string | null;
      details?: string | null;
      notes?: string | null;
      content_type?: string | null;
      draft_text?: string | null;
      draft_images?: string[];
      draft_videos?: string[];
      partners?: string[];
      created_by: string;
    },
    actorName: string,
    actorEmail?: string | null,
  ): Promise<DovrutConcept> {
    const db = this.getDb();
    const isArticle = input.type === "article_interview";
    const flags: ApprovalRequirementFlags = {
      requires_chief_rabbi: input.requires_chief_rabbi ?? DEFAULT_APPROVAL_FLAGS.requires_chief_rabbi,
      requires_deputy_commander:
        input.requires_deputy_commander ?? DEFAULT_APPROVAL_FLAGS.requires_deputy_commander,
      requires_branch_head: input.requires_branch_head ?? DEFAULT_APPROVAL_FLAGS.requires_branch_head,
    };
    const approvalStatus = isArticle ? getInitialApprovalStatus(flags) : null;
    const needsBriefing = input.needs_briefing ?? true;
    const audiences =
      input.target_audiences?.length
        ? input.target_audiences
        : input.target_audience
          ? [input.target_audience]
          : [];
    const domains =
      input.domains?.length
        ? input.domains
        : input.domain
          ? [input.domain]
          : [];
    const rows = await db<DovrutConcept[]>`
      insert into dovrut_concepts (
        name, project_id, type, domain, domains, interviewees, media_outlet, interviewer, needs_briefing,
        requires_chief_rabbi, requires_deputy_commander, requires_branch_head, target_audience, target_audiences,
        link, details, notes, work_status_article, content_type, draft_text,
        draft_images, draft_videos, partners, work_status_social, approval_status, is_draft, created_by
      ) values (
        ${input.name},
        ${input.project_id},
        ${input.type},
        ${isArticle ? domains[0] ?? null : null},
        ${domains},
        ${isArticle ? input.interviewees ?? [] : []},
        ${isArticle ? input.media_outlet ?? null : null},
        ${isArticle ? input.interviewer ?? null : null},
        ${isArticle ? needsBriefing : false},
        ${isArticle ? flags.requires_chief_rabbi : false},
        ${isArticle ? flags.requires_deputy_commander : false},
        ${isArticle ? flags.requires_branch_head : false},
        ${audiences[0] ?? null},
        ${audiences},
        ${isArticle ? input.link ?? null : null},
        ${input.details ?? null},
        ${input.notes ?? null},
        ${isArticle ? "planning" : null},
        ${!isArticle ? input.content_type ?? "text" : null},
        ${!isArticle ? input.draft_text ?? null : null},
        ${!isArticle ? input.draft_images ?? [] : []},
        ${!isArticle ? input.draft_videos ?? [] : []},
        ${!isArticle ? input.partners ?? [] : []},
        ${!isArticle ? "planning" : null},
        ${approvalStatus},
        ${Boolean(input.is_draft)},
        ${input.created_by}
      )
      returning *
    `;
    const created = rows[0];
    await this.writeLog({
      concept_id: created.id,
      project_id: created.project_id,
      action_type: "created",
      details: "יצירת אייטם",
      user_name: actorName,
      user_email: actorEmail ?? null,
    });
    await new DovrutProjectService().touchUpdated(created.project_id);
    return (await this.getById(created.id))!;
  }

  public async update(
    id: string,
    patch: Partial<DovrutConcept>,
    actorName: string,
    actorEmail?: string | null,
  ): Promise<DovrutConcept | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = this.getDb();
    const nextLink =
      existing.type === "social_media"
        ? null
        : patch.link !== undefined
          ? patch.link
          : existing.link;
    const nextAudiences =
      patch.target_audiences ??
      (patch.target_audience !== undefined
        ? patch.target_audience
          ? [patch.target_audience]
          : []
        : existing.target_audiences ?? []);
    const nextDomains =
      patch.domains ??
      (patch.domain !== undefined
        ? patch.domain
          ? [patch.domain]
          : []
        : existing.domains ?? []);
    const rows = await db<DovrutConcept[]>`
      update dovrut_concepts set
        name = ${patch.name ?? existing.name},
        domain = ${nextDomains[0] ?? null},
        domains = ${nextDomains},
        interviewees = ${patch.interviewees ?? existing.interviewees},
        media_outlet = ${patch.media_outlet !== undefined ? patch.media_outlet : existing.media_outlet},
        interviewer = ${patch.interviewer !== undefined ? patch.interviewer : existing.interviewer},
        needs_briefing = ${patch.needs_briefing ?? existing.needs_briefing},
        requires_chief_rabbi = ${
          patch.requires_chief_rabbi ?? existing.requires_chief_rabbi
        },
        requires_deputy_commander = ${
          patch.requires_deputy_commander ?? existing.requires_deputy_commander
        },
        requires_branch_head = ${
          patch.requires_branch_head ?? existing.requires_branch_head
        },
        target_audience = ${nextAudiences[0] ?? null},
        target_audiences = ${nextAudiences},
        is_draft = ${patch.is_draft ?? existing.is_draft},
        link = ${nextLink},
        details = ${patch.details !== undefined ? patch.details : existing.details},
        notes = ${patch.notes !== undefined ? patch.notes : existing.notes},
        work_status_article = ${
          patch.work_status_article !== undefined
            ? patch.work_status_article
            : existing.work_status_article
        },
        content_type = ${patch.content_type !== undefined ? patch.content_type : existing.content_type},
        draft_text = ${patch.draft_text !== undefined ? patch.draft_text : existing.draft_text},
        draft_images = ${patch.draft_images ?? existing.draft_images},
        draft_videos = ${patch.draft_videos ?? existing.draft_videos},
        partners = ${patch.partners ?? existing.partners},
        work_status_social = ${
          patch.work_status_social !== undefined
            ? patch.work_status_social
            : existing.work_status_social
        },
        approval_status = ${
          patch.approval_status !== undefined ? patch.approval_status : existing.approval_status
        },
        rejection_reason = ${
          patch.rejection_reason !== undefined ? patch.rejection_reason : existing.rejection_reason
        },
        rejected_at_step = ${
          patch.rejected_at_step !== undefined ? patch.rejected_at_step : existing.rejected_at_step
        },
        last_rejection_date = ${
          patch.last_rejection_date !== undefined
            ? patch.last_rejection_date
            : existing.last_rejection_date
        },
        linked_task_id = ${
          patch.linked_task_id !== undefined ? patch.linked_task_id : existing.linked_task_id
        },
        briefing_done_at = ${
          patch.briefing_done_at !== undefined ? patch.briefing_done_at : existing.briefing_done_at ?? null
        },
        archived_at = ${
          patch.archived_at !== undefined ? patch.archived_at : existing.archived_at ?? null
        },
        last_approval_note = ${
          patch.last_approval_note !== undefined
            ? patch.last_approval_note
            : existing.last_approval_note ?? null
        },
        updated_at = now()
      where id = ${id}
      returning *
    `;
    if (
      patch.linked_task_id !== undefined &&
      patch.linked_task_id !== existing.linked_task_id
    ) {
      await this.syncTaskConceptLink(id, existing.linked_task_id, patch.linked_task_id);
    }
    await this.writeLog({
      concept_id: id,
      project_id: existing.project_id,
      action_type: "updated",
      details: "עדכון אייטם",
      user_name: actorName,
      user_email: actorEmail ?? null,
    });
    return rows[0] ? this.withProjectName(rows[0], existing.project_name) : null;
  }

  public async updateWorkStatus(
    id: string,
    status: DovrutWorkStatus,
    actorName: string,
    actorEmail?: string | null,
    options?: { source?: "concept" | "task" },
  ): Promise<DovrutConcept | null> {
    // Prefer setWorkStatus so waiting_approvals seeds approval_status + task sync.
    return this.setWorkStatus(id, status, actorName, actorEmail, options);
  }

  private withProjectName(row: DovrutConcept, projectName?: string): DovrutConcept {
    return { ...row, project_name: row.project_name ?? projectName };
  }

  public async delete(id: string, actorName: string, actorEmail?: string | null): Promise<boolean> {
    return this.softDelete(id, actorName, actorEmail);
  }

  public async softDelete(id: string, actorName: string, actorEmail?: string | null): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;
    const db = this.getDb();
    await this.writeLog({
      concept_id: id,
      project_id: existing.project_id,
      action_type: "deleted",
      details: existing.name,
      user_name: actorName,
      user_email: actorEmail ?? null,
    });
    const rows = await db<{ id: string }[]>`
      update dovrut_concepts
      set deleted_at = now(), updated_at = now()
      where id = ${id} and deleted_at is null
      returning id
    `;
    return rows.length > 0;
  }

  public async restore(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update dovrut_concepts
      set deleted_at = null, updated_at = now()
      where id = ${id} and deleted_at is not null
      returning id
    `;
    return rows.length > 0;
  }

  public async purge(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      delete from dovrut_concepts where id = ${id} returning id
    `;
    return rows.length > 0;
  }

  public async touchOpened(id: string): Promise<void> {
    const db = this.getDb();
    await db`
      update dovrut_concepts
      set last_opened_at = now()
      where id = ${id} and deleted_at is null
    `;
  }

  public async expireUnopened(days = 90): Promise<number> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update dovrut_concepts
      set deleted_at = now(), updated_at = now()
      where deleted_at is null
        and coalesce(last_opened_at, created_at) < now() - (${days}::int * interval '1 day')
      returning id
    `;
    return rows.length;
  }

  public async applyApproval(input: {
    conceptId: string;
    action: "approve" | "reject";
    approvalStep: DovrutApprovalStatus;
    notes: string;
    rejectionReason?: string;
    actorName: string;
    actorEmail?: string | null;
  }): Promise<DovrutConcept> {
    const notes = input.notes?.trim() ?? "";
    if (!notes) throw new Error("Notes are required");

    const concept = await this.getById(input.conceptId);
    if (!concept) throw new Error("Concept not found");
    if (concept.deleted_at) throw new Error("Concept deleted");
    if (concept.archived_at) throw new Error("Concept archived");
    if (concept.type !== "article_interview") throw new Error("Concept has no approval flow");
    if (concept.approval_status !== input.approvalStep) {
      throw new Error("Approval step mismatch");
    }
    const flags = flagsFromConcept(concept);

    if (input.action === "approve") {
      const next = getNextApprovalStatus(flags, input.approvalStep);
      if (!next) throw new Error("Already fully approved");
      const patch: Partial<DovrutConcept> = {
        approval_status: next,
        rejection_reason: "",
        rejected_at_step: "",
        last_approval_note: notes,
      };
      // Full chain approved → ביצוע (production), not פורסם
      if (next === "approved") {
        patch.work_status_article = "production";
      } else if (concept.work_status_article === "planning") {
        patch.work_status_article = "waiting_approvals";
      }
      const updated = await this.update(concept.id, patch, input.actorName, input.actorEmail);
      await this.writeLog({
        concept_id: concept.id,
        project_id: concept.project_id,
        action_type: "approval_changed",
        field_changed: "approval_status",
        old_value: input.approvalStep,
        new_value: next,
        details: notes || "אישור",
        user_name: input.actorName,
        user_email: input.actorEmail ?? null,
      });
      if (next === "approved") {
        await this.notifyAdminsOfFullApproval(updated!);
        const { syncLinkedTaskFromConcept } = await import(
          "@/modules/dovrut/lib/task-status-sync"
        );
        await syncLinkedTaskFromConcept(updated!);
      }
      return updated!;
    }

    const rejectionReason = input.rejectionReason?.trim() ?? "";
    if (!rejectionReason) throw new Error("Rejection reason is required");

    const reset = getInitialApprovalStatus(flags);
    const updated = await this.update(
      concept.id,
      {
        approval_status: reset,
        work_status_article: "planning",
        rejection_reason: rejectionReason,
        rejected_at_step: input.approvalStep,
        last_rejection_date: new Date().toISOString(),
        last_approval_note: notes,
      },
      input.actorName,
      input.actorEmail,
    );
    await this.writeLog({
      concept_id: concept.id,
      project_id: concept.project_id,
      action_type: "approval_changed",
      field_changed: "approval_status",
      old_value: input.approvalStep,
      new_value: reset,
      details: `${rejectionReason} · ${notes}`,
      user_name: input.actorName,
      user_email: input.actorEmail ?? null,
    });
    if (updated) {
      const { syncLinkedTaskFromConcept } = await import(
        "@/modules/dovrut/lib/task-status-sync"
      );
      await syncLinkedTaskFromConcept(updated);
    }
    return updated!;
  }

  public async markBriefingDone(
    id: string,
    actorName: string,
    actorEmail?: string | null,
  ): Promise<DovrutConcept | null> {
    return this.update(
      id,
      { briefing_done_at: new Date().toISOString() },
      actorName,
      actorEmail,
    );
  }

  public async publishWithLink(
    id: string,
    link: string,
    actorName: string,
    actorEmail?: string | null,
  ): Promise<DovrutConcept | null> {
    const existing = await this.getById(id);
    if (!existing || existing.deleted_at) return null;
    const trimmed = link.trim();
    if (!trimmed) throw new Error("Link is required");
    const patch: Partial<DovrutConcept> =
      existing.type === "article_interview"
        ? { link: trimmed, work_status_article: "approved" }
        : { work_status_social: "approved" };
    const updated = await this.update(id, patch, actorName, actorEmail);
    if (updated) {
      const { syncLinkedTaskFromConcept } = await import(
        "@/modules/dovrut/lib/task-status-sync"
      );
      await syncLinkedTaskFromConcept(updated);
    }
    return updated;
  }

  public async archive(
    id: string,
    actorName: string,
    actorEmail?: string | null,
  ): Promise<DovrutConcept | null> {
    const existing = await this.getById(id);
    if (!existing || existing.deleted_at) return null;
    const patch: Partial<DovrutConcept> = {
      archived_at: new Date().toISOString(),
    };
    if (existing.link) {
      if (existing.type === "article_interview") {
        patch.work_status_article = "approved";
      } else {
        patch.work_status_social = "approved";
      }
    }
    const updated = await this.update(id, patch, actorName, actorEmail);
    if (updated) {
      const { syncLinkedTaskFromConcept } = await import(
        "@/modules/dovrut/lib/task-status-sync"
      );
      await syncLinkedTaskFromConcept(updated);
    }
    return updated;
  }

  public async notifyAdminsOfFullApproval(concept: DovrutConcept): Promise<void> {
    try {
      const users = await new ModuleRoleService().listModuleUsers("dovrut");
      const adminIds = users.filter((u) => u.role === "admin").map((u) => u.user_id);
      if (adminIds.length === 0) return;
      const origin = AppUrls.getOrigin();
      const url = origin ? `${origin}/dovrut/items/${concept.id}` : undefined;
      const text = [
        "דוברות · אושר לביצוע",
        concept.name,
        "כל שלבי האישור הושלמו — ניתן להמשיך לביצוע/פרסום.",
      ].join("\n");
      await new OneSignalService().sendDirectMessages(adminIds, text, url);
    } catch (error) {
      console.error("[dovrut-approval-notify]", error);
    }
  }

  public async listActivity(conceptId: string): Promise<DovrutActivityLog[]> {
    const db = this.getDb();
    return db<DovrutActivityLog[]>`
      select * from dovrut_activity_logs
      where concept_id = ${conceptId}
      order by created_at desc
    `;
  }

  public async linkTask(
    conceptId: string,
    taskId: string | null,
    actorName: string,
    actorEmail?: string | null,
  ): Promise<DovrutConcept | null> {
    const existing = await this.getById(conceptId);
    if (!existing) return null;
    await this.syncTaskConceptLink(conceptId, existing.linked_task_id, taskId);
    const updated = await this.update(
      conceptId,
      { linked_task_id: taskId },
      actorName,
      actorEmail,
    );
    if (updated) {
      const { syncLinkedTaskFromConcept } = await import(
        "@/modules/dovrut/lib/task-status-sync"
      );
      await syncLinkedTaskFromConcept(updated);
    }
    return updated;
  }

  /** Keep tasks.dovrut_concept_id in sync with concepts.linked_task_id. */
  private async syncTaskConceptLink(
    conceptId: string,
    previousTaskId: string | null | undefined,
    nextTaskId: string | null,
  ): Promise<void> {
    const db = this.getDb();
    if (previousTaskId && previousTaskId !== nextTaskId) {
      await db`
        update tasks
        set dovrut_concept_id = null, updated_at = now()
        where id = ${previousTaskId} and dovrut_concept_id = ${conceptId}
      `;
    }
    if (nextTaskId) {
      await db`
        update tasks
        set dovrut_concept_id = ${conceptId}, origin = 'dovrut', updated_at = now()
        where id = ${nextTaskId}
      `;
    }
  }

  private async writeLog(input: {
    concept_id: string | null;
    project_id: string | null;
    action_type: DovrutActivityLog["action_type"];
    field_changed?: string | null;
    old_value?: string | null;
    new_value?: string | null;
    details?: string | null;
    user_name: string;
    user_email: string | null;
  }): Promise<void> {
    const db = this.getDb();
    await db`
      insert into dovrut_activity_logs (
        concept_id, project_id, action_type, field_changed, old_value, new_value,
        details, user_name, user_email
      ) values (
        ${input.concept_id},
        ${input.project_id},
        ${input.action_type},
        ${input.field_changed ?? null},
        ${input.old_value ?? null},
        ${input.new_value ?? null},
        ${input.details ?? null},
        ${input.user_name},
        ${input.user_email}
      )
    `;
  }

  public async setWorkStatus(
    id: string,
    status: DovrutWorkStatus,
    actorName: string,
    actorEmail?: string | null,
    options?: { source?: "concept" | "task" },
  ): Promise<DovrutConcept | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    let updated: DovrutConcept | null;
    if (existing.type === "article_interview") {
      const patch: Partial<DovrutConcept> = { work_status_article: status };
      if (status === "waiting_approvals" && !existing.approval_status) {
        patch.approval_status = getInitialApprovalStatus(flagsFromConcept(existing));
      }
      updated = await this.update(id, patch, actorName, actorEmail);
    } else {
      updated = await this.update(id, { work_status_social: status }, actorName, actorEmail);
    }
    if (updated) {
      const { syncLinkedTaskFromConcept } = await import(
        "@/modules/dovrut/lib/task-status-sync"
      );
      await syncLinkedTaskFromConcept(updated, { source: options?.source });
    }
    return updated;
  }
}
