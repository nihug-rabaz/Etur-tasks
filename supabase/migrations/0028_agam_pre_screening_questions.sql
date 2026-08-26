delete from public.agam_questionnaire_questions
where question_type = 'pre_screening';

insert into public.agam_questionnaire_questions (
  question_type, section_number, section_name, question_text, field_key, field_type,
  options, is_required, condition_field, condition_operator, condition_value, sort_order, is_active
)
values
  ('pre_screening', 1, 'פרטים אישיים', 'שם מלא', 'full_name', 'text', null, true, null, null, null, 1, true),
  ('pre_screening', 1, 'פרטים אישיים', 'מספר אישי', 'personal_number', 'text', null, true, null, null, null, 2, true),
  ('pre_screening', 1, 'פרטים אישיים', 'טלפון', 'phone', 'text', null, true, null, null, null, 3, true),
  ('pre_screening', 2, 'שירות', 'פיקוד', 'command', 'text', null, true, null, null, null, 1, true),
  ('pre_screening', 2, 'שירות', 'יחידה', 'unit', 'text', null, true, null, null, null, 2, true),
  ('pre_screening', 2, 'שירות', 'שם מפקד', 'commander_name', 'text', null, true, null, null, null, 3, true),
  ('pre_screening', 2, 'שירות', 'שם קצין דת וחיילת שלישות', 'religious_officer_logistics', 'text', null, true, null, null, null, 4, true),
  ('pre_screening', 3, 'פרטי קשר ותפקיד', 'אימייל אזרחי', 'civilian_email', 'text', null, true, null, null, null, 1, true),
  ('pre_screening', 3, 'פרטי קשר ותפקיד', 'תפקיד', 'position', 'text', null, true, null, null, null, 2, true),
  ('pre_screening', 3, 'פרטי קשר ותפקיד', 'פז״ם (חודשים בשירות)', 'pazam_months', 'number', null, true, null, null, null, 3, true);
