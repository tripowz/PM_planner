# PM COCKPIT — Production промпт для Codex

Создать с нуля персональный PM-инструмент на Vite + React + TypeScript + Zustand + Tailwind + Supabase + Vercel. Проект для продакт-менеджера SmartBooking: управление задачами с обязательной структурой, Kanban с WIP-лимитом, главная задача дня, Pomodoro, журнал решений, трекер системных рисков, библиотека шаблонов, метрики продуктивности, ретроспективы, полноценный поиск, экспорт, аналитика.

**Это не MVP. Это production-версия, которой будут пользоваться каждый день.**

---

## 1. СТЕК И ЗАВИСИМОСТИ

### Основной стек
```
Vite 5.x + React 18 + TypeScript 5.x
Zustand 4.x (state)
React Router 6.x (роуты)
Tailwind CSS 3.x (стили)
Supabase 2.x (БД + Auth + Realtime)
```

### Библиотеки
```bash
npm create vite@latest pm-cockpit -- --template react-ts
cd pm-cockpit

# Основные
npm install zustand @supabase/supabase-js react-router-dom

# UI / UX
npm install lucide-react sonner @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tooltip @radix-ui/react-tabs @radix-ui/react-switch @radix-ui/react-popover @radix-ui/react-accordion

# Drag-n-drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Даты и форматирование
npm install date-fns

# Графики (для аналитики)
npm install recharts

# Markdown (для шаблонов и заметок)
npm install react-markdown remark-gfm

# Горячие клавиши
npm install react-hotkeys-hook

# Утилиты
npm install clsx tailwind-merge

# Dev dependencies
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

### Настройки Vite / TypeScript
- `tsconfig.json`: `"strict": true`, path alias `@/*` → `./src/*`
- `vite.config.ts`: resolve alias `@` → `/src`
- `tailwind.config.js`: dark mode class, custom цвета (см. раздел ДИЗАЙН)

---

## 2. SUPABASE — ПОЛНАЯ СХЕМА БД

### Создать проект
supabase.com → New project → `pm-cockpit` → регион Frankfurt → сохранить пароль.

### SQL миграция — выполнить в SQL Editor

```sql
-- ==========================================
-- ТАБЛИЦЫ
-- ==========================================

-- Профиль пользователя (расширение auth.users)
create table profiles (
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

-- Задачи
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  project text not null check (project in (
    'Angular PMS','site-generator','Mobile','Backend/API','Managed-service','Cross-product','Personal'
  )),
  type text not null check (type in (
    'feature','bug','research','ops','tech-debt','meeting','spike','docs'
  )),
  impact text not null check (impact in ('high','medium','low')),
  effort text not null check (effort in ('XS','S','M','L','XL')),
  priority text not null check (priority in ('P0','P1','P2','P3')),
  status text not null default 'inbox' check (status in (
    'inbox','backlog','week','progress','review','done','archived'
  )),
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

-- Главная задача дня (MIT — Most Important Task)
create table daily_mit (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  task_id uuid references tasks(id) on delete set null,
  completed boolean default false,
  created_at timestamptz default now(),
  primary key (user_id, date)
);

-- Системные риски / красные флаги
create table red_flags (
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

-- Журнал решений (мини-ADR)
create table decisions (
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

-- Ретроспективы
create table retros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('daily','weekly','monthly')),
  -- Daily: done/blocked/tomorrow
  -- Weekly: wins/stuck/lessons
  -- Monthly: achievements/challenges/focus_next
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

-- Pomodoro сессии (для аналитики)
create table pomodoro_sessions (
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

-- Заметки / scratchpad
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default '',
  content text default '',
  pinned boolean default false,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Шаблоны (пользовательские, кастомные)
create table user_templates (
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

-- События таймлайна (история изменений задачи)
create table task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'created','updated','status_changed','priority_changed','completed','commented','archived','restored'
  )),
  from_value text,
  to_value text,
  comment text,
  created_at timestamptz default now()
);

-- ==========================================
-- ИНДЕКСЫ
-- ==========================================

create index tasks_user_status_idx on tasks(user_id, status) where status != 'archived';
create index tasks_user_created_idx on tasks(user_id, created_at desc);
create index tasks_user_priority_idx on tasks(user_id, priority);
create index tasks_user_project_idx on tasks(user_id, project);
create index tasks_user_due_idx on tasks(user_id, due_date) where due_date is not null;
create index tasks_user_tags_idx on tasks using gin(tags);

create index decisions_user_date_idx on decisions(user_id, date desc);
create index decisions_user_tags_idx on decisions using gin(tags);

create index retros_user_type_date_idx on retros(user_id, type, date desc);

create index flags_user_status_idx on red_flags(user_id, status);
create index flags_user_severity_idx on red_flags(user_id, severity);

create index pomodoro_user_started_idx on pomodoro_sessions(user_id, started_at desc);

create index notes_user_updated_idx on notes(user_id, updated_at desc);
create index notes_user_tags_idx on notes using gin(tags);

create index events_task_created_idx on task_events(task_id, created_at desc);

-- ==========================================
-- FULL-TEXT SEARCH
-- ==========================================

create index tasks_search_idx on tasks using gin(
  to_tsvector('russian', title || ' ' || coalesce(description, '') || ' ' || coalesce(entry_point, ''))
);

create index decisions_search_idx on decisions using gin(
  to_tsvector('russian', title || ' ' || coalesce(context, '') || ' ' || coalesce(decision, ''))
);

create index notes_search_idx on notes using gin(
  to_tsvector('russian', coalesce(title, '') || ' ' || content)
);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Автообновление updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at before update on tasks for each row execute function update_updated_at();
create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger flags_updated_at before update on red_flags for each row execute function update_updated_at();
create trigger decisions_updated_at before update on decisions for each row execute function update_updated_at();
create trigger notes_updated_at before update on notes for each row execute function update_updated_at();
create trigger retros_updated_at before update on retros for each row execute function update_updated_at();
create trigger templates_updated_at before update on user_templates for each row execute function update_updated_at();

-- Автособытия при изменении задач
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
      -- Проставить completed_at
      new.completed_at = now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tasks_events_insert after insert on tasks for each row execute function log_task_events();
create trigger tasks_events_update before update on tasks for each row execute function log_task_events();

-- Автосоздание профиля при регистрации
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ==========================================
-- VIEWS для аналитики
-- ==========================================

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

-- ==========================================
-- RLS (Row Level Security)
-- ==========================================

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

-- Универсальные политики: каждый видит только своё
create policy "users_own_profile" on profiles for all using (auth.uid() = id);
create policy "users_own_tasks" on tasks for all using (auth.uid() = user_id);
create policy "users_own_mit" on daily_mit for all using (auth.uid() = user_id);
create policy "users_own_flags" on red_flags for all using (auth.uid() = user_id);
create policy "users_own_decisions" on decisions for all using (auth.uid() = user_id);
create policy "users_own_retros" on retros for all using (auth.uid() = user_id);
create policy "users_own_pomodoro" on pomodoro_sessions for all using (auth.uid() = user_id);
create policy "users_own_notes" on notes for all using (auth.uid() = user_id);
create policy "users_own_templates" on user_templates for all using (auth.uid() = user_id);
create policy "users_own_events" on task_events for all using (auth.uid() = user_id);
```

### Засев красных флагов при первом логине
Функция `seedRedFlagsIfEmpty()` вызывается после успешного логина. Если в `red_flags` пусто — вставить 10 флагов из SmartBooking. Код вставки в `src/lib/seed.ts`:

```typescript
export const SMARTBOOKING_RED_FLAGS = [
  { title: 'Backend booking engine отсутствует в workspace', description: 'Исходников нет, серверная логика не валидируется', severity: 'high', category: 'technical' },
  { title: 'MOCK_BOOKING fallback в ConfirmationPage (template-modern)', description: 'P1 — удалить перед прод-релизом', severity: 'high', category: 'technical' },
  { title: 'reservation.custom-tax-fees.add — в enum, не реализован', description: 'Индивидуальные налоги на бронь задуманы, но не доведены', severity: 'medium', category: 'product' },
  { title: 'Angular 9.1 — EOL, security патчи не идут', description: 'Стратегический технический долг', severity: 'high', category: 'security' },
  { title: 'React Native 0.63 — очень старая версия', description: 'Mobile app нужен upgrade path', severity: 'medium', category: 'technical' },
  { title: 'SEO/Domain/Payment — managed-service, слабый UX', description: 'Клиенты отправляют заявку, ждут команду. Зона автоматизации', severity: 'medium', category: 'product' },
  { title: '4 типа токенов (app/user/site/guest) — сложность session management', description: '', severity: 'medium', category: 'technical' },
  { title: 'Два Nx workspace для сайтов — один прод, второй старый', description: 'Почистить', severity: 'low', category: 'process' },
  { title: 'Mock-админка в D:\\Smart\\src может путаться с прод-кодом', description: '', severity: 'low', category: 'process' },
  { title: 'Темы (ocean/garden/...) ≠ шаблоны — terminology gap', description: 'Выровнять с маркетингом', severity: 'low', category: 'product' },
]
```

---

## 3. СТРУКТУРА ПРОЕКТА

```
src/
├── main.tsx
├── App.tsx                          # роутер + провайдеры
├── index.css                        # Tailwind + глобальные стили
│
├── lib/
│   ├── supabase.ts                  # клиент
│   ├── types.ts                     # все TypeScript типы БД
│   ├── constants.ts                 # PROJECTS, TYPES, PRIORITY, WIP_LIMIT, цвета
│   ├── templates.ts                 # встроенные шаблоны ТЗ/тест/баг/ADR/конкурент
│   ├── seed.ts                      # сид красных флагов
│   ├── utils.ts                     # cn(), uid(), форматтеры дат, скор-функции
│   ├── keyboard.ts                  # глобальные хоткеи
│   └── analytics.ts                 # агрегации для аналитики
│
├── stores/
│   ├── authStore.ts                 # currentUser, profile, loading, authReady
│   ├── tasksStore.ts                # tasks, CRUD, move, archive, bulk ops
│   ├── mitStore.ts                  # MIT на сегодня
│   ├── flagsStore.ts                # красные флаги
│   ├── decisionsStore.ts            # журнал решений
│   ├── retrosStore.ts               # ретроспективы
│   ├── notesStore.ts                # заметки
│   ├── pomodoroStore.ts             # таймер + сессии (в памяти + persist в БД)
│   ├── templatesStore.ts            # пользовательские шаблоны
│   ├── uiStore.ts                   # модалки, сайдбары, фильтры, поиск
│   └── analyticsStore.ts            # данные для графиков
│
├── pages/
│   ├── LoginPage.tsx
│   ├── TodayPage.tsx                # MIT + Pomodoro + сегодняшние ретро
│   ├── BoardPage.tsx                # Kanban с @dnd-kit
│   ├── InboxPage.tsx                # приоритизация входящих
│   ├── TaskDetailPage.tsx           # /task/:id — полная карточка
│   ├── BacklogPage.tsx              # весь список с фильтрами
│   ├── CalendarPage.tsx             # календарь с due_date
│   ├── FlagsPage.tsx                # красные флаги
│   ├── DecisionsPage.tsx            # журнал решений
│   ├── DecisionDetailPage.tsx       # /decisions/:id
│   ├── TemplatesPage.tsx            # библиотека шаблонов
│   ├── NotesPage.tsx                # заметки
│   ├── RetrosPage.tsx               # ретро (день/неделя/месяц)
│   ├── AnalyticsPage.tsx            # метрики и графики
│   └── SettingsPage.tsx             # профиль, настройки, экспорт, опасная зона
│
├── components/
│   ├── layout/
│   │   ├── Layout.tsx               # обёртка + топ-бар
│   │   ├── TopBar.tsx               # навигация, поиск, быстрое создание
│   │   ├── CommandPalette.tsx       # Cmd+K — быстрые действия
│   │   └── ProtectedRoute.tsx
│   │
│   ├── tasks/
│   │   ├── TaskFormModal.tsx        # создание/редактирование
│   │   ├── TaskCard.tsx             # карточка на доске
│   │   ├── TaskRow.tsx              # строка в списке
│   │   ├── TaskFilters.tsx          # фильтр-панель
│   │   ├── TaskBulkActions.tsx      # bulk изменение статуса/приоритета
│   │   ├── TaskTimeline.tsx         # история событий
│   │   ├── AcceptanceCriteriaEditor.tsx
│   │   └── DependenciesEditor.tsx
│   │
│   ├── pomodoro/
│   │   ├── PomodoroTimer.tsx        # основной таймер
│   │   ├── PomodoroFloating.tsx     # мини-виджет в углу
│   │   └── PomodoroStats.tsx        # статистика циклов
│   │
│   ├── flags/
│   │   ├── FlagCard.tsx
│   │   └── FlagFormModal.tsx
│   │
│   ├── decisions/
│   │   ├── DecisionCard.tsx
│   │   └── DecisionFormModal.tsx
│   │
│   ├── notes/
│   │   ├── NoteCard.tsx
│   │   └── NoteEditor.tsx           # markdown editor
│   │
│   ├── retros/
│   │   ├── DailyRetroCard.tsx
│   │   ├── WeeklyRetroCard.tsx
│   │   └── MoodEnergyPicker.tsx
│   │
│   ├── templates/
│   │   ├── TemplateViewer.tsx
│   │   └── TemplateFormModal.tsx
│   │
│   ├── analytics/
│   │   ├── CompletionChart.tsx      # recharts — завершено по дням
│   │   ├── ProjectDistribution.tsx  # пирог
│   │   ├── FocusTimeChart.tsx       # pomodoro минуты
│   │   └── VelocityChart.tsx        # скорость закрытия
│   │
│   └── ui/
│       ├── Button.tsx               # variant: primary, ghost, danger
│       ├── Input.tsx
│       ├── Textarea.tsx
│       ├── Select.tsx               # Radix Select
│       ├── Dialog.tsx               # Radix Dialog
│       ├── DropdownMenu.tsx         # Radix
│       ├── Tooltip.tsx              # Radix
│       ├── Tabs.tsx                 # Radix
│       ├── Switch.tsx               # Radix
│       ├── Badge.tsx                # приоритет, impact, статус
│       ├── Empty.tsx                # состояние "пусто"
│       ├── Loader.tsx
│       ├── ConfirmDialog.tsx        # переиспользуемое подтверждение
│       ├── Toast.tsx                # через sonner
│       ├── SearchBar.tsx            # debounced search
│       └── DateRangePicker.tsx
│
└── hooks/
    ├── useAuth.ts
    ├── useDebounce.ts
    ├── useHotkey.ts
    ├── useSearch.ts                 # full-text search по всем сущностям
    └── useLocalStorage.ts
```

---

## 4. TYPESCRIPT ТИПЫ (src/lib/types.ts)

```typescript
export type Project = 'Angular PMS' | 'site-generator' | 'Mobile' | 'Backend/API' | 'Managed-service' | 'Cross-product' | 'Personal'

export type TaskType = 'feature' | 'bug' | 'research' | 'ops' | 'tech-debt' | 'meeting' | 'spike' | 'docs'

export type Impact = 'high' | 'medium' | 'low'
export type Effort = 'XS' | 'S' | 'M' | 'L' | 'XL'
export type Priority = 'P0' | 'P1' | 'P2' | 'P3'

export type TaskStatus = 'inbox' | 'backlog' | 'week' | 'progress' | 'review' | 'done' | 'archived'

export type FlagSeverity = 'critical' | 'high' | 'medium' | 'low'
export type FlagCategory = 'technical' | 'product' | 'process' | 'business' | 'security'
export type FlagStatus = 'open' | 'in_progress' | 'mitigated' | 'resolved' | 'accepted'

export type DecisionStatus = 'proposed' | 'accepted' | 'rejected' | 'superseded' | 'deprecated'

export type RetroType = 'daily' | 'weekly' | 'monthly'

export type PomodoroType = 'focus' | 'short_break' | 'long_break'

export type TaskEventType = 'created' | 'updated' | 'status_changed' | 'priority_changed' | 'completed' | 'commented' | 'archived' | 'restored'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  timezone: string
  work_hours_start: number
  work_hours_end: number
  pomodoro_focus_min: number
  pomodoro_break_min: number
  pomodoro_long_break_min: number
  theme: 'dark' | 'light'
  accent_color: string
  created_at: string
  updated_at: string
}

export interface AcceptanceCriterion {
  id: string
  text: string
  done: boolean
}

export interface TaskDependency {
  id: string
  task_id: string
  type: 'blocks' | 'blocked_by' | 'relates_to'
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string
  project: Project
  type: TaskType
  impact: Impact
  effort: Effort
  priority: Priority
  status: TaskStatus
  entry_point: string
  acceptance_criteria: AcceptanceCriterion[]
  dependencies: TaskDependency[]
  tags: string[]
  due_date: string | null
  estimated_minutes: number | null
  actual_minutes: number
  pomodoro_sessions: number
  completed_at: string | null
  archived_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface DailyMit {
  user_id: string
  date: string
  task_id: string | null
  completed: boolean
  created_at: string
}

export interface RedFlag {
  id: string
  user_id: string
  title: string
  description: string
  severity: FlagSeverity
  category: FlagCategory
  status: FlagStatus
  related_task_id: string | null
  owner: string
  identified_at: string
  target_resolution_date: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface Decision {
  id: string
  user_id: string
  date: string
  title: string
  status: DecisionStatus
  context: string
  decision: string
  alternatives: string
  consequences: string
  tags: string[]
  related_task_id: string | null
  superseded_by: string | null
  created_at: string
  updated_at: string
}

export interface Retro {
  id: string
  user_id: string
  date: string
  type: RetroType
  field1: string
  field2: string
  field3: string
  mood: number | null
  energy: number | null
  notes: string
  created_at: string
  updated_at: string
}

export interface PomodoroSession {
  id: string
  user_id: string
  task_id: string | null
  started_at: string
  completed_at: string | null
  duration_seconds: number
  type: PomodoroType
  interrupted: boolean
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  pinned: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export interface UserTemplate {
  id: string
  user_id: string
  name: string
  description: string
  content: string
  category: string
  usage_count: number
  created_at: string
  updated_at: string
}

export interface TaskEvent {
  id: string
  task_id: string
  user_id: string
  event_type: TaskEventType
  from_value: string | null
  to_value: string | null
  comment: string | null
  created_at: string
}
```

---

## 5. КОНСТАНТЫ (src/lib/constants.ts)

```typescript
import { Project, TaskType, Impact, Effort, Priority, TaskStatus, FlagSeverity, FlagCategory } from './types'

export const WIP_LIMIT = 3
export const POMODORO_CYCLES_BEFORE_LONG_BREAK = 4
export const SEARCH_DEBOUNCE_MS = 250
export const AUTOSAVE_DEBOUNCE_MS = 1000

export const PROJECTS: Project[] = [
  'Angular PMS',
  'site-generator',
  'Mobile',
  'Backend/API',
  'Managed-service',
  'Cross-product',
  'Personal'
]

export const TASK_TYPES: TaskType[] = [
  'feature', 'bug', 'research', 'ops', 'tech-debt', 'meeting', 'spike', 'docs'
]

export const IMPACTS: Impact[] = ['high', 'medium', 'low']
export const EFFORTS: Effort[] = ['XS', 'S', 'M', 'L', 'XL']
export const PRIORITIES: Priority[] = ['P0', 'P1', 'P2', 'P3']

export const STATUSES: TaskStatus[] = [
  'inbox', 'backlog', 'week', 'progress', 'review', 'done', 'archived'
]

// Для скоринга RICE-подобной формулы
export const IMPACT_SCORE: Record<Impact, number> = { high: 3, medium: 2, low: 1 }
export const EFFORT_SCORE: Record<Effort, number> = { XS: 0.5, S: 1, M: 2, L: 3, XL: 5 }
export const PRIORITY_SCORE: Record<Priority, number> = { P0: 4, P1: 3, P2: 2, P3: 1 }

// Цвета
export const PRIORITY_COLORS: Record<Priority, string> = {
  P0: '#f0542d',
  P1: '#e8b74a',
  P2: '#8a8a87',
  P3: '#4a4a47'
}

export const SEVERITY_COLORS: Record<FlagSeverity, string> = {
  critical: '#dc2626',
  high: '#f0542d',
  medium: '#e8b74a',
  low: '#4a8a4e'
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'Инбокс',
  backlog: 'Бэклог',
  week: 'Неделя',
  progress: 'В работе',
  review: 'Ревью',
  done: 'Готово',
  archived: 'Архив'
}

export const CATEGORY_LABELS: Record<FlagCategory, string> = {
  technical: 'Технический',
  product: 'Продуктовый',
  process: 'Процессный',
  business: 'Бизнес',
  security: 'Безопасность'
}

// Горячие клавиши
export const HOTKEYS = {
  NEW_TASK: 'c',
  SEARCH: 'mod+k',
  GO_TODAY: 'g t',
  GO_BOARD: 'g b',
  GO_INBOX: 'g i',
  GO_BACKLOG: 'g l',
  GO_NOTES: 'g n',
  GO_DECISIONS: 'g d',
  GO_FLAGS: 'g f',
  GO_ANALYTICS: 'g a',
  TOGGLE_POMODORO: 'p',
  ESCAPE: 'escape'
}
```

---

## 6. ШАБЛОНЫ (src/lib/templates.ts)

Встроенные шаблоны — 5 штук. Полный текст каждого взять из артефакта `pm-cockpit.jsx` (объект `TEMPLATES` в том файле). Структура:

```typescript
export interface BuiltInTemplate {
  key: string
  name: string
  description: string
  category: 'task' | 'decision' | 'doc'
  content: string
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  { key: 'tz', name: 'ТЗ / User Story', description: 'Полноценная user story с техническими деталями, edge cases, UZ-спецификой', category: 'task', content: `# [Модуль] Название\n\n## Контекст\n...` },
  { key: 'test', name: 'Тест-план', description: 'С hospitality + UZ + payment + permission кейсами', category: 'task', content: `...` },
  { key: 'bug', name: 'Баг-репорт', description: 'Структурированный с подозрениями и воспроизводимостью', category: 'task', content: `...` },
  { key: 'competitor', name: 'Анализ конкурента', description: 'Exely / Bnovo / Cloudbeds сравнение', category: 'doc', content: `...` },
  { key: 'adr', name: 'ADR', description: 'Architecture Decision Record', category: 'decision', content: `...` }
]
```

**Полный content для каждого шаблона** — взять 1-в-1 из раздела `TEMPLATES` артефакта `pm-cockpit.jsx` в этом чате. Не сокращать, не перефразировать.

---

## 7. КЛЮЧЕВЫЕ СТОРЫ — ЛОГИКА

### authStore (src/stores/authStore.ts)

```typescript
interface AuthState {
  currentUser: User | null
  profile: Profile | null
  authReady: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  loadProfile: () => Promise<void>
}
```

**Критично при инициализации:**
```typescript
// На старте приложения (в main.tsx или App.tsx)
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    useAuthStore.setState({ currentUser: session.user })
    useAuthStore.getState().loadProfile()
  }
  useAuthStore.setState({ authReady: true })
})

// Подписка на события — ИГНОРИРОВАТЬ INITIAL_SESSION и TOKEN_REFRESHED
// Иначе при смене вкладки приложение будет перезагружаться
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ currentUser: null, profile: null })
    window.location.href = '/login'
  }
  if (event === 'SIGNED_IN' && session?.user) {
    useAuthStore.setState({ currentUser: session.user })
    useAuthStore.getState().loadProfile()
  }
})
```

### tasksStore (src/stores/tasksStore.ts)

```typescript
interface TasksState {
  tasks: Task[]
  loading: boolean
  filters: TaskFilters
  
  fetch: () => Promise<void>
  create: (data: Partial<Task>) => Promise<Task | null>
  update: (id: string, updates: Partial<Task>) => Promise<void>
  delete: (id: string) => Promise<void>
  archive: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
  
  move: (id: string, newStatus: TaskStatus) => Promise<void>
  reorder: (tasksInStatus: Task[], status: TaskStatus) => Promise<void>
  
  toggleAcceptanceCriterion: (taskId: string, critId: string) => Promise<void>
  addAcceptanceCriterion: (taskId: string, text: string) => Promise<void>
  removeAcceptanceCriterion: (taskId: string, critId: string) => Promise<void>
  
  bulkUpdate: (ids: string[], updates: Partial<Task>) => Promise<void>
  bulkDelete: (ids: string[]) => Promise<void>
  
  setFilters: (filters: Partial<TaskFilters>) => void
  clearFilters: () => void
}

interface TaskFilters {
  search: string
  projects: Project[]
  types: TaskType[]
  priorities: Priority[]
  statuses: TaskStatus[]
  tags: string[]
  dueDateRange: [string | null, string | null]
  showArchived: boolean
}
```

**Ключевые реализации:**

```typescript
// Оптимистичный move с WIP-лимитом
move: async (id, newStatus) => {
  const { tasks } = get()
  const task = tasks.find(t => t.id === id)
  if (!task) return
  
  if (newStatus === 'progress' && task.status !== 'progress') {
    const currentProgress = tasks.filter(t => t.status === 'progress').length
    if (currentProgress >= WIP_LIMIT) {
      toast.error(`WIP-лимит ${WIP_LIMIT}. Сначала закройте задачу в работе.`)
      return
    }
  }
  
  const updates: Partial<Task> = { status: newStatus }
  if (newStatus === 'done' && !task.completed_at) {
    updates.completed_at = new Date().toISOString()
  }
  
  // Оптимистично
  const prev = tasks
  set({ tasks: tasks.map(t => t.id === id ? { ...t, ...updates } : t) })
  
  const { error } = await supabase.from('tasks').update(updates).eq('id', id)
  if (error) {
    set({ tasks: prev })
    toast.error('Не удалось переместить задачу')
  }
}

// RICE-подобный скор для сортировки Инбокса
export function scoreTask(t: Task): number {
  const impact = IMPACT_SCORE[t.impact]
  const effort = EFFORT_SCORE[t.effort]
  const priority = PRIORITY_SCORE[t.priority]
  return (impact / effort) * 10 + priority * 2
}
```

### pomodoroStore (src/stores/pomodoroStore.ts)

```typescript
interface PomodoroState {
  mode: PomodoroType
  secondsLeft: number
  running: boolean
  currentTaskId: string | null
  currentSessionId: string | null
  cyclesCompleted: number  // за сегодня
  startedAt: string | null
  
  start: (taskId?: string) => Promise<void>
  pause: () => void
  resume: () => void
  stop: (interrupted?: boolean) => Promise<void>
  skip: () => Promise<void>
  tick: () => void  // вызывается из setInterval
  reset: () => void
  
  setMode: (mode: PomodoroType) => void
}
```

**Важно:**
- Таймер работает через `setInterval` в `main.tsx` на уровне приложения (не в компоненте), чтобы не останавливался при переходе между страницами.
- При окончании focus-сессии: автоматически create запись в `pomodoro_sessions`, увеличить `actual_minutes` и `pomodoro_sessions` в задаче, уведомление через `Notification API` (запросить permission), переключиться на break.
- Каждые 4 цикла — long_break вместо short_break.
- При закрытии вкладки через `beforeunload` сохранять прерванную сессию с `interrupted: true`.

### uiStore (src/stores/uiStore.ts)

```typescript
interface UIState {
  // Модалки
  taskFormOpen: boolean
  editingTaskId: string | null
  commandPaletteOpen: boolean
  flagFormOpen: boolean
  decisionFormOpen: boolean
  confirmDialog: { open: boolean; title: string; message: string; onConfirm: () => void } | null
  
  // Сайдбары и плавающие виджеты
  pomodoroFloating: boolean  // мини-таймер в углу
  taskDetailSidebarId: string | null
  
  // Глобальные флаги
  sidebarCollapsed: boolean
  
  openTaskForm: (taskId?: string) => void
  closeTaskForm: () => void
  toggleCommandPalette: () => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
  // ...
}
```

---

## 8. СТРАНИЦЫ — ДЕТАЛЬНЫЕ ТРЕБОВАНИЯ

### 8.1 LoginPage

Двухколоночный layout. Слева — брендинг (крупный serif «Кокпит.», цитата про фокус). Справа — форма с табами «Войти» / «Регистрация».

- Войти: email + пароль. Ошибка под полем. Кнопка «Забыли пароль?» → send reset link.
- Регистрация: display_name + email + пароль + подтверждение. Валидация: пароль >= 8 символов, email формат, пароли совпадают.
- Magic link опционально — кнопка «Войти по ссылке».
- Disclaimer внизу: «Это персональный инструмент. Ваши данные видны только вам.»

### 8.2 TodayPage — главный экран

Layout: grid `1fr 340px`.

**Основная колонка:**

1. **MIT блок** (верхняя часть, ~40% экрана):
   - Если MIT не выбран: большой serif-текст "Выберите одну задачу дня" + скроллируемый список задач со статусом `week` или `progress`, отсортированных по `scoreTask()` убывающе. Клик → `setMit(taskId)`.
   - Если MIT выбран: карточка-баннер: приоритет-бейдж, проект-чип, тип-чип, крупный serif title (36-48px), description (если есть) в 14px прозрачностью 0.7. Acceptance criteria inline с чекбоксами. Кнопки: «Выполнено» (→ status=done, completed_at=now, completed=true в daily_mit), «В процесс» (если status=week → status=progress), «Сменить фокус».

2. **Pomodoro таймер** (под MIT) — см. раздел 10.

3. **Сегодня сделано** — если есть `tasks` с `completed_at` сегодня: список строк с перечёркнутым title, бейджем проекта, временем завершения.

4. **EOD retro prompt** — появляется после 17:00 (по `profile.timezone`). Карточка с 3 textarea: «Что сделал», «Что заблокировало», «Что завтра первым делом». + опциональные mood/energy (1-5 звёзд). Кнопка Сохранить → upsert в `retros` с type=daily и датой сегодня. Если уже сохранено сегодня — показать summary с кнопкой «Редактировать».

**Правая колонка (sticky):**

1. **DayStats** — 4 метрики в 2x2 grid: Инбокс / Неделя / В работе (красный если >= WIP_LIMIT) / За неделю.
2. **Focus time** — количество минут фокуса сегодня (из pomodoro_sessions). Круговой индикатор цели (по умолчанию 120 минут).
3. **Мини план недели** — первые 6 задач из `status=week` + `status=progress`, отсортированы по приоритету. Клик → открыть задачу.
4. **Нуджи дня**:
   - Понедельник: «Спланируйте неделю» + кнопка → BacklogPage с фильтром `status=inbox|backlog`.
   - Пятница: «Сделайте недельное ретро» + кнопка → RetrosPage со скроллом к форме.
   - Если есть P0 задачи не в progress: «У вас P0 задача вне работы» + ссылка.
   - Если WIP = 3 уже 3+ дня подряд: «Задачи застряли, разберите блокеры».

### 8.3 BoardPage — Kanban

5 колонок: Бэклог / Неделя / В работе / Ревью / Готово.

- **Drag-n-drop через @dnd-kit.** При drop вызывать `move()`. В одной колонке — `reorder()` (меняет `position`).
- **Карточка:** бейдж приоритета слева (вертикальная полоса цветом), title (2 строки max, ellipsis), мета: project chip, impact·effort, due_date если есть (красный если просрочено). Acceptance criteria progress (например 2/5 done).
- **Заголовок колонки:** название, счётчик, прогресс-бар времени для «В работе» (общие actual_minutes / estimated_minutes), красный бордер колонки «В работе» если WIP превышен.
- **Фильтры над доской:** chip-селекторы проектов, типов, тегов, поиск. Кнопка «Очистить». Сохранить в uiStore.
- **Клик на карточку** → открыть TaskFormModal в режиме редактирования.
- **Кнопка «+»** в каждой колонке → открыть форму с предзаполненным status.

### 8.4 InboxPage

- Компактный список задач status=inbox, отсортирован по `scoreTask()` убывающе.
- Каждая строка: приоритет | title + метаданные (project, type, impact·effort, created_at) | быстрые кнопки «→ Неделя», «→ Бэклог», «✓ Done» | раскрытие (description, acceptance criteria, entry_point).
- Сверху: счётчик «В инбоксе X задач». Если >20 — warning «Инбокс переполнен, пора разобрать».
- Bulk selection через чекбоксы — выделить несколько, массово переместить в «Неделя»/«Бэклог»/архив.

### 8.5 TaskDetailPage (/task/:id)

Полноценная карточка, не модалка. Layout 2 колонки: основа + сайдбар.

**Основа:**
1. Header: back button, title (inline editable, Enter сохраняет), badges (priority, status — селекты, меняют задачу).
2. Description (markdown editor, preview toggle).
3. **Acceptance Criteria** — список чекбоксов, добавление новых, удаление, перетаскивание для сортировки.
4. **Dependencies** — список связанных задач (blocks / blocked_by / relates_to), добавить через поиск.
5. **Timeline** — события задачи из `task_events`, хронологически.

**Сайдбар:**
- Поля: project, type, impact, effort, due_date, estimated_minutes, actual_minutes (авто, readonly), tags (multi-input), entry_point.
- **Pomodoro на эту задачу** — кнопка «Начать фокус» (запустит pomodoro с `currentTaskId = this.id`).
- Метрики: создана, обновлена, время в работе, кол-во pomodoro сессий.
- Кнопки: Архивировать, Удалить, Копировать ссылку.

### 8.6 BacklogPage

Большая таблица всех задач (inbox + backlog + week + progress + review, не done/archived по умолчанию).

- Колонки: ☑ | Title | Project | Type | Priority | Impact | Effort | Status | Due | Created.
- Сортировка по любой колонке.
- Фильтры — левый сайдбар:
  - Поиск (title, description, entry_point).
  - Checkbox-группы: projects, types, priorities, statuses.
  - Date range — created_at, due_date, completed_at.
  - Tags (autocomplete).
  - Toggle «Показать архив».
- Bulk actions bar внизу при выделении: Delete, Archive, Change status, Change priority, Add tags.
- Кнопка «Экспорт CSV» с учётом текущих фильтров.

### 8.7 CalendarPage

Месячный календарь (grid 7x5-6). В ячейке: задачи с `due_date` = эта дата, цветные точки по проектам.

- Клик на день → список задач этого дня, возможность создать с pre-filled due_date.
- Перетаскивание задачи между днями → обновить due_date.
- Переключатель Месяц / Неделя / День.
- Сегодня подсвечен. Выходные затенены.

### 8.8 FlagsPage

4 секции по статусам: Открытые / В работе / Митигированы / Закрытые (+ Accepted).

- Фильтры по severity и category.
- Карточка флага: severity badge (цвет), category chip, title, description, owner, дата обнаружения, target resolution date (красный если просрочено), related_task_id → ссылка.
- Форма: title, description (markdown), severity, category, target_resolution_date, owner, related_task.
- Таймлайн изменений статуса.
- Суммарная плашка: «Критических: X, с просроченным deadline: Y».

### 8.9 DecisionsPage / DecisionDetailPage

**Список:**
- Timeline-view: decisions в хронологическом порядке (обратно).
- Каждая карточка: date, status badge, title, фрагмент context (2 строки), tags.
- Фильтры: status, tags, date range.
- Поиск full-text.

**Детальная:**
- 4 блока по MADR-структуре: Context / Decision / Alternatives / Consequences. Все markdown.
- Если есть `superseded_by` — ссылка «Заменено решением X».
- Related task ссылка.
- Edit inline всех полей.

### 8.10 NotesPage

Двухколоночный layout. Слева — список заметок (pinned сверху), справа — markdown editor.

- Новая заметка — Cmd+N.
- Автосохранение через 1 сек после последнего ввода.
- Pin/unpin, tags, поиск.
- Markdown editor: preview toggle, поддержка кода с подсветкой, списков, таблиц (через react-markdown + remark-gfm).

### 8.11 RetrosPage

Табы: Ежедневные / Еженедельные / Ежемесячные.

- Для каждого типа — список существующих (обратный хронологический) + форма создания новой.
- Daily: done / blocked / tomorrow + mood + energy.
- Weekly: wins / stuck / lessons + mood + energy. Форма на пятницу подсвечена.
- Monthly: achievements / challenges / focus_next + mood + energy. Форма появляется в последний рабочий день месяца.
- Mood/energy — picker из 5 эмоций/уровней.
- При открытии weekly/monthly — автогенерация "Summary" из закрытых задач за период: количество, распределение по проектам, топ-3 по времени.

### 8.12 AnalyticsPage

Дашборд из графиков (recharts):

1. **Completion trend** (line chart) — закрыто задач по дням за последние 30/60/90 дней.
2. **Project distribution** (pie chart) — закрытые задачи по проектам.
3. **Focus time** (bar chart) — минуты pomodoro по дням.
4. **Priority mix** — P0/P1/P2/P3 по неделям (stacked bar).
5. **Velocity** — среднее количество закрытых задач в неделю, trend.
6. **Top tags** — самые частые теги.
7. **Cycle time** — среднее время от created_at до completed_at по проектам.

Фильтры: период (7/30/90/365 дней, кастомный range), проекты.

Экспорт PNG каждого графика.

### 8.13 SettingsPage

Табы:

1. **Профиль:** display_name, email (readonly), timezone (select), avatar (опционально).
2. **Рабочие часы:** start/end hour (для нуджей).
3. **Pomodoro:** focus_min (default 25), break_min (5), long_break_min (15), cycles_before_long (4).
4. **Внешний вид:** theme (dark/light), accent color (color picker).
5. **Хоткеи:** список всех хоткеев (readonly).
6. **Данные:**
   - Экспорт всех данных в JSON.
   - Экспорт задач в CSV.
   - Импорт из JSON.
7. **Опасная зона:**
   - Удалить все архивные задачи.
   - Удалить все данные (с 2-шаговым подтверждением).
   - Удалить аккаунт.

---

## 9. COMMAND PALETTE (Cmd+K)

Глобальный fuzzy-поиск + команды.

- Открывается Cmd+K / Ctrl+K.
- Поиск по: tasks, decisions, notes, red_flags (full-text через Supabase ilike или `to_tsquery`).
- Команды: Создать задачу (C), Новая заметка, Новое решение, Начать pomodoro, Перейти на Today/Board/Inbox/..., Toggle theme, Sign out.
- Результаты сгруппированы: Команды / Задачи / Решения / Заметки / Флаги.
- Стрелки ↑↓ — навигация, Enter — открыть, Esc — закрыть.

---

## 10. POMODORO — ДЕТАЛЬНО

**Компоненты:**
- `PomodoroTimer.tsx` — основной таймер на TodayPage и TaskDetailPage. Круговой SVG прогресс, крупная цифра, кнопки Старт / Пауза / Стоп / Пропустить.
- `PomodoroFloating.tsx` — мини-виджет в углу экрана, виден на всех страницах когда таймер активен. Клик разворачивает.
- `PomodoroStats.tsx` — текущая серия, циклов сегодня, общее время фокуса сегодня.

**Логика:**
1. `start(taskId?)`:
   - Создать `pomodoro_sessions` запись с started_at=now, duration_seconds=0, type='focus'.
   - Сохранить id в `currentSessionId`.
   - Запустить интервал.
2. `tick()` каждую секунду:
   - `secondsLeft -= 1`.
   - Если <=0: остановить, вызвать `onComplete()`.
3. `onComplete()`:
   - Обновить `pomodoro_sessions`: completed_at=now, duration_seconds=focus_min*60, interrupted=false.
   - Если type=focus: инкремент `pomodoro_sessions` и `actual_minutes` на связанной задаче. Увеличить `cyclesCompleted`. Если cyclesCompleted % 4 === 0 → переключить на long_break, иначе short_break.
   - Если type=break: переключить обратно на focus.
   - Нотификация через `Notification API` (спросить разрешение при первом запуске).
   - Звуковой сигнал (опционально, через Audio).
4. `stop(interrupted=true)`:
   - Обновить текущую сессию: completed_at=now, duration_seconds=(elapsed), interrupted=true.
   - Сбросить state.
5. При закрытии вкладки (`beforeunload`) — sync stop с interrupted=true.

**Floating widget:**
- Показывается когда `running=true`.
- Фиксирован в bottom-right, 120x60px.
- Показывает `fmtTime(secondsLeft)` + pulse-анимация border.
- Клик → скролл к основному таймеру или переход на TodayPage.

---

## 11. ДИЗАЙН

### Цветовая палитра (CSS variables)

```css
/* dark theme (default) */
:root[data-theme='dark'] {
  --bg-primary: #0b0b0c;
  --bg-secondary: #0f0f11;
  --bg-tertiary: #131316;
  --bg-hover: #1a1a1d;
  --border-primary: #1f1f22;
  --border-secondary: #2a2a2d;
  --border-accent: #f0542d;
  --text-primary: #e8e6e1;
  --text-secondary: #c8c6c1;
  --text-tertiary: #8a8a87;
  --text-muted: #6b6a66;
  --accent: #f0542d;
  --accent-hover: #d84620;
  --success: #4a8a4e;
  --warning: #e8b74a;
  --danger: #dc2626;
  --info: #4a90e2;
}

