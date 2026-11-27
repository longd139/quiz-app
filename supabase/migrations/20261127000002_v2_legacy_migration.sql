-- =============================================================================
-- Quiz App V2.0 — Legacy Data Migration (app_rooms JSONB -> Centralized Tables)
-- =============================================================================
-- Safe, idempotent, transaction-wrapped migration with dry-run support.
-- Does NOT drop public.app_rooms.
-- Does NOT expose room secrets in output.
-- =============================================================================

-- 1. Dry-run analysis function: inspect legacy rooms without writing anything
create or replace function public.analyze_legacy_rooms()
returns table (
  room_id uuid,
  updated_at timestamptz,
  quiz_collections_count integer,
  quiz_sets_count integer,
  questions_count integer,
  vocab_collections_count integer,
  vocab_decks_count integer,
  flashcards_count integer,
  history_count integer,
  activity_days_count integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.room_id,
    r.updated_at,
    coalesce(jsonb_array_length(r.data -> 'collections'), 0) as quiz_collections_count,
    coalesce(jsonb_array_length(r.data -> 'tests'), 0) as quiz_sets_count,
    coalesce((
      select sum(coalesce(jsonb_array_length(t -> 'questions'), 0))::integer
      from jsonb_array_elements(coalesce(r.data -> 'tests', '[]'::jsonb)) as t
    ), 0) as questions_count,
    coalesce(jsonb_array_length(r.data -> 'vocabCollections'), 0) as vocab_collections_count,
    coalesce(jsonb_array_length(r.data -> 'vocabDecks'), 0) as vocab_decks_count,
    coalesce((
      select sum(coalesce(jsonb_array_length(d -> 'cards'), 0))::integer
      from jsonb_array_elements(coalesce(r.data -> 'vocabDecks', '[]'::jsonb)) as d
    ), 0) as flashcards_count,
    coalesce(jsonb_array_length(r.data -> 'history'), 0) as history_count,
    coalesce((
      select count(*)::integer
      from jsonb_object_keys(coalesce(r.data -> 'activityLog', '{}'::jsonb))
    ), 0) as activity_days_count
  from public.app_rooms r
  order by r.updated_at desc;
$$;

-- 2. Idempotent migration for a single room (shared content + optional personal data owner)
create or replace function public.migrate_legacy_room(
  p_room_id uuid,
  p_owner_user_id uuid default null,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
  v_col jsonb;
  v_test jsonb;
  v_q jsonb;
  v_opt jsonb;
  v_vcol jsonb;
  v_deck jsonb;
  v_card jsonb;
  v_hist jsonb;
  v_new_col_id uuid;
  v_new_set_id uuid;
  v_new_q_id uuid;
  v_new_vcol_id uuid;
  v_new_deck_id uuid;
  v_new_card_id uuid;
  v_new_attempt_id uuid;
  v_idx integer;
  v_q_idx integer;
  v_opt_idx integer;
  v_d_idx integer;
  v_c_idx integer;
  v_correct_indices integer[];
  v_stat_key text;
  v_stat_val jsonb;
  v_act_key text;
  v_act_val integer;
  v_counts jsonb := '{}'::jsonb;
  v_imported_sets integer := 0;
  v_imported_questions integer := 0;
  v_imported_decks integer := 0;
  v_imported_cards integer := 0;
  v_imported_history integer := 0;
begin
  select data into v_data from public.app_rooms where room_id = p_room_id;
  if v_data is null then
    raise exception 'Legacy room % not found', p_room_id;
  end if;

  if p_dry_run then
    select jsonb_build_object(
      'dry_run', true,
      'room_id', p_room_id,
      'owner_user_id', p_owner_user_id,
      'quiz_collections', coalesce(jsonb_array_length(v_data -> 'collections'), 0),
      'quiz_sets', coalesce(jsonb_array_length(v_data -> 'tests'), 0),
      'vocab_collections', coalesce(jsonb_array_length(v_data -> 'vocabCollections'), 0),
      'vocab_decks', coalesce(jsonb_array_length(v_data -> 'vocabDecks'), 0),
      'history', coalesce(jsonb_array_length(v_data -> 'history'), 0)
    ) into v_counts;
    return v_counts;
  end if;

  -- A. Migrate Quiz Collections
  v_idx := 0;
  for v_col in select * from jsonb_array_elements(coalesce(v_data -> 'collections', '[]'::jsonb)) loop
    select new_id into v_new_col_id
    from public.legacy_id_mapping
    where legacy_room_id = p_room_id and entity_type = 'quiz_collection' and legacy_id = coalesce(v_col ->> 'id', v_idx::text);

    if v_new_col_id is null then
      v_new_col_id := gen_random_uuid();
      insert into public.quiz_collections (id, name, sort_order, created_by, created_at)
      values (
        v_new_col_id,
        coalesce(nullif(trim(v_col ->> 'name'), ''), 'Bộ sưu tập'),
        v_idx,
        p_owner_user_id,
        coalesce((v_col ->> 'createdAt')::timestamptz, now())
      );
      insert into public.legacy_id_mapping (legacy_room_id, entity_type, legacy_id, new_id)
      values (p_room_id, 'quiz_collection', coalesce(v_col ->> 'id', v_idx::text), v_new_col_id);
    end if;
    v_idx := v_idx + 1;
  end loop;

  -- B. Migrate Quiz Sets & Questions
  for v_test in select * from jsonb_array_elements(coalesce(v_data -> 'tests', '[]'::jsonb)) loop
    select new_id into v_new_set_id
    from public.legacy_id_mapping
    where legacy_room_id = p_room_id and entity_type = 'quiz_set' and legacy_id = coalesce(v_test ->> 'id', '');

    if v_new_set_id is null then
      select new_id into v_new_col_id
      from public.legacy_id_mapping
      where legacy_room_id = p_room_id and entity_type = 'quiz_collection' and legacy_id = coalesce(v_test ->> 'collectionId', '');

      v_new_set_id := gen_random_uuid();
      insert into public.quiz_sets (id, collection_id, name, created_by, created_at, updated_at)
      values (
        v_new_set_id,
        v_new_col_id,
        coalesce(nullif(trim(v_test ->> 'name'), ''), 'Bài thi'),
        p_owner_user_id,
        coalesce((v_test ->> 'createdAt')::timestamptz, now()),
        coalesce((v_test ->> 'updatedAt')::timestamptz, now())
      );
      insert into public.legacy_id_mapping (legacy_room_id, entity_type, legacy_id, new_id)
      values (p_room_id, 'quiz_set', coalesce(v_test ->> 'id', v_new_set_id::text), v_new_set_id);
      v_imported_sets := v_imported_sets + 1;

      v_q_idx := 0;
      for v_q in select * from jsonb_array_elements(coalesce(v_test -> 'questions', '[]'::jsonb)) loop
        v_new_q_id := gen_random_uuid();
        insert into public.questions (id, quiz_set_id, prompt, explanation, sort_order)
        values (
          v_new_q_id,
          v_new_set_id,
          coalesce(v_q ->> 'prompt', ''),
          coalesce(v_q ->> 'explanation', ''),
          v_q_idx
        );
        insert into public.legacy_id_mapping (legacy_room_id, entity_type, legacy_id, new_id)
        values (p_room_id, 'question', coalesce(v_q ->> 'id', v_new_q_id::text), v_new_q_id)
        on conflict do nothing;
        v_imported_questions := v_imported_questions + 1;

        select array_agg(val::integer) into v_correct_indices
        from jsonb_array_elements_text(coalesce(v_q -> 'correctIndices', '[]'::jsonb)) as val;

        v_opt_idx := 0;
        for v_opt in select * from jsonb_array_elements(coalesce(v_q -> 'options', '[]'::jsonb)) loop
          insert into public.question_options (question_id, label, text, is_correct, sort_order)
          values (
            v_new_q_id,
            coalesce(v_opt ->> 'label', chr(65 + v_opt_idx)),
            coalesce(v_opt ->> 'text', ''),
            coalesce(v_opt_idx = any(v_correct_indices), false),
            v_opt_idx
          );
          v_opt_idx := v_opt_idx + 1;
        end loop;
        v_q_idx := v_q_idx + 1;
      end loop;
    end if;
  end loop;

  -- C. Migrate Vocab Collections
  v_idx := 0;
  for v_vcol in select * from jsonb_array_elements(coalesce(v_data -> 'vocabCollections', '[]'::jsonb)) loop
    select new_id into v_new_vcol_id
    from public.legacy_id_mapping
    where legacy_room_id = p_room_id and entity_type = 'vocab_collection' and legacy_id = coalesce(v_vcol ->> 'id', v_idx::text);

    if v_new_vcol_id is null then
      v_new_vcol_id := gen_random_uuid();
      insert into public.vocab_collections (id, name, sort_order, created_by, created_at)
      values (
        v_new_vcol_id,
        coalesce(nullif(trim(v_vcol ->> 'name'), ''), 'Bộ từ vựng'),
        v_idx,
        p_owner_user_id,
        coalesce((v_vcol ->> 'createdAt')::timestamptz, now())
      );
      insert into public.legacy_id_mapping (legacy_room_id, entity_type, legacy_id, new_id)
      values (p_room_id, 'vocab_collection', coalesce(v_vcol ->> 'id', v_idx::text), v_new_vcol_id);
    end if;
    v_idx := v_idx + 1;
  end loop;

  -- D. Migrate Vocab Decks & Flashcards
  v_d_idx := 0;
  for v_deck in select * from jsonb_array_elements(coalesce(v_data -> 'vocabDecks', '[]'::jsonb)) loop
    select new_id into v_new_deck_id
    from public.legacy_id_mapping
    where legacy_room_id = p_room_id and entity_type = 'vocab_deck' and legacy_id = coalesce(v_deck ->> 'id', '');

    if v_new_deck_id is null then
      select new_id into v_new_vcol_id
      from public.legacy_id_mapping
      where legacy_room_id = p_room_id and entity_type = 'vocab_collection' and legacy_id = coalesce(v_deck ->> 'collectionId', '');

      v_new_deck_id := gen_random_uuid();
      insert into public.vocab_decks (id, collection_id, name, description, target_language, created_by, created_at, updated_at)
      values (
        v_new_deck_id,
        v_new_vcol_id,
        coalesce(nullif(trim(v_deck ->> 'name'), ''), 'Bộ thẻ'),
        coalesce(v_deck ->> 'description', ''),
        coalesce(v_deck ->> 'targetLanguage', 'en-US'),
        p_owner_user_id,
        coalesce((v_deck ->> 'createdAt')::timestamptz, now()),
        coalesce((v_deck ->> 'updatedAt')::timestamptz, now())
      );
      insert into public.legacy_id_mapping (legacy_room_id, entity_type, legacy_id, new_id)
      values (p_room_id, 'vocab_deck', coalesce(v_deck ->> 'id', v_new_deck_id::text), v_new_deck_id);
      v_imported_decks := v_imported_decks + 1;

      v_c_idx := 0;
      for v_card in select * from jsonb_array_elements(coalesce(v_deck -> 'cards', '[]'::jsonb)) loop
        v_new_card_id := gen_random_uuid();
        insert into public.flashcards (
          id, deck_id, term, meaning, phonetic, part_of_speech,
          example, example_meaning, examples, image_url, note, sort_order
        ) values (
          v_new_card_id,
          v_new_deck_id,
          coalesce(v_card ->> 'term', ''),
          coalesce(v_card ->> 'meaning', ''),
          coalesce(v_card ->> 'phonetic', ''),
          coalesce(v_card ->> 'partOfSpeech', ''),
          coalesce(v_card ->> 'example', ''),
          coalesce(v_card ->> 'exampleMeaning', ''),
          coalesce(v_card -> 'examples', '[]'::jsonb),
          coalesce(v_card ->> 'image', ''),
          coalesce(v_card ->> 'note', ''),
          v_c_idx
        );
        insert into public.legacy_id_mapping (legacy_room_id, entity_type, legacy_id, new_id)
        values (p_room_id, 'flashcard', coalesce(v_card ->> 'id', v_new_card_id::text), v_new_card_id)
        on conflict do nothing;
        v_imported_cards := v_imported_cards + 1;
        v_c_idx := v_c_idx + 1;
      end loop;
    end if;
    v_d_idx := v_d_idx + 1;
  end loop;

  -- E. Migrate Personal Learning Data ONLY if p_owner_user_id is explicitly provided
  if p_owner_user_id is not null then
    for v_hist in select * from jsonb_array_elements(coalesce(v_data -> 'history', '[]'::jsonb)) loop
      select new_id into v_new_attempt_id
      from public.legacy_id_mapping
      where legacy_room_id = p_room_id and entity_type = 'quiz_attempt' and legacy_id = coalesce(v_hist ->> 'id', '');

      if v_new_attempt_id is null then
        select new_id into v_new_set_id
        from public.legacy_id_mapping
        where legacy_room_id = p_room_id and entity_type = 'quiz_set' and legacy_id = coalesce(v_hist ->> 'testId', '');

        v_new_attempt_id := gen_random_uuid();
        insert into public.quiz_attempts (
          id, user_id, quiz_set_id, test_name, mode,
          total_questions, correct_count, score_percent, duration_seconds,
          started_at, completed_at
        ) values (
          v_new_attempt_id,
          p_owner_user_id,
          v_new_set_id,
          coalesce(v_hist ->> 'testName', 'Bài thi'),
          case when (v_hist ->> 'mode') = 'exam' then 'exam' else 'practice' end,
          coalesce((v_hist ->> 'totalQuestions')::integer, 0),
          coalesce((v_hist ->> 'correctCount')::integer, 0),
          coalesce((v_hist ->> 'score')::numeric, 0),
          coalesce((v_hist ->> 'duration')::integer, 0),
          coalesce((v_hist ->> 'startedAt')::timestamptz, now()),
          coalesce((v_hist ->> 'completedAt')::timestamptz, now())
        );
        insert into public.legacy_id_mapping (legacy_room_id, entity_type, legacy_id, new_id)
        values (p_room_id, 'quiz_attempt', coalesce(v_hist ->> 'id', v_new_attempt_id::text), v_new_attempt_id);
        v_imported_history := v_imported_history + 1;
      end if;
    end loop;

    -- Vocab stats
    for v_stat_key, v_stat_val in select * from jsonb_each(coalesce(v_data -> 'vocabStats', '{}'::jsonb)) loop
      select new_id into v_new_card_id
      from public.legacy_id_mapping
      where legacy_room_id = p_room_id and entity_type = 'flashcard' and legacy_id = v_stat_key;

      if v_new_card_id is not null then
        insert into public.vocab_learning_progress (
          user_id, flashcard_id, mastered, review_count, correct_count, wrong_count, last_reviewed_at
        ) values (
          p_owner_user_id,
          v_new_card_id,
          coalesce((v_stat_val ->> 'mastered')::boolean, false),
          coalesce((v_stat_val ->> 'reviewCount')::integer, 0),
          coalesce((v_stat_val ->> 'correctCount')::integer, 0),
          coalesce((v_stat_val ->> 'wrongCount')::integer, 0),
          (v_stat_val ->> 'lastReviewed')::timestamptz
        )
        on conflict (user_id, flashcard_id) do nothing;
      end if;
    end loop;

    -- Activity log
    for v_act_key, v_act_val in select * from jsonb_each_text(coalesce(v_data -> 'activityLog', '{}'::jsonb)) loop
      insert into public.daily_learning_activity (user_id, activity_date, activity_count)
      values (p_owner_user_id, v_act_key::date, greatest(0, v_act_val::integer))
      on conflict (user_id, activity_date) do nothing;
    end loop;

    -- Moosk rewards
    if (v_data ->> 'mooskCount') is not null then
      insert into public.learning_rewards (user_id, moosk_count)
      values (p_owner_user_id, greatest(0, (v_data ->> 'mooskCount')::integer))
      on conflict (user_id) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'dry_run', false,
    'room_id', p_room_id,
    'owner_user_id', p_owner_user_id,
    'imported_sets', v_imported_sets,
    'imported_questions', v_imported_questions,
    'imported_decks', v_imported_decks,
    'imported_cards', v_imported_cards,
    'imported_history', v_imported_history
  );
end;
$$;

-- 3. Cutover helper: revoke legacy RPCs so old clients cannot write to app_rooms
create or replace function public.cutover_disable_legacy_rooms()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from pg_proc where proname = 'create_app_room') then
    revoke all on function public.create_app_room(text) from anon, authenticated;
  end if;
  if exists (select 1 from pg_proc where proname = 'get_app_room') then
    revoke all on function public.get_app_room(text) from anon, authenticated;
  end if;
  if exists (select 1 from pg_proc where proname = 'upsert_app_room') then
    revoke all on function public.upsert_app_room(text, jsonb) from anon, authenticated;
  end if;
  if exists (select 1 from pg_proc where proname = 'get_room_id_by_secret') then
    revoke all on function public.get_room_id_by_secret(text) from anon, authenticated;
  end if;
end;
$$;

revoke all on function public.analyze_legacy_rooms() from public, anon, authenticated;
revoke all on function public.migrate_legacy_room(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.cutover_disable_legacy_rooms() from public, anon, authenticated;
