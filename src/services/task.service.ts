import { BaseService } from "@/services/base.service";
import { TaskAccessContext } from "@/services/authorization.service";
import { TaskStatus, TaskWithRelations } from "@/types/models";

type TaskListFilters = {
  statusMode?: "active" | "completed" | "any";
  exactStatus?: string | null;
  dueFrom?: Date;
  dueTo?: Date;
  updatedAfter?: Date;
  subtopicId?: string;
  projectId?: string;
  requiresNoProject?: boolean;
  taskId?: string;
  assigneeUserId?: string;
  origin?: "tasks" | "dovrut" | null;
  orderBy?: "due_date_asc" | "updated_at_desc" | "updated_at_asc" | "created_at_desc";
  limit?: number;
};

export class TaskService extends BaseService {
  // Loads task rows via joins instead of the correlated task_details view.
  private async queryTaskDetails(
    access: TaskAccessContext,
    filters: TaskListFilters = {},
  ): Promise<TaskWithRelations[]> {
    const db = this.getDb();
    const statusMode = filters.statusMode ?? "any";
    const orderBy = filters.orderBy ?? "due_date_asc";
    const dueFrom = filters.dueFrom?.toISOString() ?? null;
    const dueTo = filters.dueTo?.toISOString() ?? null;
    const updatedAfter = filters.updatedAfter?.toISOString() ?? null;
    const subtopicId = filters.subtopicId ?? null;
    const projectId = filters.projectId ?? null;
    const requiresNoProject = Boolean(filters.requiresNoProject);
    const taskId = filters.taskId ?? null;
    const assigneeUserId = filters.assigneeUserId ?? null;
    const exactStatus = filters.exactStatus ?? null;
    const origin = filters.origin ?? null;
    const limit = filters.limit ?? null;

    return db<TaskWithRelations[]>`
      select
        t.id,
        t.title,
        t.description,
        t.subtopic_id,
        t.project_id,
        coalesce(agg.first_assignee, t.assigned_to) as assigned_to,
        t.created_by,
        t.priority,
        t.status,
        t.due_date,
        t.created_at,
        t.updated_at,
        t.origin,
        t.dovrut_campaign_id,
        t.dovrut_project_id,
        t.dovrut_concept_id,
        s.name as subtopic_name,
        d.name as domain_name,
        p.name as project_name,
        dc.name as dovrut_campaign_name,
        dp.name as dovrut_project_name,
        dcon.name as dovrut_concept_name,
        coalesce(agg.assignee_name, '') as assignee_name,
        coalesce(agg.assignee_ids, array[]::uuid[]) as assignee_ids
      from tasks t
      join subtopics s on s.id = t.subtopic_id
      join domains d on d.id = s.domain_id
      left join projects p on p.id = t.project_id
      left join dovrut_campaigns dc on dc.id = t.dovrut_campaign_id
      left join dovrut_projects dp on dp.id = t.dovrut_project_id
      left join dovrut_concepts dcon on dcon.id = t.dovrut_concept_id
      left join (
        select
          ta.task_id,
          string_agg(pr.name, ', ' order by pr.name) as assignee_name,
          array_agg(ta.user_id order by ta.user_id) as assignee_ids,
          (array_agg(ta.user_id order by ta.user_id))[1] as first_assignee
        from task_assignees ta
        join profiles pr on pr.id = ta.user_id
        group by ta.task_id
      ) agg on agg.task_id = t.id
      where (
          ${statusMode === "any"}::boolean
          or (${statusMode === "active"}::boolean and t.status <> 'completed')
          or (${statusMode === "completed"}::boolean and t.status = 'completed')
        )
        and (${exactStatus}::text is null or t.status = ${exactStatus})
        and (${dueFrom}::timestamptz is null or t.due_date >= ${dueFrom}::timestamptz)
        and (${dueTo}::timestamptz is null or t.due_date <= ${dueTo}::timestamptz)
        and (${updatedAfter}::timestamptz is null or t.updated_at > ${updatedAfter}::timestamptz)
        and (${projectId}::uuid is null or t.project_id = ${projectId}::uuid)
        and (not ${requiresNoProject}::boolean or t.project_id is null)
        and (${taskId}::uuid is null or t.id = ${taskId}::uuid)
        and (${origin}::text is null or t.origin = ${origin})
        and (
          ${subtopicId}::uuid is null
          or t.subtopic_id = ${subtopicId}::uuid
          or exists (
            select 1 from task_subtopics ts
            where ts.task_id = t.id and ts.subtopic_id = ${subtopicId}::uuid
          )
        )
        and (
          ${assigneeUserId}::uuid is null
          or t.assigned_to = ${assigneeUserId}::uuid
          or exists (
            select 1 from task_assignees ta
            where ta.task_id = t.id and ta.user_id = ${assigneeUserId}::uuid
          )
        )
        and (
          ${access.unrestricted}::boolean
          or t.subtopic_id in (
            select subtopic_id from user_subtopic_permissions where user_id = ${access.userId}
          )
          or exists (
            select 1
            from task_subtopics ts
            join user_subtopic_permissions usp on usp.subtopic_id = ts.subtopic_id
            where ts.task_id = t.id and usp.user_id = ${access.userId}
          )
        )
      order by
        case when ${orderBy === "due_date_asc"}::boolean then extract(epoch from t.due_date) end asc nulls last,
        case when ${orderBy === "updated_at_desc"}::boolean then extract(epoch from t.updated_at) end desc nulls last,
        case when ${orderBy === "updated_at_asc"}::boolean then extract(epoch from t.updated_at) end asc nulls last,
        case when ${orderBy === "created_at_desc"}::boolean then extract(epoch from t.created_at) end desc nulls last,
        t.id asc
      limit coalesce(${limit}::int, 100000)
    `;
  }