/* light theme */
:root[data-theme='light'] {
  --bg-primary: #fafaf7;
  --bg-secondary: #f5f4ef;
  --bg-tertiary: #ffffff;
  --bg-hover: #eeede8;
  --border-primary: #e0ddd6;
  --border-secondary: #d0ccc4;
  --border-accent: #f0542d;
  --text-primary: #1a1a1d;
  --text-secondary: #3a3a3d;
  --text-tertiary: #6b6a66;
  --text-muted: #8a8a87;
  --accent: #f0542d;
  --accent-hover: #d84620;
  --success: #4a8a4e;
  --warning: #c89420;
  --danger: #dc2626;
  --info: #4a90e2;
}
```

### Шрифты (index.html)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- **Display / заголовки:** Fraunces, letter-spacing -0.03em, жирность 600-800.
- **Body / UI:** JetBrains Mono, 13px, жирность 400-500.
- **Inline code:** JetBrains Mono, 12px, background `var(--bg-hover)`, padding 2px 5px.

### Типографика

```css
.text-display { font-family: 'Fraunces', serif; font-weight: 700; letter-spacing: -0.03em; }
.text-h1 { font-size: 32px; line-height: 1.2; }
.text-h2 { font-size: 24px; line-height: 1.3; }
.text-h3 { font-size: 18px; line-height: 1.4; }
.text-body { font-size: 13px; line-height: 1.6; }
.text-small { font-size: 11px; line-height: 1.5; }
.text-tiny { font-size: 10px; line-height: 1.4; letter-spacing: 0.05em; text-transform: uppercase; }
```

### Компоненты

- **Button primary:** bg `var(--accent)`, text `var(--bg-primary)`, padding 8px 14px, font-weight 600, border-radius 3px, hover → `var(--accent-hover)`.
- **Button ghost:** transparent, border `var(--border-secondary)`, hover border `var(--border-accent)`.
- **Button danger:** border `var(--danger)`, text `var(--danger)`, hover bg `var(--danger)`, text white.
- **Input:** bg `var(--bg-primary)`, border `var(--border-secondary)`, padding 8px 10px, border-radius 3px, focus border `var(--border-accent)`.
- **Card:** bg `var(--bg-tertiary)`, border 1px solid `var(--border-primary)`, border-radius 4px, padding 14-20px.
- **Badge priority:** font-mono, uppercase, 10-11px, цветной бордер и текст по `PRIORITY_COLORS`, padding 2px 6px, border-radius 2px.
- **Chip project/tag:** 10px, bg `var(--bg-hover)`, padding 2px 6px, border-radius 2px.

### Иконки

Только `lucide-react`. strokeWidth 1.5, size 12-16 для UI, 18-24 для больших акцентов. Цвет через inherit.

### Анимации

Минимально:
- Transitions на hover (150ms).
- Fade-in модалок (200ms).
- Круговой прогресс Pomodoro — плавный transition на strokeDashoffset.
- Stagger reveal на LoginPage при загрузке (subtle).

**Никаких бессмысленных анимаций.** Никаких bounce / confetti / лишних эффектов. Это рабочий инструмент.

---

## 12. КРИТИЧЕСКИЕ ПРАВИЛА РЕАЛИЗАЦИИ

### Оптимистичные обновления — ВСЕГДА

Любая mutation (create/update/delete/move) в store:

```typescript
const prev = get().items
set({ items: optimisticallyUpdated })  // 1. UI первым
const { error } = await supabase.from('...').update(...)  // 2. Сеть
if (error) {
  set({ items: prev })  // 3. Откат при ошибке
  toast.error('Не удалось сохранить')
}
```

**Без исключений.** Никаких `await` перед `set()`.

### Форма задачи — все поля обязательны

В `TaskFormModal`: `submit` кнопка disabled пока не заполнены `title`, `project`, `type`, `impact`, `effort`, `priority`. Показывать красный `*` у обязательных. Визуальный feedback при попытке сабмита с незаполненными (красная обводка + toast).

### WIP-лимит — жёсткий

Проверяется при `move` в статус `progress` и при прямом изменении `status`. При превышении — `toast.error()` и отмена действия. Не делать soft-warning, только hard-stop.

### Защита MIT

- MIT сбрасывается автоматически при смене даты (сравнение `daily_mit.date` с сегодня).
- Один MIT на день. При попытке выбрать второй — upsert с заменой.
- При удалении задачи, которая была MIT — обнулить `task_id` в `daily_mit`.

### Синхронизация между вкладками

Использовать Supabase Realtime для основных таблиц:

```typescript
const channel = supabase.channel('tasks_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, (payload) => {
    // Обновить store
  })
  .subscribe()
