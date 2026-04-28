create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  timezone text default 'Asia/Tashkent',
  work_hours_start int default 9,
  work_hours_end int default 18,
  pomodoro_focus_min int default 25,
  pomodoro_break_min int default 5,
  pomodoro_long_break_min int default 15,
  theme text default 'dark' check (theme in ('dark','light')),
  accent_color text default '#f0542d',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  project text not null check (project in ('Angular PMS','site-generator','Mobile','Backend/API','Managed-service','Cross-product','Personal')),
  type text not null check (type in ('feature','bug','research','ops','tech-debt','meeting','spike','docs')),
  impact text not null check (impact in ('high','medium','low')),
  effort text not null check (effort in ('XS','S','M','L','XL')),
  priority text not null check (priority in ('P0','P1','P2','P3')),
  status text not null default 'inbox' check (status in ('inbox','backlog','week','progress','review','done','archived')),
  entry_point text default '',
  acceptance_criteria jsonb default '[]'::jsonb,
  dependencies jsonb default '[]'::jsonb,
  tags text[] default '{}',
  due_date date,
  estimated_minutes int,
  actual_minutes int default 0,
  pomodoro_sessions int default 0,
  completed_at timestamptz,
  archived_at timestamptz,
  position int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists daily_mit (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  task_id uuid references tasks(id) on delete set null,
  completed boolean default false,
  created_at timestamptz default now(),
  primary key (user_id, date)
);

create table if not exists red_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  severity text not null default 'medium' check (severity in ('critical','high','medium','low')),
  category text default 'technical' check (category in ('technical','product','process','business','security')),
  status text not null default 'open' check (status in ('open','in_progress','mitigated','resolved','accepted')),
  related_task_id uuid references tasks(id) on delete set null,
  owner text default '',
  identified_at date default current_date,
  target_resolution_date date,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  title text not null,
  status text default 'accepted' check (status in ('proposed','accepted','rejected','superseded','deprecated')),
  context text default '',
  decision text default '',
  alternatives text default '',
  consequences text default '',
  tags text[] default '{}',
  related_task_id uuid references tasks(id) on delete set null,
  superseded_by uuid references decisions(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists retros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('daily','weekly','monthly')),
  field1 text default '',
  field2 text default '',
  field3 text default '',
  mood int check (mood between 1 and 5),
  energy int check (energy between 1 and 5),
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date, type)
);

create table if not exists pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_seconds int not null,
  type text not null check (type in ('focus','short_break','long_break')),
  interrupted boolean default false,
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default '',
  content text default '',
  pinned boolean default false,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  content text not null,
  category text default 'custom',
  usage_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('created','updated','status_changed','priority_changed','completed','commented','archived','restored')),
  from_value text,
  to_value text,
  comment text,
  created_at timestamptz default now()
);

create index if not exists tasks_user_status_idx on tasks(user_id, status) where status != 'archived';
create index if not exists tasks_user_created_idx on tasks(user_id, created_at desc);
create index if not exists tasks_user_priority_idx on tasks(user_id, priority);
create index if not exists tasks_user_project_idx on tasks(user_id, project);
create index if not exists tasks_user_due_idx on tasks(user_id, due_date) where due_date is not null;
create index if not exists tasks_user_tags_idx on tasks using gin(tags);
create index if not exists decisions_user_date_idx on decisions(user_id, date desc);
create index if not exists decisions_user_tags_idx on decisions using gin(tags);
create index if not exists retros_user_type_date_idx on retros(user_id, type, date desc);
create index if not exists flags_user_status_idx on red_flags(user_id, status);
create index if not exists flags_user_severity_idx on red_flags(user_id, severity);
create index if not exists pomodoro_user_started_idx on pomodoro_sessions(user_id, started_at desc);
create index if not exists notes_user_updated_idx on notes(user_id, updated_at desc);
create index if not exists notes_user_tags_idx on notes using gin(tags);
create index if not exists events_task_created_idx on task_events(task_id, created_at desc);

