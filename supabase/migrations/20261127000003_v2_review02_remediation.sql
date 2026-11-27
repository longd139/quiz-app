-- =============================================================================
-- Quiz App V2.0 — Review 02 Remediation Migration
-- Fixes: BUG-01, BUG-02, BUG-04, BUG-05, BUG-06, BUG-07, BUG-08, BUG-09,
--        BUG-11, BUG-12, BUG-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BUG-11: Enforce must_change_password = false in is_active_user / is_admin
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
    where id = auth.uid()
      and status = 'ACTIVE'
      and must_change_password = false
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
    where id = auth.uid()
      and role = 'ADMIN'
      and status = 'ACTIVE'
      and must_change_password = false
  );
$$;

revoke all on function public.is_active_user() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. BUG-12: Prevent direct REST API updates to protected profile fields
--    (even by Admin — must go through trusted admin-users Edge Function)
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_admin_update" on public.profiles;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only service_role / postgres superuser (auth.uid() is null) may mutate protected fields
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Forbidden: cannot modify role directly';
  end if;
  if new.status is distinct from old.status then
    raise exception 'Forbidden: cannot modify status directly';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Forbidden: cannot modify email directly';
  end if;
  if new.must_change_password is distinct from old.must_change_password then
    raise exception 'Forbidden: cannot modify must_change_password directly';
  end if;

  return new;
end;
$$;

-- Transactional admin user update helper (called by admin-users Edge Function)
-- Uses advisory lock to prevent race conditions on last active ADMIN invariant.
create or replace function public.admin_update_profile_tx(
  p_actor_id uuid,
  p_target_id uuid,
  p_full_name text,
  p_role text,
  p_status text,
  p_must_change_password boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.profiles;
  v_updated public.profiles;
  v_active_admins integer;
begin
  perform pg_advisory_xact_lock(hashtext('admin_profile_invariant'));

  select * into v_target from public.profiles where id = p_target_id for update;
  if not found then
    raise exception 'Không tìm thấy tài khoản.';
  end if;

  if p_target_id = p_actor_id and p_status = 'DISABLED' then
    raise exception 'Không thể tự khóa tài khoản của chính mình.';
  end if;

  if v_target.role = 'ADMIN' and (p_role <> 'ADMIN' or p_status <> 'ACTIVE') then
    select count(*) into v_active_admins
    from public.profiles
    where role = 'ADMIN' and status = 'ACTIVE';

    if v_active_admins <= 1 then
      raise exception 'Hệ thống phải có ít nhất 1 Quản trị viên đang hoạt động.';
    end if;
  end if;

  update public.profiles
  set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
      role = case when p_role in ('ADMIN', 'USER') then p_role else role end,
      status = case when p_status in ('ACTIVE', 'DISABLED') then p_status else status end,
      must_change_password = coalesce(p_must_change_password, must_change_password)
  where id = p_target_id
  returning * into v_updated;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_id,
    case
      when v_updated.status <> v_target.status then
        case when v_updated.status = 'DISABLED' then 'ADMIN_USER_DISABLE' else 'ADMIN_USER_ENABLE' end
      when v_updated.role <> v_target.role then 'ADMIN_USER_ROLE_CHANGE'
      else 'ADMIN_USER_UPDATE'
    end,
    'profile',
    p_target_id::text,
    jsonb_build_object(
      'email', v_target.email,
      'previous_role', v_target.role,
      'new_role', v_updated.role,
      'previous_status', v_target.status,
      'new_status', v_updated.status
    )
  );

  return v_updated;
end;
$$;

revoke all on function public.admin_update_profile_tx(uuid, uuid, text, text, text, boolean) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. BUG-06: Revoke PUBLIC / anon / authenticated on legacy RPCs
-- -----------------------------------------------------------------------------
create or replace function public.cutover_disable_legacy_rooms()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'create_app_room') then
    revoke all on function public.create_app_room(text) from public, anon, authenticated;
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'get_app_room') then
    revoke all on function public.get_app_room(text) from public, anon, authenticated;
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'upsert_app_room') then
    revoke all on function public.upsert_app_room(text, jsonb) from public, anon, authenticated;
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'get_room_id_by_secret') then
    revoke all on function public.get_room_id_by_secret(text) from public, anon, authenticated;
  end if;
