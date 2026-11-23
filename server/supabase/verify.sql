-- Read-only inspection for the Supabase SQL Editor.
select e.extname, n.nspname as extension_schema from pg_extension e
join pg_namespace n on n.oid=e.extnamespace where e.extname='vector';

select c.relname, c.relrowsecurity as rls, r.role_name,
  has_table_privilege(r.role_name,c.oid,'SELECT') as can_read,
  has_table_privilege(r.role_name,c.oid,'INSERT') as can_insert,
  has_table_privilege(r.role_name,c.oid,'UPDATE') as can_update,
  has_table_privilege(r.role_name,c.oid,'DELETE') as can_delete
from pg_class c cross join (values ('anon'),('authenticated'),('service_role')) r(role_name)
where c.relnamespace='public'::regnamespace and c.relname in
 ('app_users','document_analyses','document_rag_chunks') order by 1,3;

select conrelid::regclass as relation, conname, convalidated, pg_get_constraintdef(oid)
from pg_constraint where conrelid in ('public.document_analyses'::regclass,
 'public.document_rag_chunks'::regclass,'public.app_users'::regclass) order by 1,2;
select attname, format_type(atttypid,atttypmod), attgenerated
from pg_attribute where attrelid='public.document_rag_chunks'::regclass
 and attname in ('embedding','search_vector');
select indexname,indexdef from pg_indexes where schemaname='public' and tablename in
 ('app_users','document_analyses','document_rag_chunks') order by indexname;
select id,public from storage.buckets where id='legal-files';
select policyname,permissive,roles,cmd,qual,with_check from pg_policies
where schemaname='storage' and tablename='objects' and policyname='legal_files_service_only';
select role_name,has_function_privilege(role_name,
 'public.replace_document_rag_chunks(text,text,jsonb)','EXECUTE') as may_replace_chunks,
 has_sequence_privilege(role_name,'public.document_rag_chunks_id_seq','USAGE') as may_allocate_chunk_id
from (values ('anon'),('authenticated'),('service_role')) r(role_name);