```

Подписки: tasks, daily_mit, red_flags, decisions, retros, notes.

### Performance

- Списки > 50 элементов — виртуализация не требуется если нормальная структура.
- Дебаунс на search (250ms) и autosave заметок (1000ms).
- Кэшировать результаты аналитики в store, обновлять раз в минуту.

### Error handling

- Каждый `supabase` вызов — в try/catch.
- Критичные ошибки — toast.error с осмысленным текстом.
- Сетевые ошибки — retry UI («Попробовать снова»).
- В консоль — полный error object для дебага.

### Accessibility

- Все интерактивы имеют `aria-label` если только иконка.
- Фокус видим (outline на focus-visible).
- Навигация по Tab работает везде.
- Модалки: focus trap, Escape закрывает.
- Цветовой контраст соответствует WCAG AA.

---

## 13. ХОТКЕИ

Реализовать через `react-hotkeys-hook` на уровне App.

| Комбо | Действие |
|---|---|
| `Cmd/Ctrl+K` | Command palette |
| `C` | Создать задачу |
| `N` | Новая заметка (если на NotesPage) |
| `G T` | → Today |
| `G B` | → Board |
| `G I` | → Inbox |
| `G L` | → Backlog |
| `G C` | → Calendar |
| `G N` | → Notes |
| `G D` | → Decisions |
| `G F` | → Flags |
| `G A` | → Analytics |
| `G S` | → Settings |
| `P` | Toggle Pomodoro (start/pause) |
| `?` | Показать список хоткеев |
| `Esc` | Закрыть модалки / отменить редактирование |

При первом запуске — onboarding-tooltip показывает 3 ключевых: Cmd+K, C, G T.

---

## 14. АВТОРИЗАЦИЯ — ПРАВИЛЬНО

```typescript
// main.tsx
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'