create index if not exists tasks_search_idx on tasks using gin(to_tsvector('russian', title || ' ' || coalesce(description, '') || ' ' || coalesce(entry_point, '')));
create index if not exists decisions_search_idx on decisions using gin(to_tsvector('russian', title || ' ' || coalesce(context, '') || ' ' || coalesce(decision, '')));
create index if not exists notes_search_idx on notes using gin(to_tsvector('russian', coalesce(title, '') || ' ' || content));

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks for each row execute function update_updated_at();
drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
drop trigger if exists flags_updated_at on red_flags;
create trigger flags_updated_at before update on red_flags for each row execute function update_updated_at();
drop trigger if exists decisions_updated_at on decisions;
create trigger decisions_updated_at before update on decisions for each row execute function update_updated_at();
drop trigger if exists notes_updated_at on notes;
create trigger notes_updated_at before update on notes for each row execute function update_updated_at();
drop trigger if exists retros_updated_at on retros;
create trigger retros_updated_at before update on retros for each row execute function update_updated_at();
drop trigger if exists templates_updated_at on user_templates;
create trigger templates_updated_at before update on user_templates for each row execute function update_updated_at();

create or replace function log_task_events()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into task_events (task_id, user_id, event_type, to_value)
    values (new.id, new.user_id, 'created', new.title);
  elsif TG_OP = 'UPDATE' then
    if old.status != new.status then
      insert into task_events (task_id, user_id, event_type, from_value, to_value)
      values (new.id, new.user_id, 'status_changed', old.status, new.status);
    end if;
    if old.priority != new.priority then
      insert into task_events (task_id, user_id, event_type, from_value, to_value)
      values (new.id, new.user_id, 'priority_changed', old.priority, new.priority);
    end if;
    if old.status != 'done' and new.status = 'done' then
      insert into task_events (task_id, user_id, event_type)
      values (new.id, new.user_id, 'completed');
      new.completed_at = now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_events_insert on tasks;
create trigger tasks_events_insert after insert on tasks for each row execute function log_task_events();
drop trigger if exists tasks_events_update on tasks;
create trigger tasks_events_update before update on tasks for each row execute function log_task_events();

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace view v_daily_stats as
select
  user_id,
  date_trunc('day', completed_at)::date as date,
  count(*) as tasks_completed,
  count(*) filter (where priority = 'P0') as p0_completed,
  count(*) filter (where priority = 'P1') as p1_completed,
  sum(actual_minutes) as minutes_worked
from tasks
where completed_at is not null
group by user_id, date_trunc('day', completed_at)::date;

create or replace view v_weekly_stats as
select
  user_id,
  date_trunc('week', completed_at)::date as week,
  count(*) as tasks_completed,
  count(distinct project) as projects_touched,
  sum(actual_minutes) as minutes_worked
from tasks
where completed_at is not null
group by user_id, date_trunc('week', completed_at)::date;

alter table profiles enable row level security;
alter table tasks enable row level security;
alter table daily_mit enable row level security;
alter table red_flags enable row level security;
alter table decisions enable row level security;
alter table retros enable row level security;
alter table pomodoro_sessions enable row level security;
alter table notes enable row level security;
alter table user_templates enable row level security;
alter table task_events enable row level security;

drop policy if exists users_own_profile on profiles;
create policy users_own_profile on profiles for all using (auth.uid() = id);
drop policy if exists users_own_tasks on tasks;
create policy users_own_tasks on tasks for all using (auth.uid() = user_id);
drop policy if exists users_own_mit on daily_mit;
create policy users_own_mit on daily_mit for all using (auth.uid() = user_id);
drop policy if exists users_own_flags on red_flags;
create policy users_own_flags on red_flags for all using (auth.uid() = user_id);
drop policy if exists users_own_decisions on decisions;
create policy users_own_decisions on decisions for all using (auth.uid() = user_id);
drop policy if exists users_own_retros on retros;
create policy users_own_retros on retros for all using (auth.uid() = user_id);
drop policy if exists users_own_pomodoro on pomodoro_sessions;
create policy users_own_pomodoro on pomodoro_sessions for all using (auth.uid() = user_id);
drop policy if exists users_own_notes on notes;
create policy users_own_notes on notes for all using (auth.uid() = user_id);
drop policy if exists users_own_templates on user_templates;
create policy users_own_templates on user_templates for all using (auth.uid() = user_id);
drop policy if exists users_own_events on task_events;
create policy users_own_events on task_events for all using (auth.uid() = user_id);
