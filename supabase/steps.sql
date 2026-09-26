-- Step count sync (via Apple Shortcuts automations posting to a webhook).
-- Run this in your Supabase SQL editor.

alter table user_profiles add column if not exists webhook_token text unique;

create table if not exists step_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  steps integer not null default 0,
  updated_at timestamptz default now(),
  unique(user_id, date)
);

alter table step_logs enable row level security;
create policy "Users can manage their own step_logs" on step_logs for all using (auth.uid() = user_id);
