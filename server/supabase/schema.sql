begin;
set local search_path = public, extensions, pg_catalog;
create extension if not exists vector with schema extensions;

create table if not exists public.app_users (
  id text primary key,
  label text,
  email text,
  last_seen_at timestamptz default now()
);

create table if not exists public.document_analyses (
  id text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  filename text,
  file_type text,
  source_type text,
  language text,
  detected_language text,
  output_language_mode text,
  preview text,
  original_text text,
  simplified text,
  translated text,
  clauses jsonb default '[]'::jsonb,
  risk_score jsonb,
  actionable_advice jsonb default '[]'::jsonb,
  storage_path text,
  source_text text,
  created_at timestamptz default now()
);

alter table if exists public.document_analyses add column if not exists detected_language text;
alter table if exists public.document_analyses add column if not exists output_language_mode text;
alter table if exists public.document_analyses add column if not exists risk_score jsonb;
alter table if exists public.document_analyses add column if not exists actionable_advice jsonb default '[]'::jsonb;

create table if not exists public.document_rag_chunks (
  id bigserial primary key,
  analysis_id text not null references public.document_analyses(id) on delete cascade,
  user_id text not null references public.app_users(id) on delete cascade,
  filename text,
  chunk_index integer not null,
  content text not null,
  embedding vector(256) not null,
  search_vector tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored,
  created_at timestamptz default now()
);

alter table if exists public.document_rag_chunks
  add column if not exists search_vector tsvector generated always as (to_tsvector('english', coalesce(content, ''))) stored;

create index if not exists document_rag_chunks_analysis_idx on public.document_rag_chunks (analysis_id, user_id, chunk_index);
create index if not exists document_rag_chunks_embedding_idx on public.document_rag_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists document_rag_chunks_search_idx on public.document_rag_chunks using gin (search_vector);

-- Close browser access before the base schema transaction becomes visible.
alter table public.app_users enable row level security;
alter table public.document_analyses enable row level security;
alter table public.document_rag_chunks enable row level security;
commit;
