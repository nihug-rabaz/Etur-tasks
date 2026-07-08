import { BaseService } from "@/services/base.service";
import { TaskAccessContext } from "@/services/authorization.service";
import { TaskWithRelations } from "@/types/models";

export interface DomainSummary {
  id: string;
  name: string;
  slug: string;
  activeTasks: number;
  activeProjects: number;
  progress: number;
  previewTasks: DomainPreviewTask[];
}

export interface DomainPreviewTask {
  id: string;
  title: string;
  status: "in_progress";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
}

export interface DashboardStats {
  totalTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface DashboardTaskColumns {
  in_progress: TaskWithRelations[];
  completed: TaskWithRelations[];
}

export interface HierarchyTaskNode {
  id: string;
  title: string;
  status: "in_progress" | "completed";
  priority: "low" | "medium" | "high";
}

export interface HierarchyProjectNode {
  id: string;
  name: string;
  status: "active" | "completed" | "archived";
  tasks: HierarchyTaskNode[];
}

export interface HierarchySubMainTaskNode {
  id: string;
  name: string;
  projects: HierarchyProjectNode[];
  standaloneTasks: HierarchyTaskNode[];
}

export interface HierarchyMainTaskNode {
  id: string;
  name: string;
  subMainTasks: HierarchySubMainTaskNode[];
}

export interface HierarchyCategoryNode {
  id: string;
  name: string;
  slug: string;
  mainTasks: HierarchyMainTaskNode[];
}

export interface MainTaskCluster {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  mainTaskName: string;
  subMainTaskName: string;
  tasks: TaskWithRelations[];
}

export interface TabTaskAssignee {
  id: string;
  name: string;
  avatar: string | null;
}

export interface TabTaskItem {
  id: string;
  title: string;
  status: "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assignees: TabTaskAssignee[];
}

export interface TabProjectItem {
  id: string;
  name: string;
  sectionId: string;
  status: "active" | "completed" | "archived";
  tasks: TabTaskItem[];
}

export interface TabSectionItem {
  id: string;
  name: string;
  projects: TabProjectItem[];
  standaloneTasks: TabTaskItem[];
}

export interface MainTabItem {
  id: string;
  slug: "recruitment" | "positioning" | "general";
  name: string;
  sections: TabSectionItem[];
}

export class DashboardService extends BaseService {
  public async getDomainSummaries(access: TaskAccessContext): Promise<DomainSummary[]> {
    const db = this.getDb();
    const rows = await db<
      Array<{
        id: string;
        name: string;
        slug: string;
        active_tasks: number;
        completed_tasks: number;
        active_projects: number;
      }>
    >`
      select
        d.id,
        d.name,
        d.slug,
        count(t.id) filter (
          where t.status <> 'completed'
            and (
              ${access.unrestricted}::boolean
              or t.subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
            )
        )::int as active_tasks,
        count(t.id) filter (
          where t.status = 'completed'
            and (
              ${access.unrestricted}::boolean
              or t.subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
            )
        )::int as completed_tasks,
        count(distinct p.id) filter (
          where p.status = 'active'
            and (
              ${access.unrestricted}::boolean
              or p.subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
            )
        )::int as active_projects
      from domains d
      left join subtopics s on s.domain_id = d.id
      left join tasks t on t.subtopic_id = s.id
      left join projects p on p.subtopic_id = s.id
      group by d.id, d.name, d.slug
      order by d.name
    `;

    const previewRows = await db<
      Array<{
        domain_id: string;
        id: string;
        title: string;
        status: "in_progress";
        priority: "low" | "medium" | "high";
        due_date: string | null;
      }>
    >`
      with ranked as (
        select
          d.id as domain_id,
          t.id,
          t.title,
          t.status,
          t.priority,
          t.due_date,
          row_number() over (
            partition by d.id
            order by
              case when t.due_date is null then 1 else 0 end,
              t.due_date asc,
              t.created_at desc
          ) as rn
        from domains d
        left join subtopics s on s.domain_id = d.id
        left join tasks t on t.subtopic_id = s.id
        where t.status = 'in_progress'
          and (
            ${access.unrestricted}::boolean
            or t.subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
          )
      )
      select domain_id, id, title, status, priority, due_date
      from ranked
      where rn <= 4
      order by domain_id, rn
    `;

    const previewByDomain = new Map<string, DomainPreviewTask[]>();
    for (const row of previewRows) {
      const current = previewByDomain.get(row.domain_id) ?? [];
      current.push({
        id: row.id,
        title: row.title,
        status: row.status,
        priority: row.priority,
        dueDate: row.due_date,
      });
      previewByDomain.set(row.domain_id, current);
    }

    return rows.map((row) => {
      const total = row.active_tasks + row.completed_tasks;
      const progress = total === 0 ? 0 : Math.round((row.completed_tasks / total) * 100);
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        activeTasks: row.active_tasks,
        activeProjects: row.active_projects,
        progress,
        previewTasks: previewByDomain.get(row.id) ?? [],
      };
    });
  }

