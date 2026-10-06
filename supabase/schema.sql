-- Health Zzang DB Schema
-- Supabase SQL Editor에서 실행

-- 1. Crew 테이블
create table public.crew (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Default crew 생성
insert into public.crew (name) values ('Health Zzang');

-- 2. User profiles (Supabase Auth 연동)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text not null,
  crew_id uuid references public.crew(id) not null,
  created_at timestamptz default now()
);

-- 3. Season 테이블
create table public.season (
  id uuid default gen_random_uuid() primary key,
  crew_id uuid references public.crew(id) not null,
  name text not null,
  start_date date not null,
  end_date date,
  is_active boolean default true,
  default_target_count integer not null,
  default_penalty_per_miss integer not null,
  default_reward_per_extra integer default 0,
  created_at timestamptz default now()
);

-- 4. WeeklyRule (override가 필요한 주만 생성)
create table public.weekly_rule (
  id uuid default gen_random_uuid() primary key,
  season_id uuid references public.season(id) on delete cascade not null,
  week_start date not null,
  target_count integer not null,
  penalty_per_miss integer not null,
  reward_per_extra integer default 0,
  created_at timestamptz default now(),
  unique(season_id, week_start)
);

-- 5. Workout (운동 인증)
create table public.workout (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  season_id uuid references public.season(id) on delete cascade not null,
  date date not null,
  note text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- 6. Media (사진/영상)
create table public.media (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.workout(id) on delete cascade not null,
  r2_key text not null,
  type text not null check (type in ('photo', 'video')),
  size_bytes bigint not null,
  created_at timestamptz default now()
);

-- RLS (Row Level Security) 활성화
alter table public.crew enable row level security;
alter table public.profiles enable row level security;
alter table public.season enable row level security;
alter table public.weekly_rule enable row level security;
alter table public.workout enable row level security;
alter table public.media enable row level security;

-- RLS Policies: 인증된 사용자는 같은 crew 데이터만 접근
create policy "Crew members can read crew" on public.crew
  for select using (
    id in (select crew_id from public.profiles where id = auth.uid())
  );

create policy "Crew members can read profiles" on public.profiles
  for select using (
    crew_id in (select crew_id from public.profiles where id = auth.uid())
  );

create policy "Crew members can read seasons" on public.season
  for select using (
    crew_id in (select crew_id from public.profiles where id = auth.uid())
  );

create policy "Crew members can insert seasons" on public.season
  for insert with check (
    crew_id in (select crew_id from public.profiles where id = auth.uid())
  );

create policy "Crew members can update seasons" on public.season
  for update using (
    crew_id in (select crew_id from public.profiles where id = auth.uid())
  );

create policy "Crew members can read weekly rules" on public.weekly_rule
  for select using (
    season_id in (
      select id from public.season where crew_id in (
        select crew_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "Crew members can manage weekly rules" on public.weekly_rule
  for all using (
    season_id in (
      select id from public.season where crew_id in (
        select crew_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "Crew members can read workouts" on public.workout
  for select using (
    user_id in (
      select id from public.profiles where crew_id in (
        select crew_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "Users can insert own workouts" on public.workout
  for insert with check (user_id = auth.uid());

create policy "Crew members can read media" on public.media
  for select using (
    workout_id in (
      select id from public.workout where user_id in (
        select id from public.profiles where crew_id in (
          select crew_id from public.profiles where id = auth.uid()
        )
      )
    )
  );

create policy "Users can insert own media" on public.media
  for insert with check (
    workout_id in (select id from public.workout where user_id = auth.uid())
  );
