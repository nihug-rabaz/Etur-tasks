import { BaseService } from "@/services/base.service";
import type {
  AgamConditionOperator,
  AgamFieldType,
  AgamQuestion,
  AgamQuestionType,
} from "@/modules/agam/types";

export class AgamQuestionService extends BaseService {
  public async listActive(type: AgamQuestionType): Promise<AgamQuestion[]> {
    const db = this.getDb();
    const rows = await db<AgamQuestion[]>`
      select * from agam_questionnaire_questions
      where question_type = ${type} and is_active = true
    `;
    return rows.sort(
      (a, b) => a.section_number - b.section_number || a.sort_order - b.sort_order,
    );
  }

  public async listAll(): Promise<AgamQuestion[]> {
    const db = this.getDb();
    const rows = await db<AgamQuestion[]>`
      select * from agam_questionnaire_questions
    `;
    return rows.sort(
      (a, b) =>
        a.question_type.localeCompare(b.question_type) ||
        a.section_number - b.section_number ||
        a.sort_order - b.sort_order,
    );
  }

  public async create(input: {
    question_type: AgamQuestionType;
    section_number: number;
    section_name: string | null;
    question_text: string;
    field_key: string;
    field_type: AgamFieldType;
    options: string | null;
    is_required: boolean;
    condition_field: string | null;
    condition_operator: AgamConditionOperator | null;
    condition_value: string | null;
    sort_order: number;
    is_active: boolean;
  }): Promise<AgamQuestion> {
    const db = this.getDb();
    const rows = await db<AgamQuestion[]>`
      insert into agam_questionnaire_questions (
        question_type, section_number, section_name, question_text, field_key, field_type,
        options, is_required, condition_field, condition_operator, condition_value, sort_order, is_active
      )
      values (
        ${input.question_type},
        ${input.section_number},
        ${input.section_name},
        ${input.question_text},
        ${input.field_key},
        ${input.field_type},
        ${input.options},
        ${input.is_required},
        ${input.condition_field},
        ${input.condition_operator},
        ${input.condition_value},
        ${input.sort_order},
        ${input.is_active}
      )
      returning *
    `;
    return rows[0];
  }

  public async update(id: string, input: Parameters<AgamQuestionService["create"]>[0]): Promise<AgamQuestion | null> {
    const db = this.getDb();
    const rows = await db<AgamQuestion[]>`
      update agam_questionnaire_questions set
        question_type = ${input.question_type},
        section_number = ${input.section_number},
        section_name = ${input.section_name},
        question_text = ${input.question_text},
        field_key = ${input.field_key},
        field_type = ${input.field_type},
        options = ${input.options},
        is_required = ${input.is_required},
        condition_field = ${input.condition_field},
        condition_operator = ${input.condition_operator},
        condition_value = ${input.condition_value},
        sort_order = ${input.sort_order},
        is_active = ${input.is_active},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] ?? null;
  }

  public async delete(id: string): Promise<void> {
    const db = this.getDb();
    await db`delete from agam_questionnaire_questions where id = ${id}`;
  }
}