  public async getDashboardStats(access: TaskAccessContext): Promise<DashboardStats> {
    const db = this.getDb();
    const [row] = await db<
      Array<{
        total_tasks: number;
        in_progress_tasks: number;
        completed_tasks: number;
        overdue_tasks: number;
      }>
    >`
      select
        count(*)::int as total_tasks,
        count(*) filter (where status = 'in_progress')::int as in_progress_tasks,
        count(*) filter (where status = 'completed')::int as completed_tasks,
        count(*) filter (where status <> 'completed' and due_date < now())::int as overdue_tasks
      from tasks
      where (
        ${access.unrestricted}::boolean
        or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
      )
    `;

    return {
      totalTasks: row?.total_tasks ?? 0,
      inProgressTasks: row?.in_progress_tasks ?? 0,
      completedTasks: row?.completed_tasks ?? 0,
      overdueTasks: row?.overdue_tasks ?? 0,
    };
  }

  public async getTaskColumns(
    access: TaskAccessContext,
    limitPerStatus = 6,
  ): Promise<DashboardTaskColumns> {
    const db = this.getDb();
    const rows = await db<TaskWithRelations[]>`
      select * from task_details
      where status <> 'completed'
        and (
        ${access.unrestricted}::boolean
        or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
      )
      order by
        case when due_date is null then 1 else 0 end,
        due_date asc,
        updated_at desc
    `;

    const columns: DashboardTaskColumns = {
      in_progress: [],
      completed: [],
    };

    for (const row of rows) {
      if (columns.in_progress.length < limitPerStatus) {
        columns.in_progress.push(row);
      }
    }

    return columns;
  }

  public async getHierarchyExplorerData(
    access: TaskAccessContext,
  ): Promise<HierarchyCategoryNode[]> {
    const db = this.getDb();
    const domains = await db<Array<{ id: string; name: string; slug: string }>>`
      select id, name, slug
      from domains
      order by name
    `;
    const subtopics = access.unrestricted
      ? await db<Array<{ id: string; name: string; domain_id: string }>>`
          select id, name, domain_id
          from subtopics
          order by name
        `
      : await db<Array<{ id: string; name: string; domain_id: string }>>`
          select id, name, domain_id
          from subtopics
          where id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
          order by name
        `;
    const projects = await db<Array<{ id: string; name: string; status: "active" | "completed" | "archived"; subtopic_id: string }>>`
      select id, name, status, subtopic_id
      from projects
      where (
        ${access.unrestricted}::boolean
        or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
      )
      order by name
    `;
    const tasks = await db<
      Array<{
        id: string;
        title: string;
        status: "in_progress" | "completed";
        priority: "low" | "medium" | "high";
        subtopic_id: string;
        project_id: string | null;
      }>
    >`
      select id, title, status, priority, subtopic_id, project_id
      from tasks
      where status <> 'completed'
        and (
        ${access.unrestricted}::boolean
        or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
      )
      order by
        case status when 'in_progress' then 1 else 2 end,
        updated_at desc
    `;

    const projectMap = new Map<string, HierarchyProjectNode>();
    for (const project of projects) {
      projectMap.set(project.id, { id: project.id, name: project.name, status: project.status, tasks: [] });
    }
    for (const task of tasks) {
      if (!task.project_id) continue;
      const parent = projectMap.get(task.project_id);
      if (!parent) continue;
      parent.tasks.push({ id: task.id, title: task.title, status: task.status, priority: task.priority });
    }

    const subtopicNodes = new Map<string, HierarchySubMainTaskNode>();
    for (const subtopic of subtopics) {
      subtopicNodes.set(subtopic.id, {
        id: subtopic.id,
        name: subtopic.name,
        projects: [],
        standaloneTasks: [],
      });
    }
    for (const project of projects) {
      const parent = subtopicNodes.get(project.subtopic_id);
      if (!parent) continue;
      const fullProject = projectMap.get(project.id);
      if (fullProject) parent.projects.push(fullProject);
    }
    for (const task of tasks) {
      if (task.project_id) continue;
      const parent = subtopicNodes.get(task.subtopic_id);
      if (!parent) continue;
      parent.standaloneTasks.push({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
      });
    }

    const categoryMap = new Map<string, HierarchyCategoryNode>();
    for (const domain of domains) {
      categoryMap.set(domain.id, { id: domain.id, name: domain.name, slug: domain.slug, mainTasks: [] });
    }
    for (const subtopic of subtopics) {
      const parent = categoryMap.get(subtopic.domain_id);
      const subNode = subtopicNodes.get(subtopic.id);
      if (!parent || !subNode) continue;
      parent.mainTasks.push({
        id: subtopic.id,
        name: subtopic.name,
        subMainTasks: [
          { ...subNode, id: `${subtopic.id}-focus`, name: "מיקוד" },
          { ...subNode, id: `${subtopic.id}-execution`, name: "ביצוע" },
          { ...subNode, id: `${subtopic.id}-scale`, name: "הרחבה" },
        ],
      });
    }

    return Array.from(categoryMap.values());
  }

