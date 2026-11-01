import { BaseService } from "@/services/base.service";
import type { AgamTimelineTemplate } from "@/modules/agam/types";

export class AgamTimelineTemplateService extends BaseService {
  public async getById(id: string): Promise<AgamTimelineTemplate | null> {
    const db = this.getDb();
    const rows = await db<AgamTimelineTemplate[]>`
      select * from agam_timeline_templates where id = ${id} limit 1
    `;
    return rows[0] ?? null;
  }

  public async list(): Promise<AgamTimelineTemplate[]> {
    const db = this.getDb();
    return db<AgamTimelineTemplate[]>`
      select * from agam_timeline_templates
      order by sort_order asc, day_offset asc, created_at asc
    `;
  }

  public async create(input: {
    title: string;
    event_type: AgamTimelineTemplate["event_type"];
    day_offset?: number;
    notes?: string | null;
    sort_order?: number;
    created_by_id?: string | null;
  }): Promise<AgamTimelineTemplate> {
    const db = this.getDb();
    const rows = await db<AgamTimelineTemplate[]>`
      insert into agam_timeline_templates (
        title, event_type, day_offset, notes, sort_order, created_by_id
      )
      values (
        ${input.title},
        ${input.event_type},
        ${input.day_offset ?? 0},
        ${input.notes ?? null},
        ${input.sort_order ?? 0},
        ${input.created_by_id ?? null}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(
    id: string,
    input: {
      title?: string;
      event_type?: AgamTimelineTemplate["event_type"];
      day_offset?: number;
      notes?: string | null;
      sort_order?: number;
    },
  ): Promise<AgamTimelineTemplate> {
    const existing = await this.getById(id);
    if (!existing) throw new Error("NOT_FOUND");
    const db = this.getDb();
    const rows = await db<AgamTimelineTemplate[]>`
      update agam_timeline_templates set
        title = ${input.title ?? existing.title},
        event_type = ${input.event_type ?? existing.event_type},
        day_offset = ${input.day_offset !== undefined ? input.day_offset : existing.day_offset},
        notes = ${input.notes !== undefined ? input.notes : existing.notes},
        sort_order = ${input.sort_order ?? existing.sort_order},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0];
  }

  public async delete(id: string): Promise<void> {
    const db = this.getDb();
    await db`delete from agam_timeline_templates where id = ${id}`;
  }
}
