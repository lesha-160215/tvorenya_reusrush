-- Safe migration for the existing site: adds bilingual fields without deleting publications.
alter table public.artworks
  add column if not exists title_en text not null default '',
  add column if not exists description_en text not null default '';

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- Site settings are accessed only by the Vercel API using the service-role key.
-- Do not create public read/write policies for this table.
