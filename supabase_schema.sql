-- Execute estes comandos na aba "SQL Editor" do seu painel do Supabase.

-- Tabela de Pacientes
create table public.patients (
  id uuid default gen_random_uuid() primary key,
  nutri_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  status text not null default 'Novo',
  objective text,
  avatar_url text,
  phone text,
  email text,
  last_consultation timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Habilitar a política de segurança RLS na tabela de Pacientes
alter table public.patients enable row level security;

-- Criar a política onde o nutricionista só lê/edita os SEUS próprios pacientes
create policy "Nutricionista gerencia apenas seus pacientes"
  on public.patients for all
  using ( auth.uid() = nutri_id );
  
-- Tabela de Dietas
create table public.diets (
  id uuid default gen_random_uuid() primary key,
  nutri_id uuid references auth.users(id) on delete cascade not null,
  patient_id uuid references public.patients(id) on delete cascade not null,
  meals jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.diets enable row level security;

create policy "Nutricionista gerencia apenas suas dietas"
  on public.diets for all
  using ( auth.uid() = nutri_id );
