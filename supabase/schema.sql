-- H2 Consultoria — captação de leads da landing page
-- Rode este arquivo no SQL Editor do projeto Supabase.

create table if not exists public.leads (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),

    nome        text not null,
    whatsapp    text not null,
    email       text,
    conceito    text,
    fase        text,

    -- contexto de origem, útil pra medir campanha
    origem      text,
    referrer    text,
    user_agent  text
);

comment on table public.leads is 'Leads do formulário da LP de abertura de restaurante';

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- RLS ligada e sem policy de insert: ninguém grava direto do browser.
-- A gravação passa pela função /api/leads, que usa a service role key
-- (service role ignora RLS) e roda só no servidor da Vercel.
alter table public.leads enable row level security;

-- Quem estiver logado no painel pode ler os leads.
drop policy if exists "leitura para usuarios autenticados" on public.leads;
create policy "leitura para usuarios autenticados"
    on public.leads
    for select
    to authenticated
    using (true);
