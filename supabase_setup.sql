-- Run this in your Supabase project's SQL editor
-- (Dashboard → SQL Editor → New query)

-- 1. Create the posts table
create table if not exists posts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  class       text not null,
  school_year text not null,
  city        text not null,
  country     text not null,
  caption     text not null,
  image_url   text not null,
  lat         float8,
  lng         float8,
  created_at  timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table posts enable row level security;

-- 3. Allow anyone to read all posts
create policy "Public read" on posts
  for select using (true);

-- 4. Allow anyone to insert (no login required)
create policy "Public insert" on posts
  for insert with check (true);

-- No update or delete policies → only you can modify data via the Supabase dashboard
