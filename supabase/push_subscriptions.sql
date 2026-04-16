create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  subscription jsonb not null,
  notify_hour int not null default 20,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "Users manage own push subscription"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
