import { BaseService } from "@/services/base.service";

export interface TaskMessageItem {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
}

export class TaskMessageService extends BaseService {
  // Loads the chat thread for a task with author display fields.
  public async listByTask(taskId: string): Promise<TaskMessageItem[]> {
    const db = this.getDb();
    const rows = await db<
      Array<{
        id: string;
        task_id: string;
        body: string;
        created_at: string;
        author_id: string;
        author_name: string;
        author_avatar: string | null;
      }>
    >`
      select
        m.id,
        m.task_id,
        m.body,
        m.created_at,
        m.author_id,
        coalesce(p.name, 'משתמש') as author_name,
        p.avatar as author_avatar
      from task_messages m
      left join profiles p on p.id = m.author_id
      where m.task_id = ${taskId}
      order by m.created_at asc
    `;

    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      body: row.body,
      createdAt: row.created_at,
      authorId: row.author_id,
      authorName: row.author_name,
      authorAvatar: row.author_avatar,
    }));
  }

  // Creates a new chat message authored by the given user.
  public async create(taskId: string, authorId: string, body: string): Promise<TaskMessageItem> {
    const db = this.getDb();
    const trimmed = body.trim();
    const rows = await db<
      Array<{
        id: string;
        task_id: string;
        body: string;
        created_at: string;
        author_id: string;
        author_name: string;
        author_avatar: string | null;
      }>
    >`
      with inserted as (
        insert into task_messages (task_id, author_id, body)
        values (${taskId}, ${authorId}, ${trimmed})
        returning id, task_id, body, created_at, author_id
      )
      select
        i.id,
        i.task_id,
        i.body,
        i.created_at,
        i.author_id,
        coalesce(p.name, 'משתמש') as author_name,
        p.avatar as author_avatar
      from inserted i
      left join profiles p on p.id = i.author_id
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("Insert failed");
    }

    return {
      id: row.id,
      taskId: row.task_id,
      body: row.body,
      createdAt: row.created_at,
      authorId: row.author_id,
      authorName: row.author_name,
      authorAvatar: row.author_avatar,
    };
  }
}
