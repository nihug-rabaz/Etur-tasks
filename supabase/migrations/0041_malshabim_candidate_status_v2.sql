-- Remap malshabim candidate_status to the four operational statuses
update public.malshabim_candidates
set candidate_status = case
  when candidate_status in ('שובץ', 'אושר ושובץ') then 'אושר ושובץ'
  when candidate_status in ('אושר', 'אושר ולא שובץ', 'הושלם') then 'אושר ולא שובץ'
  when candidate_status in ('לא אושר') then 'לא אושר'
  when candidate_status in (
    'בטיפול',
    'ממתין לריאיון',
    'חדש',
    'ממתין לעדכון'
  ) then 'בטיפול'
  else 'בטיפול'
end;

alter table public.malshabim_candidates
  alter column candidate_status set default 'בטיפול';
