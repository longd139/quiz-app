-- =============================================================================
-- Quiz App V2.0 — Centralized PostgreSQL Schema & Row Level Security
-- =============================================================================
-- Architecture:
--   - Single centralized PostgreSQL database (no room-based JSONB blobs).
--   - Supabase Auth (email/password, public signup disabled).
--   - Shared learning content: readable by ACTIVE users, writable by ADMIN.
--   - Personal learning data: scoped to user_id = auth.uid() for ACTIVE users.
--   - DISABLED users: blocked from all learning content & personal data via RLS.
--   - Anonymous users: zero access to application tables.
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. PROFILES
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null unique,
  full_name            text not null default '',
  avatar_url           text,
  role                 text not null default 'USER' check (role in ('ADMIN', 'USER')),
  status               text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  must_change_password boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  last_login_at        timestamptz
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_email on public.profiles(email);

-- Trigger to auto-create profile on auth.users insert (always defaults to USER/ACTIVE)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status, must_change_password)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'USER',
    'ACTIVE',
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Prevent non-admin users from modifying protected profile columns (role, status, email)
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  -- Service role / postgres superuser bypasses (auth.uid() is null in server-side admin calls)
  if auth.uid() is null then
    return new;
  end if;

  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and status = 'ACTIVE'
  ) into v_is_admin;

  if not v_is_admin then
    if new.role is distinct from old.role then
      raise exception 'Forbidden: cannot modify role';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Forbidden: cannot modify status';
    end if;
    if (new.email is distinct from old.email) then
      raise exception 'Forbidden: cannot modify email';
    end if;
    if new.must_change_password is distinct from old.must_change_password then
      raise exception 'Forbidden: cannot modify must_change_password directly';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_update on public.profiles;
create trigger trg_profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- -----------------------------------------------------------------------------
-- 2. RLS HELPER FUNCTIONS (non-recursive, fixed search_path)
-- -----------------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'ACTIVE'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and status = 'ACTIVE'
  );
$$;

revoke all on function public.is_active_user() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. SHARED LEARNING CONTENT — QUIZ
-- -----------------------------------------------------------------------------
create table if not exists public.quiz_collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  sort_order  integer not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_quiz_collections_updated_at on public.quiz_collections;
create trigger trg_quiz_collections_updated_at
  before update on public.quiz_collections
  for each row execute function public.set_updated_at();

create table if not exists public.quiz_sets (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid references public.quiz_collections(id) on delete set null,
  name          text not null,
  description   text not null default '',
  version       integer not null default 1,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_quiz_sets_collection_id on public.quiz_sets(collection_id);

drop trigger if exists trg_quiz_sets_updated_at on public.quiz_sets;
create trigger trg_quiz_sets_updated_at
  before update on public.quiz_sets
  for each row execute function public.set_updated_at();

create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_set_id uuid not null references public.quiz_sets(id) on delete cascade,
  prompt      text not null,
  explanation text not null default '',
  sort_order  integer not null default 0,
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_questions_quiz_set_id on public.questions(quiz_set_id);

drop trigger if exists trg_questions_updated_at on public.questions;
create trigger trg_questions_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create table if not exists public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label       text not null,
  text        text not null,
  is_correct  boolean not null default false,
  sort_order  integer not null default 0,
  unique (question_id, sort_order)
);

create index if not exists idx_question_options_question_id on public.question_options(question_id);

-- -----------------------------------------------------------------------------
-- 4. SHARED LEARNING CONTENT — VOCABULARY
-- -----------------------------------------------------------------------------
create table if not exists public.vocab_collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  integer not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_vocab_collections_updated_at on public.vocab_collections;
create trigger trg_vocab_collections_updated_at
  before update on public.vocab_collections
  for each row execute function public.set_updated_at();

