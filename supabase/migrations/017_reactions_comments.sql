-- Feature 017: 게시물 이모지 반응 및 댓글

-- Reaction table
create table if not exists reaction (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workout(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (workout_id, user_id, emoji)
);

create index idx_reaction_workout on reaction(workout_id);

-- Comment table
create table if not exists comment (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workout(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comment_workout on comment(workout_id);
create index idx_comment_created on comment(workout_id, created_at);

-- RLS policies for reaction
alter table reaction enable row level security;

create policy "crew members can view reactions"
  on reaction for select
  using (
    exists (
      select 1 from profiles p1
      join profiles p2 on p1.crew_id = p2.crew_id
      where p1.id = auth.uid() and p2.id = reaction.user_id
    )
  );

create policy "authenticated users can insert reactions"
  on reaction for insert
  with check (auth.uid() = user_id);

create policy "users can delete own reactions"
  on reaction for delete
  using (auth.uid() = user_id);

-- RLS policies for comment
alter table comment enable row level security;

create policy "crew members can view comments"
  on comment for select
  using (
    exists (
      select 1 from profiles p1
      join profiles p2 on p1.crew_id = p2.crew_id
      where p1.id = auth.uid() and p2.id = comment.user_id
    )
  );

create policy "authenticated users can insert comments"
  on comment for insert
  with check (auth.uid() = user_id);

create policy "users can update own comments"
  on comment for update
  using (auth.uid() = user_id);

create policy "users can delete own comments"
  on comment for delete
  using (auth.uid() = user_id);
