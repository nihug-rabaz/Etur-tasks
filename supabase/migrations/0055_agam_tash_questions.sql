-- Pre-screening: ת״ש questions (level, medical, assignment limits) shown only when the candidate has ת״ש

delete from public.agam_questionnaire_questions
where question_type = 'pre_screening'
  and field_key in ('has_tash', 'tash', 'tash_medical', 'tash_assignment_limits');

insert into public.agam_questionnaire_questions (
  question_type, section_number, section_name, question_text, field_key, field_type,
  options, is_required, condition_field, condition_operator, condition_value, sort_order, is_active
)
values
  ('pre_screening', 5, 'התניות', 'האם יש לך ת״ש?', 'has_tash', 'select', '["כן","לא"]', true, null, null, null, 6, true),
  ('pre_screening', 5, 'התניות', 'רמת ת״ש', 'tash', 'select', '["1","2","3","4","5","6","7"]', true, 'has_tash', 'eq', 'כן', 7, true),
  ('pre_screening', 5, 'התניות', 'האם הת״ש רפואי?', 'tash_medical', 'select', '["כן","לא"]', true, 'has_tash', 'eq', 'כן', 8, true),
  ('pre_screening', 5, 'התניות', 'האם זה מגביל אותך בשיבוץ? (למשל מרחק מסוים מבית חולים וכדומה)', 'tash_assignment_limits', 'textarea', null, false, 'has_tash', 'eq', 'כן', 9, true);
