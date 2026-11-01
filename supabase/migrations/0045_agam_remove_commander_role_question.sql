-- Remove "תפקיד מפקד ישיר" from the public pre-screening questionnaire
update public.agam_questionnaire_questions
set is_active = false, updated_at = now()
where field_key = 'direct_commander_role'
  and question_type = 'pre_screening';
