import { BaseService } from "@/services/base.service";
import {
  ageFromBirthDate,
  toDateInputValue,
  yearsFromRoleStart,
} from "@/modules/dovrut/lib/inquiry-subjects";
import type { DovrutInquirySubject } from "@/modules/dovrut/types";

type InquiryWriteInput = {
  name: string;
  rank?: string | null;
  age?: number | null;
  birth_date?: string | null;
  hometown?: string | null;
  family_status?: string | null;
  enlistment_year?: number | null;
  years_in_role?: number | null;
  role_started_at?: string | null;
  role_title?: string | null;
  previous_roles?: string | null;
  bio?: string;
  notes?: string | null;
};

export class DovrutInquirySubjectService extends BaseService {
  private resolveDerived(input: InquiryWriteInput, existing?: DovrutInquirySubject) {
    const birthDate =
      input.birth_date !== undefined ? input.birth_date : existing?.birth_date ?? null;
    const roleStartedAt =
      input.role_started_at !== undefined
        ? input.role_started_at
        : existing?.role_started_at ?? null;
    const birthIso = toDateInputValue(birthDate);
    const roleIso = toDateInputValue(roleStartedAt);
    const ageFromDate = ageFromBirthDate(birthIso || null);
    const yearsFromDate = yearsFromRoleStart(roleIso || null);
    return {
      birth_date: birthIso || null,
      role_started_at: roleIso || null,
      age:
        ageFromDate ??
        (input.age !== undefined ? input.age : existing?.age ?? null),
      years_in_role:
        yearsFromDate ??
        (input.years_in_role !== undefined
          ? input.years_in_role
          : existing?.years_in_role ?? null),
    };
  }

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

  public async create(
    input: InquiryWriteInput & { created_by: string },
  ): Promise<DovrutInquirySubject> {
    const derived = this.resolveDerived(input);
    const db = this.getDb();
    const rows = await db<DovrutInquirySubject[]>`
      insert into dovrut_inquiry_subjects (
        name, rank, age, birth_date, hometown, family_status, enlistment_year,
        years_in_role, role_started_at, role_title, previous_roles, bio, notes, created_by
      ) values (
        ${input.name},
        ${input.rank ?? null},
        ${derived.age},
        ${derived.birth_date},
        ${input.hometown ?? null},
        ${input.family_status ?? null},
        ${input.enlistment_year ?? null},
        ${derived.years_in_role},
        ${derived.role_started_at},
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
    input: Partial<InquiryWriteInput>,
  ): Promise<DovrutInquirySubject | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const derived = this.resolveDerived(
      {
        name: input.name ?? existing.name,
        ...input,
      },
      existing,
    );
    const db = this.getDb();
    const rows = await db<DovrutInquirySubject[]>`
      update dovrut_inquiry_subjects set
        name = ${input.name ?? existing.name},
        rank = ${input.rank !== undefined ? input.rank : existing.rank},
        age = ${derived.age},
        birth_date = ${derived.birth_date},
        hometown = ${input.hometown !== undefined ? input.hometown : existing.hometown},
        family_status = ${input.family_status !== undefined ? input.family_status : existing.family_status},
        enlistment_year = ${
          input.enlistment_year !== undefined ? input.enlistment_year : existing.enlistment_year
        },
        years_in_role = ${derived.years_in_role},
        role_started_at = ${derived.role_started_at},
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
