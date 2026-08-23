import { BaseService } from "@/services/base.service";
import type { TaskAccessContext } from "@/services/authorization.service";

export type DovrutSearchKind =
  | "campaign"
  | "project"
  | "item"
  | "inquiry"
  | "message"
  | "task";

export interface DovrutSearchHit {
  id: string;
  kind: DovrutSearchKind;
  title: string;
  meta: string | null;
  href: string;
}

export interface DovrutSearchResults {
  campaigns: DovrutSearchHit[];
  projects: DovrutSearchHit[];
  items: DovrutSearchHit[];
  inquirySubjects: DovrutSearchHit[];
  messages: DovrutSearchHit[];
  tasks: DovrutSearchHit[];
}

const EMPTY: DovrutSearchResults = {
  campaigns: [],
  projects: [],
  items: [],
  inquirySubjects: [],
  messages: [],
  tasks: [],
};

export class DovrutSearchService extends BaseService {
  public async search(
    rawQuery: string,
    taskAccess: TaskAccessContext,
    limit = 6,
  ): Promise<DovrutSearchResults> {
    const query = rawQuery.trim();
    if (query.length < 2) return EMPTY;
    const like = `%${query}%`;

    const [campaigns, projects, items, inquirySubjects, messages, tasks] = await Promise.all([
      this.searchCampaigns(like, limit),
      this.searchProjects(like, limit),
      this.searchItems(like, limit),
      this.searchInquirySubjects(like, limit),
      this.searchMessages(like, limit),
      this.searchTasks(taskAccess, like, limit),
    ]);

    return { campaigns, projects, items, inquirySubjects, messages, tasks };
  }

  private async searchCampaigns(like: string, limit: number): Promise<DovrutSearchHit[]> {
    const db = this.getDb();
    const rows = await db<Array<{ id: string; name: string; description: string | null }>>`
      select id, name, description
      from dovrut_campaigns
      where name ilike ${like}
        or coalesce(description, '') ilike ${like}
      order by updated_at desc
      limit ${limit}
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: "campaign" as const,
      title: row.name,
      meta: row.description,
      href: `/dovrut/projects?campaignId=${row.id}`,
    }));
  }

  private async searchProjects(like: string, limit: number): Promise<DovrutSearchHit[]> {
    const db = this.getDb();
    const rows = await db<Array<{ id: string; name: string; campaign_name: string | null }>>`
      select p.id, p.name, c.name as campaign_name
      from dovrut_projects p
      left join dovrut_campaigns c on c.id = p.campaign_id
      where p.deleted_at is null
        and (
          p.name ilike ${like}
          or coalesce(p.description, '') ilike ${like}
          or coalesce(c.name, '') ilike ${like}
        )
      order by p.updated_at desc
      limit ${limit}
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: "project" as const,
      title: row.name,
      meta: row.campaign_name ? `קמפיין · ${row.campaign_name}` : null,
      href: `/dovrut/projects/${row.id}`,
    }));
  }

  private async searchItems(like: string, limit: number): Promise<DovrutSearchHit[]> {
    const db = this.getDb();
    const rows = await db<
      Array<{
        id: string;
        name: string;
        project_name: string | null;
        media_outlet: string | null;
        interviewer: string | null;
      }>
    >`
      select c.id, c.name, p.name as project_name, c.media_outlet, c.interviewer
      from dovrut_concepts c
      join dovrut_projects p on p.id = c.project_id
      where c.deleted_at is null
        and p.deleted_at is null
        and (
          c.name ilike ${like}
          or coalesce(c.notes, '') ilike ${like}
          or coalesce(c.media_outlet, '') ilike ${like}
          or coalesce(c.interviewer, '') ilike ${like}
          or coalesce(c.details, '') ilike ${like}
          or coalesce(c.draft_text, '') ilike ${like}
          or p.name ilike ${like}
        )
      order by c.updated_at desc
      limit ${limit}
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: "item" as const,
      title: row.name,
      meta: [
        row.project_name,
        row.media_outlet ? `מערכת: ${row.media_outlet}` : null,
        row.interviewer ? `מראיין: ${row.interviewer}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/dovrut/items/${row.id}`,
    }));
  }

  private async searchInquirySubjects(like: string, limit: number): Promise<DovrutSearchHit[]> {
    const db = this.getDb();
    const rows = await db<
      Array<{ id: string; name: string; role_title: string | null; rank: string | null }>
    >`
      select id, name, role_title, rank
      from dovrut_inquiry_subjects
      where deleted_at is null
        and (
          name ilike ${like}
          or coalesce(rank, '') ilike ${like}
          or coalesce(role_title, '') ilike ${like}
          or coalesce(hometown, '') ilike ${like}
          or coalesce(family_status, '') ilike ${like}
          or coalesce(previous_roles, '') ilike ${like}
          or coalesce(bio, '') ilike ${like}
          or coalesce(notes, '') ilike ${like}
        )
      order by updated_at desc
      limit ${limit}
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: "inquiry" as const,
      title: row.name,
      meta: [row.role_title, row.rank].filter(Boolean).join(" · ") || null,
      href: `/dovrut/inquiry-subjects/${row.id}`,
    }));
  }

  private async searchMessages(like: string, limit: number): Promise<DovrutSearchHit[]> {
    const db = this.getDb();
    const rows = await db<Array<{ id: string; title: string; audience: string; body: string }>>`
      select id, title, audience, body
      from dovrut_audience_messages
      where title ilike ${like}
        or coalesce(body, '') ilike ${like}
        or audience ilike ${like}
      order by updated_at desc
      limit ${limit}
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: "message" as const,
      title: row.title,
      meta: `קהל: ${row.audience}`,
      href: "/dovrut/audiences",
    }));
  }

  private async searchTasks(
    access: TaskAccessContext,
    like: string,
    limit: number,
  ): Promise<DovrutSearchHit[]> {
    const db = this.getDb();
    const rows = await db<
      Array<{
        id: string;
        title: string;
        dovrut_campaign_name: string | null;
        dovrut_project_name: string | null;
        dovrut_concept_name: string | null;
      }>
    >`
      select
        t.id,
        t.title,
        dc.name as dovrut_campaign_name,
        dp.name as dovrut_project_name,
        dcon.name as dovrut_concept_name
      from tasks t
      left join dovrut_campaigns dc on dc.id = t.dovrut_campaign_id
      left join dovrut_projects dp on dp.id = t.dovrut_project_id
      left join dovrut_concepts dcon on dcon.id = t.dovrut_concept_id
      where t.origin = 'dovrut'
        and (t.title ilike ${like} or coalesce(t.description, '') ilike ${like})
        and (
          ${access.unrestricted}::boolean
          or t.subtopic_id in (
            select subtopic_id from user_subtopic_permissions where user_id = ${access.userId}
          )
          or exists (
            select 1 from task_subtopics ts
            join user_subtopic_permissions usp on usp.subtopic_id = ts.subtopic_id
            where ts.task_id = t.id and usp.user_id = ${access.userId}
          )
        )
      order by t.updated_at desc
      limit ${limit}
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: "task" as const,
      title: row.title,
      meta: [row.dovrut_campaign_name, row.dovrut_project_name, row.dovrut_concept_name]
        .filter(Boolean)
        .join(" · "),
      href: "/dovrut/tasks",
    }));
  }
}
