import { BaseService } from "@/services/base.service";
import {
  DEFAULT_APPROVAL_FLAGS,
  getInitialApprovalStatus,
  getNextApprovalStatus,
  type ApprovalRequirementFlags,
} from "@/modules/dovrut/lib/approval-flows";
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
  }): Promise<DovrutConcept[]> {
    const db = this.getDb();
    return db<DovrutConcept[]>`
      select c.*, p.name as project_name
      from dovrut_concepts c
      join dovrut_projects p on p.id = c.project_id
      where (${filters?.projectId ?? null}::uuid is null or c.project_id = ${filters?.projectId ?? null})
        and (${filters?.type ?? null}::text is null or c.type = ${filters?.type ?? null})
        and (${filters?.approvalStatus ?? null}::text is null or c.approval_status = ${filters?.approvalStatus ?? null})
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
    const rows = await db<DovrutConcept[]>`
      insert into dovrut_concepts (
        name, project_id, type, domain, interviewees, media_outlet, interviewer, needs_briefing,
        requires_chief_rabbi, requires_deputy_commander, requires_branch_head, target_audience,
        link, details, notes, work_status_article, content_type, draft_text,
        draft_images, draft_videos, partners, work_status_social, approval_status, created_by
      ) values (
        ${input.name},
        ${input.project_id},
        ${input.type},
        ${isArticle ? input.domain ?? null : null},
        ${isArticle ? input.interviewees ?? [] : []},
        ${isArticle ? input.media_outlet ?? null : null},
        ${isArticle ? input.interviewer ?? null : null},
        ${isArticle ? needsBriefing : false},
        ${isArticle ? flags.requires_chief_rabbi : false},
        ${isArticle ? flags.requires_deputy_commander : false},
        ${isArticle ? flags.requires_branch_head : false},
        ${input.target_audience ?? null},
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
        ${input.created_by}
      )
      returning *
    `;
    const created = rows[0];
    await this.writeLog({
      concept_id: created.id,
      project_id: created.project_id,
      action_type: "created",
      details: "יצירת פריט",
      user_name: actorName,
      user_email: actorEmail ?? null,
    });
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
    const rows = await db<DovrutConcept[]>`
      update dovrut_concepts set
        name = ${patch.name ?? existing.name},
        domain = ${patch.domain !== undefined ? patch.domain : existing.domain},
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
        target_audience = ${
          patch.target_audience !== undefined ? patch.target_audience : existing.target_audience
        },
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
        updated_at = now()
      where id = ${id}
      returning *
    `;
    await this.writeLog({
      concept_id: id,
      project_id: existing.project_id,
      action_type: "updated",
      details: "עדכון פריט",
      user_name: actorName,
      user_email: actorEmail ?? null,
    });
    return (await this.getById(rows[0].id))!;
  }

  public async delete(id: string, actorName: string, actorEmail?: string | null): Promise<boolean> {
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
      delete from dovrut_concepts where id = ${id} returning id
    `;
    return rows.length > 0;
  }

  public async applyApproval(input: {
    conceptId: string;
    action: "approve" | "reject";
    approvalStep: DovrutApprovalStatus;
    rejectionReason?: string;
    actorName: string;
    actorEmail?: string | null;
  }): Promise<DovrutConcept> {
    const concept = await this.getById(input.conceptId);
    if (!concept) throw new Error("Concept not found");
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
      };
      if (next === "approved") {
        patch.work_status_article = "approved";
      }
      const updated = await this.update(concept.id, patch, input.actorName, input.actorEmail);
      await this.writeLog({
        concept_id: concept.id,
        project_id: concept.project_id,
        action_type: "approval_changed",
        field_changed: "approval_status",
        old_value: input.approvalStep,
        new_value: next,
        details: "אישור",
        user_name: input.actorName,
        user_email: input.actorEmail ?? null,
      });
      return updated!;
    }

    const reset = getInitialApprovalStatus(flags);
    const updated = await this.update(
      concept.id,
      {
        approval_status: reset,
        work_status_article: "planning",
        rejection_reason: input.rejectionReason ?? "",
        rejected_at_step: input.approvalStep,
        last_rejection_date: new Date().toISOString(),
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
      details: input.rejectionReason ?? "דחייה",
      user_name: input.actorName,
      user_email: input.actorEmail ?? null,
    });
    return updated!;
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
    return this.update(conceptId, { linked_task_id: taskId }, actorName, actorEmail);
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
  ): Promise<DovrutConcept | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    if (existing.type === "article_interview") {
      const patch: Partial<DovrutConcept> = { work_status_article: status };
      if (status === "waiting_approvals" && !existing.approval_status) {
        patch.approval_status = getInitialApprovalStatus(flagsFromConcept(existing));
      }
      return this.update(id, patch, actorName, actorEmail);
    }
    return this.update(id, { work_status_social: status }, actorName, actorEmail);
  }
}