// Восстановление сессии при загрузке
supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (session?.user) {
    useAuthStore.setState({ currentUser: session.user })
    await useAuthStore.getState().loadProfile()
  }
  useAuthStore.setState({ authReady: true })
})

// Подписка — ТОЛЬКО SIGNED_OUT и SIGNED_IN, остальное игнорируем
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ currentUser: null, profile: null })
    window.location.href = '/login'
  }
  if (event === 'SIGNED_IN' && session?.user) {
    useAuthStore.setState({ currentUser: session.user })
    await useAuthStore.getState().loadProfile()
    // При первом входе - засеять красные флаги если пусто
    await seedRedFlagsIfEmpty(session.user.id)
  }
  // ИГНОРИРОВАТЬ: INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED
})
```

`ProtectedRoute` ждёт `authReady`, затем:
- Если `currentUser` нет → redirect `/login`.
- Иначе render children.

---

## 15. ENV ПЕРЕМЕННЫЕ

`.env.local`:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

Типизация `src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## 16. DEPLOY НА VERCEL

1. Push код в GitHub репо `pm-cockpit` (приватный).
2. vercel.com → Add New → Project → Import репо.
3. Настройки (определятся автоматически):
   - Framework: Vite
   - Build command: `npm run build`
   - Output: `dist`
