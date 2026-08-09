import { BaseService } from "@/services/base.service";
import { getInitialApprovalStatus, getNextApprovalStatus } from "@/modules/dovrut/lib/approval-flows";
import type {
  DovrutActivityLog,
  DovrutApprovalStatus,
  DovrutConcept,
  DovrutConceptType,
  DovrutDomain,
  DovrutWorkStatusArticle,
  DovrutWorkStatusSocial,
} from "@/modules/dovrut/types";

export class DovrutConceptService extends BaseService {
  public async list(filters?: {
    projectId?: string;
    type?: DovrutConceptType;
    approvalStatus?: DovrutApprovalStatus;
  }): Promise<DovrutConcept[]> {
    const db = this.getDb();
    return db<DovrutConcept[]>`
      select c.*, p.name as project_name
      from dovrut_concepts c
      join dovrut_projects p on p.id = c.project_id
      where (${filters?.projectId ?? null}::uuid is null or c.project_id = ${filters?.projectId ?? null})
        and (${filters?.type ?? null}::text is null or c.type = ${filters?.type ?? null})
        and (${filters?.approvalStatus ?? null}::text is null or c.approval_status = ${filters?.approvalStatus ?? null})
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
      needs_briefing?: boolean;
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
    const approvalStatus = isArticle ? getInitialApprovalStatus(input.domain) : null;
    const rows = await db<DovrutConcept[]>`
      insert into dovrut_concepts (
        name, project_id, type, domain, interviewees, media_outlet, needs_briefing,
        link, details, notes, work_status_article, content_type, draft_text,
        draft_images, draft_videos, partners, work_status_social, approval_status, created_by
      ) values (
        ${input.name},
        ${input.project_id},
        ${input.type},
        ${isArticle ? input.domain ?? null : null},
        ${isArticle ? input.interviewees ?? [] : []},
        ${isArticle ? input.media_outlet ?? null : null},
        ${isArticle ? Boolean(input.needs_briefing) : false},
        ${input.link ?? null},
        ${input.details ?? null},
        ${input.notes ?? null},
        ${isArticle ? "planning" : null},
        ${!isArticle ? input.content_type ?? null : null},
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
      details: "יצירת קונספט",
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
    const rows = await db<DovrutConcept[]>`
      update dovrut_concepts set
        name = ${patch.name ?? existing.name},
        domain = ${patch.domain !== undefined ? patch.domain : existing.domain},
        interviewees = ${patch.interviewees ?? existing.interviewees},
        media_outlet = ${patch.media_outlet !== undefined ? patch.media_outlet : existing.media_outlet},
        needs_briefing = ${patch.needs_briefing ?? existing.needs_briefing},
        link = ${patch.link !== undefined ? patch.link : existing.link},
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
        updated_at = now()
      where id = ${id}
      returning *
    `;
    await this.writeLog({
      concept_id: id,
      project_id: existing.project_id,
      action_type: "updated",
      details: "עדכון קונספט",
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

    if (input.action === "approve") {
      const next = getNextApprovalStatus(concept.domain, input.approvalStep);
      if (!next) throw new Error("Already fully approved");
      const updated = await this.update(
        concept.id,
        {
          approval_status: next,
          rejection_reason: "",
          rejected_at_step: "",
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
        new_value: next,
        details: "אישור",
        user_name: input.actorName,
        user_email: input.actorEmail ?? null,
      });
      return updated!;
    }

    const reset = getInitialApprovalStatus(concept.domain);
    const updated = await this.update(
      concept.id,
      {
        approval_status: reset,
        work_status_article: "planning" as DovrutWorkStatusArticle,
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
    status: DovrutWorkStatusArticle | DovrutWorkStatusSocial,
    actorName: string,
    actorEmail?: string | null,
  ): Promise<DovrutConcept | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    if (existing.type === "article_interview") {
      return this.update(
        id,
        { work_status_article: status as DovrutWorkStatusArticle },
        actorName,
        actorEmail,
      );
    }
    return this.update(
      id,
      { work_status_social: status as DovrutWorkStatusSocial },
      actorName,
      actorEmail,
    );
  }
}
