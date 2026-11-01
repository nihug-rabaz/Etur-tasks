create table if not exists public.agam_document_files (
  id uuid primary key default gen_random_uuid(),
  content_type text not null default 'application/octet-stream',
  data_base64 text not null,
  created_at timestamptz not null default now()
);

alter table public.agam_candidate_documents
  add column if not exists file_size integer;

alter table public.agam_candidate_documents
  add column if not exists content_type text;
