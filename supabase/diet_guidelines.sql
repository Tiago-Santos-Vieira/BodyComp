-- Orientações ao paciente no plano alimentar (campo de texto livre na tela de Dietas).
-- Só acrescenta uma coluna: não mexe nas dietas existentes, nas regras de acesso (RLS) nem no kiwify-webhook.
alter table public.diets add column if not exists guidelines text not null default '';