  public async getMainTaskClusters(
    access: TaskAccessContext,
    limit = 4,
  ): Promise<MainTaskCluster[]> {
    const db = this.getDb();
    const rows = await db<TaskWithRelations[]>`
      select * from task_details
      where project_id is null
        and status <> 'completed'
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      order by
        case when due_date is null then 1 else 0 end,
        due_date asc,
        updated_at desc
    `;
    const clusters = new Map<string, MainTaskCluster>();
    for (const task of rows) {
      const categoryName = task.domain_name ?? "כללי";
      const subtopicName = task.subtopic_name ?? "כללי";
      const key = `${categoryName}:${subtopicName}`;
      const categorySlug = categoryName === "Recruitment" ? "recruitment" : categoryName === "Positioning" ? "positioning" : "general";
      if (!clusters.has(key)) {
        clusters.set(key, {
          categoryId: task.subtopic_id,
          categoryName,
          categorySlug,
          mainTaskName: subtopicName,
          subMainTaskName: "ביצוע שוטף",
          tasks: [],
        });
      }
      const item = clusters.get(key);
      if (!item) continue;
      if (item.tasks.length < limit) item.tasks.push(task);
    }
    return Array.from(clusters.values());
  }

  public async getTabbedMainScreenData(access: TaskAccessContext): Promise<MainTabItem[]> {
    const db = this.getDb();
    const domains = await db<Array<{ id: string; name: string; slug: "recruitment" | "positioning" | "general" }>>`
      select id, name, slug
      from domains
      where slug in ('recruitment', 'positioning', 'general')
      order by case slug when 'recruitment' then 1 when 'positioning' then 2 else 3 end
    `;
    const subtopics = access.unrestricted
      ? await db<Array<{ id: string; name: string; domain_id: string }>>`
          select id, name, domain_id
          from subtopics
          order by name
        `
      : await db<Array<{ id: string; name: string; domain_id: string }>>`
          select id, name, domain_id
          from subtopics
          where id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
          order by name
        `;
    const projects = await db<Array<{ id: string; name: string; status: "active" | "completed" | "archived"; subtopic_id: string }>>`
      select p.id, p.name, p.status, p.subtopic_id
      from projects p
      where (
        ${access.unrestricted}::boolean
        or p.subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        or exists (
          select 1
          from project_subtopics ps
          where ps.project_id = p.id
            and ps.subtopic_id in (
              select subtopic_id from user_subtopic_permissions where user_id = ${access.userId}
            )
        )
      )
      order by p.created_at desc
    `;
    const projectLinks = await db<Array<{ project_id: string; subtopic_id: string }>>`
      select project_id, subtopic_id from project_subtopics
    `;
    const projectSubtopicIds = new Map<string, string[]>();
    for (const project of projects) {
      projectSubtopicIds.set(project.id, [project.subtopic_id]);
    }
    for (const link of projectLinks) {
      const current = projectSubtopicIds.get(link.project_id) ?? [];
      if (!current.includes(link.subtopic_id)) current.push(link.subtopic_id);
      projectSubtopicIds.set(link.project_id, current);
    }
    const tasks = await db<
      Array<{
        id: string;
        title: string;
        status: "in_progress" | "completed";
        priority: "low" | "medium" | "high";
        due_date: string | null;
        project_id: string | null;
        subtopic_id: string;
        assigned_to: string | null;
      }>
    >`
      select id, title, status, priority, due_date, project_id, subtopic_id, assigned_to
      from tasks
      where status <> 'completed'
        and (
        ${access.unrestricted}::boolean
        or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        or id in (
          select ts.task_id
          from task_subtopics ts
          join user_subtopic_permissions usp on usp.subtopic_id = ts.subtopic_id
          where usp.user_id = ${access.userId}
        )
      )
      order by
        case priority when 'high' then 1 when 'medium' then 2 else 3 end,
        created_at asc,
        id asc
    `;

    const allTaskIds = tasks.map((task) => task.id);
    const assigneesByTask = new Map<string, TabTaskAssignee[]>();
    if (allTaskIds.length > 0) {
      const assigneeRows = await db<
        Array<{ task_id: string; id: string; name: string; avatar: string | null }>
      >`
        select ta.task_id, p.id, p.name, p.avatar
        from task_assignees ta
        join profiles p on p.id = ta.user_id
        where ta.task_id = any(${allTaskIds})
        order by ta.task_id, p.name
      `;
      for (const row of assigneeRows) {
        const list = assigneesByTask.get(row.task_id) ?? [];
        list.push({ id: row.id, name: row.name, avatar: row.avatar });
        assigneesByTask.set(row.task_id, list);
      }
    }

    const fallbackIds = [
      ...new Set(
        tasks
          .filter(
            (task) =>
              (assigneesByTask.get(task.id) ?? []).length === 0 && task.assigned_to,
          )
          .map((task) => task.assigned_to as string),
      ),
    ];
    if (fallbackIds.length > 0) {
      const profiles = await db<Array<{ id: string; name: string; avatar: string | null }>>`
        select id, name, avatar from profiles where id = any(${fallbackIds})
      `;
      const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
      for (const task of tasks) {
        if ((assigneesByTask.get(task.id) ?? []).length > 0) continue;
        if (!task.assigned_to) continue;
        const profile = profileById.get(task.assigned_to);
        if (profile) {
          assigneesByTask.set(task.id, [
            { id: profile.id, name: profile.name, avatar: profile.avatar },
          ]);
        }
      }
    }

    const toTabTaskItem = (task: (typeof tasks)[number]): TabTaskItem => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      assignees: assigneesByTask.get(task.id) ?? [],
    });

    const tasksByProject = new Map<string, TabTaskItem[]>();
    for (const task of tasks) {
      if (!task.project_id) continue;
      const current = tasksByProject.get(task.project_id) ?? [];
      current.push(toTabTaskItem(task));
      tasksByProject.set(task.project_id, current);
    }

    const taskLinks = await db<Array<{ task_id: string; subtopic_id: string }>>`
      select task_id, subtopic_id from task_subtopics
    `;
    const taskSubtopicIds = new Map<string, string[]>();
    for (const task of tasks) {
      if (task.project_id) continue;
      taskSubtopicIds.set(task.id, [task.subtopic_id]);
    }
    for (const link of taskLinks) {
      const task = tasks.find((item) => item.id === link.task_id);
      if (!task || task.project_id) continue;
      const current = taskSubtopicIds.get(link.task_id) ?? [];
      if (!current.includes(link.subtopic_id)) current.push(link.subtopic_id);
      taskSubtopicIds.set(link.task_id, current);
    }

    const subtopicsByDomain = new Map<string, TabSectionItem[]>();
    for (const subtopic of subtopics) {
      const current = subtopicsByDomain.get(subtopic.domain_id) ?? [];
      current.push({ id: subtopic.id, name: subtopic.name, projects: [], standaloneTasks: [] });
      subtopicsByDomain.set(subtopic.domain_id, current);
    }

    const sectionById = new Map<string, TabSectionItem>();
    for (const sections of subtopicsByDomain.values()) {
      for (const section of sections) sectionById.set(section.id, section);
    }
    for (const project of projects) {
      const linkedSubtopicIds = projectSubtopicIds.get(project.id) ?? [project.subtopic_id];
      for (const subtopicId of linkedSubtopicIds) {
        const section = sectionById.get(subtopicId);
        if (!section) continue;
        section.projects.push({
          id: project.id,
          name: project.name,
          sectionId: subtopicId,
          status: project.status,
          tasks: tasksByProject.get(project.id) ?? [],
        });
      }
    }

    for (const task of tasks) {
      if (task.project_id) continue;
      const linkedSubtopicIds = taskSubtopicIds.get(task.id) ?? [task.subtopic_id];
      const tabTask = toTabTaskItem(task);
      for (const subtopicId of linkedSubtopicIds) {
        const section = sectionById.get(subtopicId);
        if (!section) continue;
        if (section.standaloneTasks.some((item) => item.id === tabTask.id)) continue;
        section.standaloneTasks.push(tabTask);
      }
    }

    return domains.map((domain) => ({
      id: domain.id,
      slug: domain.slug,
      name: domain.name,
      sections: subtopicsByDomain.get(domain.id) ?? [],
    }));
  }
}