end;
$$;

revoke all on function public.cutover_disable_legacy_rooms() from public, anon, authenticated;
select public.cutover_disable_legacy_rooms();

-- -----------------------------------------------------------------------------
-- 4. BUG-01, BUG-02, BUG-04: Atomic Quiz Set & Vocab Deck Save / Delete RPCs
-- -----------------------------------------------------------------------------
create or replace function public.save_quiz_set_atomic(
  p_id uuid,
  p_collection_id uuid,
  p_name text,
  p_description text,
  p_expected_version integer,
  p_questions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_exists boolean;
  v_new_version integer;
  v_updated_at timestamptz;
  v_q jsonb;
  v_opt jsonb;
  v_q_id uuid;
  v_q_idx integer := 0;
  v_opt_idx integer;
  v_keep_q_ids uuid[] := '{}';
  v_correct_indices integer[];
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'Validation error: quiz set name is required';
  end if;

  select exists(select 1 from public.quiz_sets where id = p_id) into v_exists;

  if v_exists then
    update public.quiz_sets
    set collection_id = p_collection_id,
        name = trim(p_name),
        description = coalesce(p_description, ''),
        version = version + 1,
        updated_at = now()
    where id = p_id
      and (p_expected_version is null or version = p_expected_version)
    returning version, updated_at into v_new_version, v_updated_at;

    if not found then
      raise exception 'CONFLICT: Bộ đề đã được chỉnh sửa bởi người khác. Vui lòng tải lại trước khi lưu.';
    end if;
  else
    insert into public.quiz_sets (id, collection_id, name, description, version, created_by)
    values (coalesce(p_id, gen_random_uuid()), p_collection_id, trim(p_name), coalesce(p_description, ''), 1, v_actor)
    returning id, version, updated_at into p_id, v_new_version, v_updated_at;
  end if;

  for v_q in select * from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
    v_q_id := coalesce((v_q ->> 'id')::uuid, gen_random_uuid());
    v_keep_q_ids := array_append(v_keep_q_ids, v_q_id);

    insert into public.questions (id, quiz_set_id, prompt, explanation, sort_order)
    values (v_q_id, p_id, coalesce(v_q ->> 'prompt', ''), coalesce(v_q ->> 'explanation', ''), v_q_idx)
    on conflict (id) do update
    set prompt = excluded.prompt,
        explanation = excluded.explanation,
        sort_order = excluded.sort_order,
        version = public.questions.version + 1,
        updated_at = now()
    where public.questions.quiz_set_id = p_id;

    delete from public.question_options where question_id = v_q_id;

    select coalesce(array_agg(val::integer), '{}') into v_correct_indices
    from jsonb_array_elements_text(coalesce(v_q -> 'correctIndices', '[]'::jsonb)) as val;

    v_opt_idx := 0;
    for v_opt in select * from jsonb_array_elements(coalesce(v_q -> 'options', '[]'::jsonb)) loop
      insert into public.question_options (question_id, label, text, is_correct, sort_order)
      values (
        v_q_id,
        coalesce(v_opt ->> 'label', chr(65 + v_opt_idx)),
        coalesce(v_opt ->> 'text', ''),
        v_opt_idx = any(v_correct_indices),
        v_opt_idx
      );
      v_opt_idx := v_opt_idx + 1;
    end loop;

    v_q_idx := v_q_idx + 1;
  end loop;

  delete from public.questions
  where quiz_set_id = p_id
    and not (id = any(v_keep_q_ids));

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    case when v_exists then 'ADMIN_QUIZ_SET_UPDATE' else 'ADMIN_QUIZ_SET_CREATE' end,
    'quiz_set',
    p_id::text,
    jsonb_build_object('name', trim(p_name), 'version', v_new_version, 'question_count', v_q_idx)
  );

  return jsonb_build_object('id', p_id, 'version', v_new_version, 'updated_at', v_updated_at);