create table if not exists public.vocab_decks (
  id              uuid primary key default gen_random_uuid(),
  collection_id   uuid references public.vocab_collections(id) on delete set null,
  name            text not null,
  description     text not null default '',
  target_language text not null default 'en-US',
  version         integer not null default 1,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_vocab_decks_collection_id on public.vocab_decks(collection_id);

drop trigger if exists trg_vocab_decks_updated_at on public.vocab_decks;
create trigger trg_vocab_decks_updated_at
  before update on public.vocab_decks
  for each row execute function public.set_updated_at();

create table if not exists public.flashcards (
  id              uuid primary key default gen_random_uuid(),
  deck_id         uuid not null references public.vocab_decks(id) on delete cascade,
  term            text not null,
  meaning         text not null,
  phonetic        text not null default '',
  part_of_speech  text not null default '',
  example         text not null default '',
  example_meaning text not null default '',
  examples        jsonb not null default '[]'::jsonb,
  image_url       text not null default '',
  note            text not null default '',
  sort_order      integer not null default 0,
  version         integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_flashcards_deck_id on public.flashcards(deck_id);

drop trigger if exists trg_flashcards_updated_at on public.flashcards;
create trigger trg_flashcards_updated_at
  before update on public.flashcards
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. PERSONAL LEARNING DATA (per user_id)
-- -----------------------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  quiz_set_id      uuid references public.quiz_sets(id) on delete set null,
  test_name        text not null,
  mode             text not null default 'practice' check (mode in ('practice', 'exam')),
  total_questions  integer not null default 0 check (total_questions >= 0),
  correct_count    integer not null default 0 check (correct_count >= 0),
  score_percent    numeric(5,2) not null default 0 check (score_percent >= 0 and score_percent <= 100),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  started_at       timestamptz not null default now(),
  completed_at     timestamptz not null default now()
);

create index if not exists idx_quiz_attempts_user_id on public.quiz_attempts(user_id, completed_at desc);

create table if not exists public.quiz_attempt_answers (
  id                uuid primary key default gen_random_uuid(),
  attempt_id        uuid not null references public.quiz_attempts(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  question_id       uuid references public.questions(id) on delete set null,
  question_snapshot jsonb not null,
  selected_indices  integer[] not null default '{}',
  is_correct        boolean not null default false,
  sort_order        integer not null default 0
);

create index if not exists idx_quiz_attempt_answers_attempt_id on public.quiz_attempt_answers(attempt_id);
create index if not exists idx_quiz_attempt_answers_user_id on public.quiz_attempt_answers(user_id);

create table if not exists public.question_learning_stats (
  user_id           uuid not null references public.profiles(id) on delete cascade,
  question_id       uuid not null references public.questions(id) on delete cascade,
  attempts          integer not null default 0 check (attempts >= 0),
  correct           integer not null default 0 check (correct >= 0),
  wrong             integer not null default 0 check (wrong >= 0),
  last_attempted_at timestamptz,
  primary key (user_id, question_id)
);

create table if not exists public.vocab_learning_progress (
  user_id          uuid not null references public.profiles(id) on delete cascade,
  flashcard_id     uuid not null references public.flashcards(id) on delete cascade,
  mastered         boolean not null default false,
  review_count     integer not null default 0 check (review_count >= 0),
  correct_count    integer not null default 0 check (correct_count >= 0),
  wrong_count      integer not null default 0 check (wrong_count >= 0),
  last_reviewed_at timestamptz,
  primary key (user_id, flashcard_id)
);

create index if not exists idx_vocab_progress_user_id on public.vocab_learning_progress(user_id);

create table if not exists public.daily_learning_activity (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  activity_date  date not null,
  activity_count integer not null default 0 check (activity_count >= 0),
  updated_at     timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create table if not exists public.learning_rewards (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  moosk_count integer not null default 0 check (moosk_count >= 0),
  updated_at  timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  shuffle_questions boolean not null default true,
  shuffle_options   boolean not null default false,
  practice_mode     text not null default 'submit' check (practice_mode in ('submit', 'instant')),
  tts_muted         boolean not null default false,
  font_size         integer not null default 100 check (font_size between 75 and 150),
  dark_mode         boolean not null default false,
  updated_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. SYSTEM SETTINGS, AUDIT LOGS & BACKUP METADATA
-- -----------------------------------------------------------------------------
create table if not exists public.system_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action        text not null,
  entity_type   text not null,
  entity_id     text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id);

create table if not exists public.backup_metadata (
  id            uuid primary key default gen_random_uuid(),
  created_by    uuid references public.profiles(id) on delete set null,
  scope         text not null default 'full' check (scope in ('full', 'shared_content', 'pre_restore')),
  status        text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'restored')),
  app_version   text not null default '2.0.0',
  entity_counts jsonb not null default '{}'::jsonb,
  snapshot_data jsonb,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_backup_metadata_created_at on public.backup_metadata(created_at desc);

create table if not exists public.legacy_id_mapping (
  legacy_room_id uuid not null,
  entity_type    text not null,
  legacy_id      text not null,
  new_id         uuid not null,
  created_at     timestamptz not null default now(),
  primary key (legacy_room_id, entity_type, legacy_id)
);

-- -----------------------------------------------------------------------------
-- 7. ENABLE RLS & POLICIES
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.quiz_collections enable row level security;
alter table public.quiz_sets enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.vocab_collections enable row level security;
alter table public.vocab_decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.question_learning_stats enable row level security;
alter table public.vocab_learning_progress enable row level security;
alter table public.daily_learning_activity enable row level security;
alter table public.learning_rewards enable row level security;
alter table public.user_preferences enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.backup_metadata enable row level security;
alter table public.legacy_id_mapping enable row level security;

-- Revoke anon access on all tables explicitly
revoke all on all tables in schema public from anon;

-- Profiles policies
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_active" on public.profiles;
create policy "profiles_update_own_active" on public.profiles
  for update to authenticated
  using (id = auth.uid() and status = 'ACTIVE')
  with check (id = auth.uid() and status = 'ACTIVE');

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Shared content policies: ACTIVE users can read; ADMIN can insert/update/delete
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'quiz_collections', 'quiz_sets', 'questions', 'question_options',
    'vocab_collections', 'vocab_decks', 'flashcards'
  ] loop
    execute format('drop policy if exists "%s_select_active" on public.%I', tbl, tbl);
    execute format('create policy "%s_select_active" on public.%I for select to authenticated using (public.is_active_user())', tbl, tbl);

    execute format('drop policy if exists "%s_admin_all" on public.%I', tbl, tbl);
    execute format('create policy "%s_admin_all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', tbl, tbl);
  end loop;
end $$;

-- Personal learning data policies: ACTIVE users manage own rows (user_id = auth.uid())
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'quiz_attempts', 'quiz_attempt_answers', 'question_learning_stats',
    'vocab_learning_progress', 'daily_learning_activity', 'learning_rewards',
    'user_preferences'
  ] loop
    execute format('drop policy if exists "%s_own_active" on public.%I', tbl, tbl);
    execute format(
      'create policy "%s_own_active" on public.%I for all to authenticated using (user_id = auth.uid() and public.is_active_user()) with check (user_id = auth.uid() and public.is_active_user())',
      tbl, tbl
    );
  end loop;