4. Environment Variables → добавить `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
5. Deploy.

Каждый push в `main` — auto-deploy.

---

## 17. ЧТО НЕ ДЕЛАТЬ

- ❌ Коллаборация, шеринг, команды — это персональный инструмент.
- ❌ Мобильное нативное приложение — только веб (но responsive!).
- ❌ Интеграции с Jira/Linear/Notion/Slack — в этой версии нет.
- ❌ AI-фичи для категоризации — не нужно.
- ❌ Attachments в задачах — не в этой версии.
- ❌ Gantt chart — overkill для одного PM.
- ❌ Timetracking вручную — только через Pomodoro.
- ❌ Custom fields — структура жёсткая.
- ❌ Подзадачи — только acceptance criteria.

---

## 18. КРИТЕРИИ ПРИЁМКИ (ЧЕКЛИСТ)

### Функциональные

- [ ] Регистрация создаёт профиль, логин работает, сессия восстанавливается при F5 без вспышки.
- [ ] При первом входе засеяны 10 красных флагов SmartBooking.
- [ ] Нельзя создать задачу без заполнения всех 6 обязательных полей.
- [ ] Нельзя перетащить 4-ю задачу в «В работе» — toast с ошибкой, действие отменяется.
- [ ] MIT на TodayPage сбрасывается при смене даты.
- [ ] Pomodoro таймер работает в фоне при переходе между страницами, floating widget виден везде.
- [ ] Pomodoro записывает сессии в БД, инкрементирует actual_minutes и pomodoro_sessions у задачи.
- [ ] Notification API: запрос permission при первом запуске pomodoro, уведомление при окончании focus/break.
- [ ] EOD retro prompt появляется после 17:00 на TodayPage.
- [ ] В понедельник видно нудж «Спланируйте неделю», в пятницу — «Сделайте недельное ретро».
- [ ] Command palette открывается Cmd+K, ищет по задачам/решениям/заметкам/флагам.
- [ ] Все горячие клавиши из таблицы работают.
- [ ] Drag-n-drop задач на Board работает, включая сортировку внутри колонки.
- [ ] Bulk actions на Backlog работают для нескольких задач.
- [ ] Экспорт CSV и JSON работают.
- [ ] Full-text search находит по title/description/context/content.
- [ ] Аналитика считается корректно, графики рендерятся.
- [ ] Markdown в задачах, решениях, заметках отображается через react-markdown.
- [ ] Realtime синхронизация: изменение в одной вкладке → обновление в другой без F5.
- [ ] Оптимистичные обновления работают: UI меняется мгновенно, при ошибке откат + toast.
- [ ] RLS: создать второго юзера в Supabase → он не видит данные первого.

### Технические

- [ ] `npm run build` проходит без TypeScript ошибок.
- [ ] `npm run lint` без ошибок (если ESLint настроен).
- [ ] Lighthouse Performance > 85, Accessibility > 90.
- [ ] Нет console.error в браузере при нормальном использовании.
- [ ] Бандл < 600 KB (gzipped).
- [ ] Работает в Chrome, Firefox, Safari (последние версии).
- [ ] Работает на iPhone Safari (основные страницы читаемы на 375px).
- [ ] Темы dark/light переключаются, настройка сохраняется в профиле.
- [ ] Timezone из профиля применяется к датам и времени retros/MIT.

### UX

- [ ] Состояния loading везде, где async.
- [ ] Состояния empty везде, где список может быть пуст (с осмысленным текстом).
- [ ] Состояния error с возможностью retry.
- [ ] Toast-уведомления не больше 3 секунд, не мешают.
- [ ] Модалки закрываются по Esc и клику на backdrop.
- [ ] Confirmation dialog перед деструктивными действиями (удалить аккаунт, удалить задачу и т.д.).
- [ ] Первый вход проводит краткий onboarding (3 экрана: приветствие, создать первую задачу, запустить pomodoro).

---

## 19. ПОРЯДОК РАЗРАБОТКИ (для Codex)

Рекомендую по фазам:

**Фаза 1 — Фундамент** (первый прогон):
1. Создать проект, зависимости, Tailwind, Vite.
2. Supabase клиент, типы, константы.
3. authStore, LoginPage, ProtectedRoute.
4. Layout + TopBar + роуты.
5. tasksStore (только базовые CRUD без всего лишнего).
6. TaskFormModal (все обязательные поля).
7. BoardPage с drag-n-drop.

**Фаза 2 — Основной функционал**:
8. TodayPage + MIT + DayStats.
9. Pomodoro (store + UI + floating).
10. InboxPage с сортировкой.
11. TaskDetailPage с acceptance criteria.
12. BacklogPage с фильтрами.

**Фаза 3 — Вспомогательное**:
13. FlagsPage + seed.
14. DecisionsPage + DecisionDetailPage.
15. RetrosPage (3 типа).
16. TemplatesPage + встроенные шаблоны.

**Фаза 4 — Продвинутое**:
17. NotesPage с markdown.
18. CalendarPage.
19. AnalyticsPage с recharts.
20. Command palette.
21. Горячие клавиши.
22. Realtime subscriptions.

**Фаза 5 — Полировка**:
23. SettingsPage (все табы, экспорт/импорт).
24. Onboarding.
25. Темы dark/light.
26. Nudges (пн/пт/P0).
27. Deploy на Vercel.

**Генерируй код фазами.** После каждой фазы — убедись, что билд проходит, и только тогда двигайся дальше.

---

## 20. ЯЗЫК И ТОН

- Весь UI — **на русском**.
- Тон: деловой, без менеджерского жаргона, без «Давайте вместе!» и «Отлично!».
- Формулировки короткие: «Создать задачу», «Сохранить», «Удалить всё», «Фокус», «Перерыв».
- Ошибки: конкретные. Не «Что-то пошло не так», а «Не удалось сохранить задачу. Проверьте подключение».
- Empty states: честные. Не «Добавьте первую задачу чтобы начать путешествие 🚀», а «Пусто. Нажмите C или кнопку выше, чтобы создать задачу».
- Нуджи: партнёрские, не nagging. «Пятница. Самое время сделать ретро недели» — ОК. «Вы снова забыли про ретро!» — НЕ ОК.

---

**Финальная проверка перед сдачей:** пройти по чеклисту из раздела 18 и убедиться, что каждый пункт работает. Если что-то не работает — фиксить, не сдавать до полного прохождения.
