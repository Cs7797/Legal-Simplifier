begin;

-- These tables are accessed exclusively by Express using the service role or
-- the dedicated PostgreSQL connection. Browser clients use Supabase Auth only.
alter table public.app_users enable row level security;
alter table public.document_analyses enable row level security;
alter table public.document_rag_chunks enable row level security;
revoke all on public.app_users, public.document_analyses, public.document_rag_chunks
  from public, anon, authenticated;
revoke all on sequence public.document_rag_chunks_id_seq from public, anon, authenticated;
grant select, insert, update, delete on
  public.app_users, public.document_analyses, public.document_rag_chunks to service_role;
grant usage, select on sequence public.document_rag_chunks_id_seq to service_role;

-- Applying this to an existing database does not change existing rows.
create unique index if not exists document_analyses_id_owner_idx
  on public.document_analyses (id, user_id);
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'document_rag_chunks_analysis_owner_fk'
      and conrelid = 'public.document_rag_chunks'::regclass
  ) then
    alter table public.document_rag_chunks add constraint document_rag_chunks_analysis_owner_fk
      foreign key (analysis_id, user_id)
      references public.document_analyses (id, user_id) on delete cascade not valid;
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('legal-files', 'legal-files', false)
on conflict (id) do update set public = false;

-- A broad pre-existing Storage policy must not expose this bucket.
drop policy if exists legal_files_service_only on storage.objects;
create policy legal_files_service_only on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'legal-files')
  with check (bucket_id <> 'legal-files');

create or replace function public.replace_document_rag_chunks(
  target_analysis_id text,
  target_user_id text,
  replacement_chunks jsonb
) returns void
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  perform 1 from public.document_analyses
    where id = target_analysis_id and user_id = target_user_id
    for update;
  if not found then
    raise exception 'Analysis is unavailable';
  end if;

  delete from public.document_rag_chunks
    where analysis_id = target_analysis_id and user_id = target_user_id;
  insert into public.document_rag_chunks
    (analysis_id, user_id, filename, chunk_index, content, embedding)
  select target_analysis_id, target_user_id, chunk.filename, chunk.chunk_index,
    chunk.content, chunk.embedding::vector
  from jsonb_to_recordset(replacement_chunks)
    as chunk(filename text, chunk_index integer, content text, embedding text);
end;
$$;

revoke execute on function public.replace_document_rag_chunks(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_document_rag_chunks(text, text, jsonb) to service_role;
commit;