  public async getChangesSince(
    access: TaskAccessContext,
    since: Date,
    limit = 100,
  ): Promise<TaskWithRelations[]> {
    return this.queryTaskDetails(access, {
      statusMode: "any",
      updatedAfter: since,
      orderBy: "updated_at_asc",
      limit,
    });
  }

  public async getActiveTasks(
    access: TaskAccessContext,
    filters?: {
      status?: string;
      subtopicId?: string;
      assigneeUserId?: string;
      limit?: number;
    },
  ): Promise<TaskWithRelations[]> {
    return this.queryTaskDetails(access, {
      statusMode: "active",
      exactStatus: filters?.status && filters.status !== "completed" ? filters.status : null,
      subtopicId: filters?.subtopicId,
      assigneeUserId: filters?.assigneeUserId,
      orderBy: "due_date_asc",
      limit: filters?.limit,
    });
  }

  public async getStandaloneActiveTasks(
    access: TaskAccessContext,
  ): Promise<TaskWithRelations[]> {
    return this.queryTaskDetails(access, {
      statusMode: "active",
      requiresNoProject: true,
      orderBy: "due_date_asc",
    });
  }

  public async getCompletedTasks(access: TaskAccessContext): Promise<TaskWithRelations[]> {
    return this.queryTaskDetails(access, {
      statusMode: "completed",
      orderBy: "updated_at_desc",
    });
  }

  public async getTasksDueInRange(
    access: TaskAccessContext,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<TaskWithRelations[]> {
    return this.queryTaskDetails(access, {
      statusMode: "active",
      dueFrom: rangeStart,
      dueTo: rangeEnd,
      orderBy: "due_date_asc",
    });
  }

  public async getDovrutTasks(
    access: TaskAccessContext,
    filters?: {
      status?: string;
      subtopicId?: string;
      assigneeUserId?: string;
      limit?: number;
    },
  ): Promise<TaskWithRelations[]> {
    return this.queryTaskDetails(access, {
      statusMode: "any",
      exactStatus: filters?.status ?? null,
      subtopicId: filters?.subtopicId,
      assigneeUserId: filters?.assigneeUserId,
      origin: "dovrut",
      orderBy: "created_at_desc",
      limit: filters?.limit,
    });
  }

  public async getBySubtopic(
    access: TaskAccessContext,
    subtopicId: string,
  ): Promise<TaskWithRelations[]> {
    return this.queryTaskDetails(access, {
      statusMode: "active",
      subtopicId,
      orderBy: "created_at_desc",
    });
  }

  public async getByProject(
    access: TaskAccessContext,
    projectId: string,
  ): Promise<TaskWithRelations[]> {
    return this.queryTaskDetails(access, {
      statusMode: "active",
      projectId,
      orderBy: "created_at_desc",
    });
  }

  public async getOne(
    access: TaskAccessContext,
    taskId: string,
  ): Promise<TaskWithRelations | null> {
    const rows = await this.queryTaskDetails(access, {
      statusMode: "any",
      taskId,
      orderBy: "created_at_desc",
      limit: 1,
    });
    return rows[0] ?? null;
  }

  public async updateStatus(taskId: string, status: TaskStatus): Promise<void> {
    const db = this.getDb();
    await db`update tasks set status = ${status}, updated_at = now() where id = ${taskId}`;
  }

  public async delete(taskId: string): Promise<void> {
    const db = this.getDb();
    await db`delete from tasks where id = ${taskId}`;
  }
}
