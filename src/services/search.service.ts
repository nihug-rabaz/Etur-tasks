import { BaseService } from "@/services/base.service";
import { TaskAccessContext } from "@/services/authorization.service";

export interface SearchTaskResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  subtopic_name: string | null;
  domain_name: string | null;
  project_name: string | null;
}

export interface SearchProjectResult {
  id: string;
  name: string;
  subtopic_name: string | null;
  domain_name: string | null;
}

export interface SearchResults {
  tasks: SearchTaskResult[];
  projects: SearchProjectResult[];
}

export class SearchService extends BaseService {
  // Live search across tasks and projects, restricted to the user's accessible subtopics.
  public async search(access: TaskAccessContext, rawQuery: string, limit = 8): Promise<SearchResults> {
    const query = rawQuery.trim();
    if (query.length < 2) {
      return { tasks: [], projects: [] };
    }
    const like = `%${query}%`;
    const [tasks, projects] = await Promise.all([
      this.searchTasks(access, like, limit),
      this.searchProjects(access, like, limit),
    ]);
    return { tasks, projects };
  }

  private async searchTasks(
    access: TaskAccessContext,
    like: string,
    limit: number,
  ): Promise<SearchTaskResult[]> {
    const db = this.getDb();
    return db<SearchTaskResult[]>`
      select id, title, status, priority, due_date, subtopic_name, domain_name, project_name
      from task_details
      where (title ilike ${like} or description ilike ${like})
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      order by updated_at desc
      limit ${limit}
    `;
  }

  private async searchProjects(
    access: TaskAccessContext,
    like: string,
    limit: number,
  ): Promise<SearchProjectResult[]> {
    const db = this.getDb();
    return db<SearchProjectResult[]>`
      select p.id, p.name, s.name as subtopic_name, d.name as domain_name
      from projects p
      join subtopics s on s.id = p.subtopic_id
      join domains d on d.id = s.domain_id
      where (p.name ilike ${like} or p.description ilike ${like})
        and (
          ${access.unrestricted}::boolean
          or p.subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      order by p.created_at desc
      limit ${limit}
    `;
  }
}
