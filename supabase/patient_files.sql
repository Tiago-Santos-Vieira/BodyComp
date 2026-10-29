-- Arquivos dos pacientes (exames, laudos, fotos de documentos).
-- Os arquivos ficam no bucket privado "patient-files", na pasta <id do nutricionista>/<id do paciente>/.
-- A tabela patient_files guarda nome, descrição, tipo e tamanho de cada um e controla a cota.
-- Limites: 10 MB por arquivo e 200 MB por nutricionista. Rodar no SQL Editor do Supabase.

create table if not exists public.patient_files (
  id uuid primary key default gen_random_uuid(),
  nutri_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  path text not null unique,
  name text not null,
  description text,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create index if not exists patient_files_patient_idx on public.patient_files (patient_id);
create index if not exists patient_files_nutri_idx on public.patient_files (nutri_id);

alter table public.patient_files enable row level security;

drop policy if exists "Nutricionista gerencia apenas seus arquivos" on public.patient_files;
create policy "Nutricionista gerencia apenas seus arquivos"
  on public.patient_files for all to authenticated
  using (auth.uid() = nutri_id)
  with check (
    auth.uid() = nutri_id
    and path like auth.uid()::text || '/%'
    and exists (select 1 from public.patients p where p.id = patient_id and p.nutri_id = auth.uid())
  );

-- Cota de 200 MB por nutricionista, e tamanho/caminho não mudam depois de gravados
create or replace function public.patient_files_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  usado bigint;
begin
  if tg_op = 'UPDATE' then
    if new.size_bytes <> old.size_bytes or new.path <> old.path or new.nutri_id <> old.nutri_id then
      raise exception 'Arquivo não pode ter tamanho, caminho ou dono alterados.';
    end if;
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext(new.nutri_id::text));
  select coalesce(sum(size_bytes), 0) into usado from public.patient_files where nutri_id = new.nutri_id;
  if usado + new.size_bytes > 209715200 then
    raise exception 'COTA_EXCEDIDA';
  end if;
  return new;
end $$;

drop trigger if exists patient_files_guard on public.patient_files;
create trigger patient_files_guard
  before insert or update on public.patient_files
  for each row execute function public.patient_files_guard();

-- Bucket privado: até 10 MB por arquivo, só PDF e imagens
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-files', 'patient-files', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Arquivos de pacientes: ler os seus" on storage.objects;
create policy "Arquivos de pacientes: ler os seus"
  on storage.objects for select to authenticated
  using (bucket_id = 'patient-files' and (storage.foldername(storage.objects.name))[1] = auth.uid()::text);

-- Só envia se o arquivo já foi registrado (e passou pela cota) na tabela patient_files
drop policy if exists "Arquivos de pacientes: enviar os seus" on storage.objects;
create policy "Arquivos de pacientes: enviar os seus"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'patient-files'
    and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
    and exists (select 1 from public.patient_files f where f.path = storage.objects.name and f.nutri_id = auth.uid())
  );

drop policy if exists "Arquivos de pacientes: apagar os seus" on storage.objects;
create policy "Arquivos de pacientes: apagar os seus"
  on storage.objects for delete to authenticated
  using (bucket_id = 'patient-files' and (storage.foldername(storage.objects.name))[1] = auth.uid()::text);