end $$;

-- System settings: active users can read, admin can write
drop policy if exists "system_settings_select_active" on public.system_settings;
create policy "system_settings_select_active" on public.system_settings
  for select to authenticated
  using (public.is_active_user());

drop policy if exists "system_settings_admin_all" on public.system_settings;
create policy "system_settings_admin_all" on public.system_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Audit logs: append-only; ADMIN can read all, active users can insert own actor events
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select" on public.audit_logs
  for select to authenticated
  using (public.is_admin());

drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated
  with check (actor_user_id = auth.uid() and public.is_active_user());

-- Backup metadata & legacy mapping: ADMIN only
drop policy if exists "backup_metadata_admin_all" on public.backup_metadata;
create policy "backup_metadata_admin_all" on public.backup_metadata
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "legacy_id_mapping_admin_all" on public.legacy_id_mapping;
create policy "legacy_id_mapping_admin_all" on public.legacy_id_mapping
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8. RPC HELPERS FOR ATOMIC INCREMENTS
-- -----------------------------------------------------------------------------
create or replace function public.increment_daily_activity(p_date date, p_count integer default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'Unauthorized or disabled account';
  end if;

  insert into public.daily_learning_activity (user_id, activity_date, activity_count, updated_at)
  values (auth.uid(), p_date, greatest(0, p_count), now())
  on conflict (user_id, activity_date)
  do update set
    activity_count = public.daily_learning_activity.activity_count + greatest(0, p_count),
    updated_at = now();
end;
$$;

create or replace function public.increment_moosk(p_delta integer default 1)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  if not public.is_active_user() then
    raise exception 'Unauthorized or disabled account';
  end if;

  insert into public.learning_rewards (user_id, moosk_count, updated_at)
  values (auth.uid(), greatest(0, p_delta), now())
  on conflict (user_id)
  do update set
    moosk_count = greatest(0, public.learning_rewards.moosk_count + p_delta),
    updated_at = now()
  returning moosk_count into v_new;

  return v_new;
end;
$$;

revoke all on function public.increment_daily_activity(date, integer) from public;
revoke all on function public.increment_moosk(integer) from public;
grant execute on function public.increment_daily_activity(date, integer) to authenticated;
grant execute on function public.increment_moosk(integer) to authenticated;