end;
$$;

create or replace function public.delete_quiz_set_atomic(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  delete from public.quiz_sets where id = p_id returning name into v_name;
  if found then
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'ADMIN_QUIZ_SET_DELETE', 'quiz_set', p_id::text, jsonb_build_object('name', v_name));
  end if;
end;
$$;

create or replace function public.save_vocab_deck_atomic(
  p_id uuid,
  p_collection_id uuid,
  p_name text,
  p_description text,
  p_target_language text,
  p_expected_version integer,
  p_cards jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_exists boolean;
  v_new_version integer;
  v_updated_at timestamptz;
  v_c jsonb;
  v_c_id uuid;
  v_c_idx integer := 0;
  v_keep_c_ids uuid[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'Validation error: deck name is required';
  end if;

  select exists(select 1 from public.vocab_decks where id = p_id) into v_exists;

  if v_exists then
    update public.vocab_decks
    set collection_id = p_collection_id,
        name = trim(p_name),
        description = coalesce(p_description, ''),
        target_language = coalesce(nullif(trim(p_target_language), ''), 'en-US'),
        version = version + 1,
        updated_at = now()
    where id = p_id
      and (p_expected_version is null or version = p_expected_version)
    returning version, updated_at into v_new_version, v_updated_at;

    if not found then
      raise exception 'CONFLICT: Bộ từ vựng đã được chỉnh sửa bởi người khác. Vui lòng tải lại trước khi lưu.';
    end if;
  else
    insert into public.vocab_decks (id, collection_id, name, description, target_language, version, created_by)
    values (
      coalesce(p_id, gen_random_uuid()),
      p_collection_id,
      trim(p_name),
      coalesce(p_description, ''),
      coalesce(nullif(trim(p_target_language), ''), 'en-US'),
      1,
      v_actor
    )
    returning id, version, updated_at into p_id, v_new_version, v_updated_at;
  end if;

  for v_c in select * from jsonb_array_elements(coalesce(p_cards, '[]'::jsonb)) loop
    v_c_id := coalesce((v_c ->> 'id')::uuid, gen_random_uuid());
    v_keep_c_ids := array_append(v_keep_c_ids, v_c_id);

    insert into public.flashcards (
      id, deck_id, term, meaning, phonetic, part_of_speech,
      example, example_meaning, examples, image_url, note, sort_order
    ) values (
      v_c_id,
      p_id,
      coalesce(v_c ->> 'term', ''),
      coalesce(v_c ->> 'meaning', ''),
      coalesce(v_c ->> 'phonetic', ''),
      coalesce(v_c ->> 'partOfSpeech', ''),
      coalesce(v_c ->> 'example', ''),
      coalesce(v_c ->> 'exampleMeaning', ''),
      coalesce(v_c -> 'examples', '[]'::jsonb),
      coalesce(v_c ->> 'image', ''),
      coalesce(v_c ->> 'note', ''),
      v_c_idx
    )
    on conflict (id) do update
    set term = excluded.term,
        meaning = excluded.meaning,
        phonetic = excluded.phonetic,
        part_of_speech = excluded.part_of_speech,
        example = excluded.example,
        example_meaning = excluded.example_meaning,
        examples = excluded.examples,
        image_url = excluded.image_url,
        note = excluded.note,
        sort_order = excluded.sort_order,
        version = public.flashcards.version + 1,
        updated_at = now()
    where public.flashcards.deck_id = p_id;

    v_c_idx := v_c_idx + 1;
  end loop;

  delete from public.flashcards
  where deck_id = p_id
    and not (id = any(v_keep_c_ids));

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    case when v_exists then 'ADMIN_VOCAB_DECK_UPDATE' else 'ADMIN_VOCAB_DECK_CREATE' end,
    'vocab_deck',
    p_id::text,
    jsonb_build_object('name', trim(p_name), 'version', v_new_version, 'card_count', v_c_idx)
  );

  return jsonb_build_object('id', p_id, 'version', v_new_version, 'updated_at', v_updated_at);
end;
$$;

create or replace function public.delete_vocab_deck_atomic(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  delete from public.vocab_decks where id = p_id returning name into v_name;
  if found then
    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'ADMIN_VOCAB_DECK_DELETE', 'vocab_deck', p_id::text, jsonb_build_object('name', v_name));
  end if;
end;
$$;

revoke all on function public.save_quiz_set_atomic(uuid, uuid, text, text, integer, jsonb) from public;
revoke all on function public.delete_quiz_set_atomic(uuid) from public;
revoke all on function public.save_vocab_deck_atomic(uuid, uuid, text, text, text, integer, jsonb) from public;
revoke all on function public.delete_vocab_deck_atomic(uuid) from public;
grant execute on function public.save_quiz_set_atomic(uuid, uuid, text, text, integer, jsonb) to authenticated;
grant execute on function public.delete_quiz_set_atomic(uuid) to authenticated;
grant execute on function public.save_vocab_deck_atomic(uuid, uuid, text, text, text, integer, jsonb) to authenticated;
grant execute on function public.delete_vocab_deck_atomic(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. BUG-08 & Parent Ownership: Quiz Attempts & Answers
-- -----------------------------------------------------------------------------
alter table public.quiz_attempts
  add column if not exists test_names jsonb not null default '[]'::jsonb,
  add column if not exists questions_snapshot jsonb not null default '[]'::jsonb;

-- Composite unique + FK to prevent attaching child answers to another user attempt
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_quiz_attempts_id_user'
  ) then
    alter table public.quiz_attempts add constraint uq_quiz_attempts_id_user unique (id, user_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'fk_quiz_attempt_answers_parent_owner'
  ) then
    alter table public.quiz_attempt_answers
      add constraint fk_quiz_attempt_answers_parent_owner
      foreign key (attempt_id, user_id) references public.quiz_attempts(id, user_id) on delete cascade;
  end if;
end $$;

create or replace function public.save_quiz_attempt_atomic(p_attempt jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt_id uuid;
  v_ans jsonb;
  v_idx integer := 0;
  v_q_id uuid;
begin
  if not public.is_active_user() then
    raise exception 'Unauthorized or password change required';
  end if;

  v_attempt_id := coalesce(nullif(p_attempt ->> 'id', '')::uuid, gen_random_uuid());

  insert into public.quiz_attempts (
    id, user_id, quiz_set_id, test_name, test_names, questions_snapshot,
    mode, total_questions, correct_count, score_percent, duration_seconds,
    started_at, completed_at
  ) values (
    v_attempt_id,
    v_user_id,
    nullif(p_attempt ->> 'testId', '')::uuid,
    coalesce(p_attempt ->> 'testName', 'Bài thi'),
    coalesce(p_attempt -> 'testNames', '[]'::jsonb),
    coalesce(p_attempt -> 'questions', '[]'::jsonb),
    case when (p_attempt ->> 'mode') = 'exam' then 'exam' else 'practice' end,
    greatest(0, coalesce((p_attempt ->> 'totalQuestions')::integer, 0)),
    greatest(0, coalesce((p_attempt ->> 'correctCount')::integer, 0)),
    least(100, greatest(0, coalesce((p_attempt ->> 'score')::numeric, 0))),
    greatest(0, coalesce((p_attempt ->> 'duration')::integer, 0)),
    coalesce((p_attempt ->> 'startedAt')::timestamptz, now()),
    coalesce((p_attempt ->> 'completedAt')::timestamptz, now())
  )
  on conflict (id) do update
  set test_name = excluded.test_name,
      test_names = excluded.test_names,
      questions_snapshot = excluded.questions_snapshot,
      total_questions = excluded.total_questions,
      correct_count = excluded.correct_count,
      score_percent = excluded.score_percent,
      duration_seconds = excluded.duration_seconds,
      completed_at = excluded.completed_at
  where public.quiz_attempts.user_id = v_user_id;

  delete from public.quiz_attempt_answers where attempt_id = v_attempt_id and user_id = v_user_id;

  for v_ans in select * from jsonb_array_elements(coalesce(p_attempt -> 'answersList', '[]'::jsonb)) loop
    v_q_id := nullif(v_ans ->> 'questionId', '')::uuid;
    -- Only keep question_id FK if it actually exists in questions table
    if v_q_id is not null and not exists (select 1 from public.questions where id = v_q_id) then
      v_q_id := null;
    end if;

    insert into public.quiz_attempt_answers (
      attempt_id, user_id, question_id, question_snapshot, selected_indices, is_correct, sort_order
    ) values (
      v_attempt_id,
      v_user_id,
      v_q_id,
      coalesce(v_ans -> 'questionSnapshot', '{}'::jsonb),
      coalesce((select array_agg(x::integer) from jsonb_array_elements_text(coalesce(v_ans -> 'selectedIndices', '[]'::jsonb)) as x), '{}'),
      coalesce((v_ans ->> 'isCorrect')::boolean, false),
      v_idx
    );
    v_idx := v_idx + 1;
  end loop;

  return jsonb_build_object('id', v_attempt_id);
end;
$$;

revoke all on function public.save_quiz_attempt_atomic(jsonb) from public;
grant execute on function public.save_quiz_attempt_atomic(jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. BUG-05: Concurrent Learning Progress (Idempotent Delta Events)
-- -----------------------------------------------------------------------------
create table if not exists public.learning_progress_events (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  operation_id text not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, operation_id)
);

alter table public.learning_progress_events enable row level security;
revoke all on table public.learning_progress_events from anon;

drop policy if exists "learning_progress_events_own_active" on public.learning_progress_events;
create policy "learning_progress_events_own_active" on public.learning_progress_events
  for all to authenticated
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

create or replace function public.apply_learning_progress_event(
  p_operation_id text,
  p_question_deltas jsonb default '[]'::jsonb,
  p_vocab_deltas jsonb default '[]'::jsonb,
  p_activity_date date default null,
  p_activity_delta integer default 0,
  p_moosk_delta integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted_op text;
  v_qd jsonb;
  v_vd jsonb;
  v_qid uuid;
  v_fid uuid;
begin
  if not public.is_active_user() then
    raise exception 'Unauthorized or password change required';
  end if;

  if p_operation_id is null or trim(p_operation_id) = '' then
    raise exception 'operation_id is required';
  end if;

  insert into public.learning_progress_events (user_id, operation_id)
  values (v_user_id, trim(p_operation_id))
  on conflict (user_id, operation_id) do nothing
  returning operation_id into v_inserted_op;

  if v_inserted_op is null then
    return jsonb_build_object('applied', false, 'duplicate', true);
  end if;

  for v_qd in select * from jsonb_array_elements(coalesce(p_question_deltas, '[]'::jsonb)) loop
    v_qid := nullif(v_qd ->> 'questionId', '')::uuid;
    if v_qid is not null and exists (select 1 from public.questions where id = v_qid) then
      insert into public.question_learning_stats (user_id, question_id, attempts, correct, wrong, last_attempted_at)
      values (
        v_user_id,
        v_qid,
        greatest(0, coalesce((v_qd ->> 'attemptsDelta')::integer, 0)),
        greatest(0, coalesce((v_qd ->> 'correctDelta')::integer, 0)),
        greatest(0, coalesce((v_qd ->> 'wrongDelta')::integer, 0)),
        now()
      )
      on conflict (user_id, question_id) do update
      set attempts = public.question_learning_stats.attempts + greatest(0, coalesce((v_qd ->> 'attemptsDelta')::integer, 0)),
          correct = public.question_learning_stats.correct + greatest(0, coalesce((v_qd ->> 'correctDelta')::integer, 0)),
          wrong = public.question_learning_stats.wrong + greatest(0, coalesce((v_qd ->> 'wrongDelta')::integer, 0)),
          last_attempted_at = now();
    end if;
  end loop;

  for v_vd in select * from jsonb_array_elements(coalesce(p_vocab_deltas, '[]'::jsonb)) loop
    v_fid := nullif(v_vd ->> 'flashcardId', '')::uuid;
    if v_fid is not null and exists (select 1 from public.flashcards where id = v_fid) then
      insert into public.vocab_learning_progress (user_id, flashcard_id, mastered, review_count, correct_count, wrong_count, last_reviewed_at)
      values (
        v_user_id,
        v_fid,
        coalesce((v_vd ->> 'mastered')::boolean, false),
        greatest(0, coalesce((v_vd ->> 'reviewDelta')::integer, 0)),
        greatest(0, coalesce((v_vd ->> 'correctDelta')::integer, 0)),
        greatest(0, coalesce((v_vd ->> 'wrongDelta')::integer, 0)),
        now()
      )
      on conflict (user_id, flashcard_id) do update
      set mastered = case
            when v_vd ? 'mastered' then coalesce((v_vd ->> 'mastered')::boolean, public.vocab_learning_progress.mastered)
            else public.vocab_learning_progress.mastered
          end,
          review_count = public.vocab_learning_progress.review_count + greatest(0, coalesce((v_vd ->> 'reviewDelta')::integer, 0)),
          correct_count = public.vocab_learning_progress.correct_count + greatest(0, coalesce((v_vd ->> 'correctDelta')::integer, 0)),
          wrong_count = public.vocab_learning_progress.wrong_count + greatest(0, coalesce((v_vd ->> 'wrongDelta')::integer, 0)),
          last_reviewed_at = now();
    end if;
  end loop;

  if p_activity_date is not null and coalesce(p_activity_delta, 0) > 0 then
    insert into public.daily_learning_activity (user_id, activity_date, activity_count, updated_at)
    values (v_user_id, p_activity_date, p_activity_delta, now())
    on conflict (user_id, activity_date) do update
    set activity_count = public.daily_learning_activity.activity_count + p_activity_delta,
        updated_at = now();
  end if;

  if coalesce(p_moosk_delta, 0) > 0 then
    insert into public.learning_rewards (user_id, moosk_count, updated_at)
    values (v_user_id, p_moosk_delta, now())
    on conflict (user_id) do update
    set moosk_count = public.learning_rewards.moosk_count + p_moosk_delta,
        updated_at = now();
  end if;

  return jsonb_build_object('applied', true, 'duplicate', false);
end;
$$;

revoke all on function public.apply_learning_progress_event(text, jsonb, jsonb, date, integer, integer) from public;
grant execute on function public.apply_learning_progress_event(text, jsonb, jsonb, date, integer, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. BUG-09: Transactional Backup & Restore RPC
-- -----------------------------------------------------------------------------
create or replace function public.restore_backup_atomic(
  p_backup_id uuid,
  p_mode text default 'merge',
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_backup public.backup_metadata;
  v_snap jsonb;
  v_pre_snap jsonb;
  v_col jsonb;
  v_t jsonb;
  v_q jsonb;
  v_opt jsonb;
  v_vc jsonb;
  v_d jsonb;
  v_c jsonb;
  v_q_idx integer;
  v_opt_idx integer;
  v_c_idx integer;
  v_correct_indices integer[];
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  if p_mode not in ('merge', 'replace') then
    raise exception 'Invalid restore mode: %', p_mode;
  end if;

  select * into v_backup from public.backup_metadata where id = p_backup_id;
  if not found or v_backup.snapshot_data is null then
    raise exception 'Không tìm thấy bản sao lưu hợp lệ.';
  end if;

  if coalesce(v_backup.app_version, '') not like 'v2.%' and coalesce(v_backup.app_version, '') not like '2.%' then
    raise exception 'Phiên bản sao lưu không tương thích: %', v_backup.app_version;
  end if;

  v_snap := v_backup.snapshot_data;
  if jsonb_typeof(v_snap -> 'tests') <> 'array' or jsonb_typeof(v_snap -> 'vocabDecks') <> 'array' then
    raise exception 'Cấu trúc snapshot_data không hợp lệ.';
  end if;

  if p_dry_run then
    return jsonb_build_object(
      'dry_run', true,
      'backup_id', p_backup_id,
      'mode', p_mode,
      'quiz_sets', jsonb_array_length(v_snap -> 'tests'),
      'vocab_decks', jsonb_array_length(v_snap -> 'vocabDecks')
    );
  end if;

  -- Create pre-restore safety backup inside same transaction
  select jsonb_build_object(
    'collections', coalesce((select jsonb_agg(row_to_json(c)) from public.quiz_collections c), '[]'::jsonb),
    'tests', coalesce((select jsonb_agg(row_to_json(s)) from public.quiz_sets s), '[]'::jsonb),
    'vocabCollections', coalesce((select jsonb_agg(row_to_json(vc)) from public.vocab_collections vc), '[]'::jsonb),
    'vocabDecks', coalesce((select jsonb_agg(row_to_json(vd)) from public.vocab_decks vd), '[]'::jsonb)
  ) into v_pre_snap;

  insert into public.backup_metadata (created_by, scope, status, app_version, entity_counts, snapshot_data, notes)
  values (
    v_actor,
    'pre_restore',
    'completed',
    'v2.0.0',
    jsonb_build_object(
      'quizSets', (select count(*) from public.quiz_sets),
      'vocabDecks', (select count(*) from public.vocab_decks)
    ),
    v_pre_snap,
    'Auto pre-restore backup trước khi khôi phục ' || p_backup_id::text
  );

  if p_mode = 'replace' then
    delete from public.quiz_sets;
    delete from public.quiz_collections;
    delete from public.vocab_decks;
    delete from public.vocab_collections;
  end if;

  for v_col in select * from jsonb_array_elements(coalesce(v_snap -> 'collections', '[]'::jsonb)) loop
    insert into public.quiz_collections (id, name, description, created_by)
    values ((v_col ->> 'id')::uuid, coalesce(v_col ->> 'name', 'Bộ sưu tập'), coalesce(v_col ->> 'description', ''), v_actor)
    on conflict (id) do update set name = excluded.name, description = excluded.description, updated_at = now();
  end loop;

  for v_t in select * from jsonb_array_elements(v_snap -> 'tests') loop
    insert into public.quiz_sets (id, collection_id, name, description, created_by)
    values (
      (v_t ->> 'id')::uuid,
      nullif(v_t ->> 'collectionId', '')::uuid,
      coalesce(v_t ->> 'name', 'Bài thi'),
      coalesce(v_t ->> 'description', ''),
      v_actor
    )
    on conflict (id) do update
    set collection_id = excluded.collection_id,
        name = excluded.name,
        description = excluded.description,
        version = public.quiz_sets.version + 1,
        updated_at = now();

    v_q_idx := 0;
    for v_q in select * from jsonb_array_elements(coalesce(v_t -> 'questions', '[]'::jsonb)) loop
      insert into public.questions (id, quiz_set_id, prompt, explanation, sort_order)
      values ((v_q ->> 'id')::uuid, (v_t ->> 'id')::uuid, coalesce(v_q ->> 'prompt', ''), coalesce(v_q ->> 'explanation', ''), v_q_idx)
      on conflict (id) do update
      set prompt = excluded.prompt, explanation = excluded.explanation, sort_order = excluded.sort_order, updated_at = now();

      delete from public.question_options where question_id = (v_q ->> 'id')::uuid;
      select coalesce(array_agg(val::integer), '{}') into v_correct_indices
      from jsonb_array_elements_text(coalesce(v_q -> 'correctIndices', '[]'::jsonb)) as val;

      v_opt_idx := 0;
      for v_opt in select * from jsonb_array_elements(coalesce(v_q -> 'options', '[]'::jsonb)) loop
        insert into public.question_options (question_id, label, text, is_correct, sort_order)
        values ((v_q ->> 'id')::uuid, coalesce(v_opt ->> 'label', chr(65 + v_opt_idx)), coalesce(v_opt ->> 'text', ''), v_opt_idx = any(v_correct_indices), v_opt_idx);
        v_opt_idx := v_opt_idx + 1;
      end loop;
      v_q_idx := v_q_idx + 1;
    end loop;
  end loop;

  for v_vc in select * from jsonb_array_elements(coalesce(v_snap -> 'vocabCollections', '[]'::jsonb)) loop
    insert into public.vocab_collections (id, name, created_by)
    values ((v_vc ->> 'id')::uuid, coalesce(v_vc ->> 'name', 'Bộ từ'), v_actor)
    on conflict (id) do update set name = excluded.name, updated_at = now();
  end loop;

  for v_d in select * from jsonb_array_elements(v_snap -> 'vocabDecks') loop
    insert into public.vocab_decks (id, collection_id, name, description, target_language, created_by)
    values (
      (v_d ->> 'id')::uuid,
      nullif(v_d ->> 'collectionId', '')::uuid,
      coalesce(v_d ->> 'name', 'Bộ thẻ'),
      coalesce(v_d ->> 'description', ''),
      coalesce(v_d ->> 'targetLanguage', 'en-US'),
      v_actor
    )
    on conflict (id) do update
    set collection_id = excluded.collection_id,
        name = excluded.name,
        description = excluded.description,
        target_language = excluded.target_language,
        version = public.vocab_decks.version + 1,
        updated_at = now();

    v_c_idx := 0;
    for v_c in select * from jsonb_array_elements(coalesce(v_d -> 'cards', '[]'::jsonb)) loop
      insert into public.flashcards (
        id, deck_id, term, meaning, phonetic, part_of_speech,
        example, example_meaning, examples, image_url, note, sort_order
      ) values (
        (v_c ->> 'id')::uuid,
        (v_d ->> 'id')::uuid,
        coalesce(v_c ->> 'term', ''),
        coalesce(v_c ->> 'meaning', ''),
        coalesce(v_c ->> 'phonetic', ''),
        coalesce(v_c ->> 'partOfSpeech', ''),
        coalesce(v_c ->> 'example', ''),
        coalesce(v_c ->> 'exampleMeaning', ''),
        coalesce(v_c -> 'examples', '[]'::jsonb),
        coalesce(v_c ->> 'image', ''),
        coalesce(v_c ->> 'note', ''),
        v_c_idx
      )
      on conflict (id) do update
      set term = excluded.term,
          meaning = excluded.meaning,
          phonetic = excluded.phonetic,
          part_of_speech = excluded.part_of_speech,
          example = excluded.example,
          example_meaning = excluded.example_meaning,
          examples = excluded.examples,
          image_url = excluded.image_url,
          note = excluded.note,
          sort_order = excluded.sort_order,
          updated_at = now();
      v_c_idx := v_c_idx + 1;
    end loop;
  end loop;

  update public.backup_metadata set status = 'restored' where id = p_backup_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (v_actor, 'ADMIN_BACKUP_RESTORE', 'backup_metadata', p_backup_id::text, jsonb_build_object('mode', p_mode));

  return jsonb_build_object('restored', true, 'backup_id', p_backup_id, 'mode', p_mode);
end;
$$;

revoke all on function public.restore_backup_atomic(uuid, text, boolean) from public;
grant execute on function public.restore_backup_atomic(uuid, text, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. BUG-13: Audit Log Integrity (No client forgery of sensitive admin events)
-- -----------------------------------------------------------------------------
drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated
  with check (
    actor_user_id = auth.uid()
    and public.is_active_user()
    and action in ('CLIENT_PREFERENCE_UPDATE', 'CLIENT_PERSONAL_EXPORT')
  );
