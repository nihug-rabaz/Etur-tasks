import { BaseService } from "@/services/base.service";
import { TaskCloseRequestWithRelations } from "@/types/models";

export class TaskCloseRequestService extends BaseService {
  public async listPending(): Promise<TaskCloseRequestWithRelations[]> {
    const db = this.getDb();
    return db<TaskCloseRequestWithRelations[]>`
      select
        r.id,
        r.task_id,
        r.requested_by,
        r.note,
        r.status,
        r.reviewed_by,
        r.review_note,
        r.reviewed_at,
        r.created_at,
        r.updated_at,
        t.title as task_title,
        p.name as requester_name,
        td.subtopic_name
      from task_close_requests r
      join tasks t on t.id = r.task_id
      join profiles p on p.id = r.requested_by
      left join task_details td on td.id = r.task_id
      where r.status = 'pending'
      order by r.created_at asc
    `;
  }

  public async listPendingForUser(userId: string): Promise<TaskCloseRequestWithRelations[]> {
    const db = this.getDb();
    return db<TaskCloseRequestWithRelations[]>`
      select
        r.id,
        r.task_id,
        r.requested_by,
        r.note,
        r.status,
        r.reviewed_by,
        r.review_note,
        r.reviewed_at,
        r.created_at,
        r.updated_at,
        t.title as task_title,
        p.name as requester_name,
        td.subtopic_name
      from task_close_requests r
      join tasks t on t.id = r.task_id
      join profiles p on p.id = r.requested_by
      left join task_details td on td.id = r.task_id
      where r.status = 'pending' and r.requested_by = ${userId}
      order by r.created_at asc
    `;
  }

  public async getPendingForTask(taskId: string): Promise<TaskCloseRequestWithRelations | null> {
    const db = this.getDb();
    const rows = await db<TaskCloseRequestWithRelations[]>`
      select
        r.id,
        r.task_id,
        r.requested_by,
        r.note,
        r.status,
        r.reviewed_by,
        r.review_note,
        r.reviewed_at,
        r.created_at,
        r.updated_at,
        t.title as task_title,
        p.name as requester_name,
        td.subtopic_name
      from task_close_requests r
      join tasks t on t.id = r.task_id
      join profiles p on p.id = r.requested_by
      left join task_details td on td.id = r.task_id
      where r.task_id = ${taskId} and r.status = 'pending'
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async createRequest(input: {
    taskId: string;
    requestedBy: string;
    note?: string | null;
  }): Promise<TaskCloseRequestWithRelations> {
    const db = this.getDb();
    const taskRows = await db<Array<{ id: string; status: string; title: string }>>`
      select id, status, title from tasks where id = ${input.taskId} limit 1
    `;
    const task = taskRows[0];
    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }
    if (task.status === "completed") {
      throw new Error("TASK_ALREADY_COMPLETED");
    }

    const existing = await this.getPendingForTask(input.taskId);
    if (existing) {
      throw new Error("REQUEST_ALREADY_PENDING");
    }

    const note = input.note?.trim() ? input.note.trim().slice(0, 500) : null;
    const rows = await db<Array<{ id: string }>>`
      insert into task_close_requests (task_id, requested_by, note)
      values (${input.taskId}, ${input.requestedBy}, ${note})
      returning id
    `;
    const created = rows[0];
    if (!created) {
      throw new Error("INSERT_FAILED");
    }
    const full = await this.getPendingForTask(input.taskId);
    if (!full) {
      throw new Error("INSERT_FAILED");
    }
    return full;
  }

  public async cancelRequest(requestId: string, userId: string): Promise<void> {
    const db = this.getDb();
    const rows = await db<Array<{ id: string }>>`
      update task_close_requests
      set status = 'cancelled', updated_at = now()
      where id = ${requestId}
        and requested_by = ${userId}
        and status = 'pending'
      returning id
    `;
    if (rows.length === 0) {
      throw new Error("REQUEST_NOT_FOUND");
    }
  }

  public async approveRequest(requestId: string, adminId: string): Promise<TaskCloseRequestWithRelations> {
    const db = this.getDb();
    const rows = await db<
      Array<{
        id: string;
        task_id: string;
        requested_by: string;
        note: string | null;
        task_title: string;
      }>
    >`
      select r.id, r.task_id, r.requested_by, r.note, t.title as task_title
      from task_close_requests r
      join tasks t on t.id = r.task_id
      where r.id = ${requestId} and r.status = 'pending'
      limit 1
    `;
    const request = rows[0];
    if (!request) {
      throw new Error("REQUEST_NOT_FOUND");
    }

    await db`
      update tasks
      set status = 'completed', updated_at = now()
      where id = ${request.task_id}
    `;
    await db`
      update task_close_requests
      set
        status = 'approved',
        reviewed_by = ${adminId},
        reviewed_at = now(),
        updated_at = now()
      where id = ${requestId}
    `;

    return {
      id: request.id,
      task_id: request.task_id,
      requested_by: request.requested_by,
      note: request.note,
      status: "approved",
      reviewed_by: adminId,
      review_note: null,
      reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_title: request.task_title,
    };
  }

  public async rejectRequest(
    requestId: string,
    adminId: string,
    reviewNote?: string | null,
  ): Promise<TaskCloseRequestWithRelations> {
    const db = this.getDb();
    const note = reviewNote?.trim() ? reviewNote.trim().slice(0, 500) : null;
    const rows = await db<
      Array<{
        id: string;
        task_id: string;
        requested_by: string;
        note: string | null;
        task_title: string;
      }>
    >`
      select r.id, r.task_id, r.requested_by, r.note, t.title as task_title
      from task_close_requests r
      join tasks t on t.id = r.task_id
      where r.id = ${requestId} and r.status = 'pending'
      limit 1
    `;
    const request = rows[0];
    if (!request) {
      throw new Error("REQUEST_NOT_FOUND");
    }

    await db`
      update task_close_requests
      set
        status = 'rejected',
        reviewed_by = ${adminId},
        review_note = ${note},
        reviewed_at = now(),
        updated_at = now()
      where id = ${requestId}
    `;

    return {
      id: request.id,
      task_id: request.task_id,
      requested_by: request.requested_by,
      note: request.note,
      status: "rejected",
      reviewed_by: adminId,
      review_note: note,
      reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_title: request.task_title,
    };
  }

  public async cancelPendingForTask(taskId: string): Promise<void> {
    const db = this.getDb();
    await db`
      update task_close_requests
      set status = 'cancelled', updated_at = now()
      where task_id = ${taskId} and status = 'pending'
    `;
  }
}
