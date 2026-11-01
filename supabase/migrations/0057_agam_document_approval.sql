-- Manager approval of uploaded candidate documents.
alter table public.agam_candidate_documents
  add column if not exists approved_at timestamptz;

alter table public.agam_candidate_documents
  add column if not exists approved_by_name text;
