import { BaseService } from "@/services/base.service";
import type { DovrutInquirySubject } from "@/modules/dovrut/types";

export class DovrutInquirySubjectService extends BaseService {
  public async list(includeDeleted = false): Promise<DovrutInquirySubject[]> {
    const db = this.getDb();
    return db<DovrutInquirySubject[]>`
      select * from dovrut_inquiry_subjects
      where ${includeDeleted ? "1" : "0"} = '1' or deleted_at is null
      order by updated_at desc
    `;
  }

  public async getById(id: string, includeDeleted = false): Promise<DovrutInquirySubject | null> {
    const db = this.getDb();
    const rows = await db<DovrutInquirySubject[]>`
      select * from dovrut_inquiry_subjects
      where id = ${id}
        and (${includeDeleted ? "1" : "0"} = '1' or deleted_at is null)
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async create(input: {
    name: string;
    age?: number | null;
    hometown?: string | null;
    family_status?: string | null;
    enlistment_year?: number | null;
    years_in_role?: number | null;
    role_title?: string | null;
    previous_roles?: string | null;
    bio?: string;
    notes?: string | null;
    created_by: string;
  }): Promise<DovrutInquirySubject> {
    const db = this.getDb();
    const rows = await db<DovrutInquirySubject[]>`
      insert into dovrut_inquiry_subjects (
        name, age, hometown, family_status, enlistment_year, years_in_role,
        role_title, previous_roles, bio, notes, created_by
      ) values (
        ${input.name},
        ${input.age ?? null},
        ${input.hometown ?? null},
        ${input.family_status ?? null},
        ${input.enlistment_year ?? null},
        ${input.years_in_role ?? null},
        ${input.role_title ?? null},
        ${input.previous_roles ?? null},
        ${input.bio ?? ""},
        ${input.notes ?? null},
        ${input.created_by}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(
    id: string,
    input: Partial<Omit<DovrutInquirySubject, "id" | "created_by" | "created_at" | "updated_at" | "deleted_at">>,
  ): Promise<DovrutInquirySubject | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = this.getDb();
    const rows = await db<DovrutInquirySubject[]>`
      update dovrut_inquiry_subjects set
        name = ${input.name ?? existing.name},
        age = ${input.age !== undefined ? input.age : existing.age},
        hometown = ${input.hometown !== undefined ? input.hometown : existing.hometown},
        family_status = ${input.family_status !== undefined ? input.family_status : existing.family_status},
        enlistment_year = ${
          input.enlistment_year !== undefined ? input.enlistment_year : existing.enlistment_year
        },
        years_in_role = ${input.years_in_role !== undefined ? input.years_in_role : existing.years_in_role},
        role_title = ${input.role_title !== undefined ? input.role_title : existing.role_title},
        previous_roles = ${
          input.previous_roles !== undefined ? input.previous_roles : existing.previous_roles
        },
        bio = ${input.bio !== undefined ? input.bio : existing.bio},
        notes = ${input.notes !== undefined ? input.notes : existing.notes},
        updated_at = now()
      where id = ${id} and deleted_at is null
      returning *
    `;
    return rows[0] ?? null;
  }

  public async softDelete(id: string): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<{ id: string }[]>`
      update dovrut_inquiry_subjects
      set deleted_at = now(), updated_at = now()
      where id = ${id} and deleted_at is null
      returning id
    `;
    return rows.length > 0;
  }
}
