create table public.performance_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  page text not null,
  metric text not null,
  value numeric not null,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.performance_log enable row level security;

create policy "Users can insert own metrics" on public.performance_log
  for insert with check (user_id = auth.uid());

create policy "Users can read own metrics" on public.performance_log
  for select using (user_id = auth.uid());

create index idx_perf_log_page_metric on public.performance_log(page, metric, created_at desc);
