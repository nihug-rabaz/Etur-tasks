import { BaseService } from "@/services/base.service";
import { TaskAccessContext } from "@/services/authorization.service";
import { CalendarEventWithRelations } from "@/types/models";

export interface CreateCalendarEventInput {
  title: string;
  description?: string | null;
  subtopicId: string;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  participantIds: string[];
  createdBy: string;
}

export interface UpdateCalendarEventInput {
  id: string;
  title?: string;
  description?: string | null;
  subtopicId?: string;
  location?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  allDay?: boolean;
  participantIds?: string[];
}

export class CalendarEventService extends BaseService {
  public async getEventsInRange(
    access: TaskAccessContext,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<CalendarEventWithRelations[]> {
    const db = this.getDb();
    return db<CalendarEventWithRelations[]>`
      select * from calendar_event_details
      where cancelled_at is null
        and starts_at <= ${rangeEnd.toISOString()}
        and coalesce(ends_at, starts_at) >= ${rangeStart.toISOString()}
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      order by starts_at asc
    `;
  }

  public async getOne(
    access: TaskAccessContext,
    eventId: string,
  ): Promise<CalendarEventWithRelations | null> {
    const db = this.getDb();
    const rows = await db<CalendarEventWithRelations[]>`
      select * from calendar_event_details
      where id = ${eventId}
        and cancelled_at is null
        and (
          ${access.unrestricted}::boolean
          or subtopic_id in (select subtopic_id from user_subtopic_permissions where user_id = ${access.userId})
        )
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async create(input: CreateCalendarEventInput): Promise<string> {
    const db = this.getDb();
    const rows = await db<Array<{ id: string }>>`
      insert into calendar_events (
        title, description, subtopic_id, location, starts_at, ends_at, all_day, created_by
      )
      values (
        ${input.title},
        ${input.description ?? null},
        ${input.subtopicId},
        ${input.location ?? null},
        ${input.startsAt},
        ${input.endsAt ?? null},
        ${input.allDay ?? false},
        ${input.createdBy}
      )
      returning id
    `;
    const eventId = rows[0]?.id;
    if (!eventId) throw new Error("Insert failed");
    await this.replaceParticipants(eventId, input.participantIds);
    return eventId;
  }

  public async update(input: UpdateCalendarEventInput): Promise<void> {
    const db = this.getDb();
    if (input.title !== undefined) {
      await db`update calendar_events set title = ${input.title}, updated_at = now() where id = ${input.id}`;
    }
    if (input.description !== undefined) {
      await db`update calendar_events set description = ${input.description}, updated_at = now() where id = ${input.id}`;
    }
    if (input.subtopicId !== undefined) {
      await db`update calendar_events set subtopic_id = ${input.subtopicId}, updated_at = now() where id = ${input.id}`;
    }
    if (input.location !== undefined) {
      await db`update calendar_events set location = ${input.location}, updated_at = now() where id = ${input.id}`;
    }
    if (input.startsAt !== undefined) {
      await db`update calendar_events set starts_at = ${input.startsAt}, updated_at = now() where id = ${input.id}`;
    }
    if (input.endsAt !== undefined) {
      await db`update calendar_events set ends_at = ${input.endsAt}, updated_at = now() where id = ${input.id}`;
    }
    if (input.allDay !== undefined) {
      await db`update calendar_events set all_day = ${input.allDay}, updated_at = now() where id = ${input.id}`;
    }
    if (input.participantIds !== undefined) {
      await this.replaceParticipants(input.id, input.participantIds);
    }
  }

  public async delete(eventId: string): Promise<void> {
    const db = this.getDb();
    await db`delete from calendar_events where id = ${eventId}`;
  }

  private async replaceParticipants(eventId: string, participantIds: string[]): Promise<void> {
    const db = this.getDb();
    await db`delete from calendar_event_participants where event_id = ${eventId}`;
    for (const userId of participantIds) {
      await db`
        insert into calendar_event_participants (event_id, user_id)
        values (${eventId}, ${userId})
        on conflict do nothing
      `;
    }
  }
}
