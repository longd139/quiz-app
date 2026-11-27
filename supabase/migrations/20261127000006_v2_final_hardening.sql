-- =============================================================================
-- QUIZ APP V2.0 — FINAL HARDENING MIGRATION (BUG-20, BUG-21, BUG-23)
-- =============================================================================

-- 1. BUG-20: Trusted server-backed password change recommendation flag on profiles
alter table public.profiles
  add column if not exists password_change_recommended boolean not null default false;

update public.profiles
set password_change_recommended = true
where must_change_password = true
  and password_change_recommended = false;

-- 2. BUG-23: Consistent semester term normalization helper
create or replace function public.normalize_quiz_term(p_term text)
returns text
language plpgsql
immutable
as $$
declare
  v_clean text;
  v_num text;
begin
  v_clean := regexp_replace(coalesce(trim(p_term), ''), '\s+', ' ', 'g');
  if v_clean = '' or lower(v_clean) = 'chung' then
    return '';
  end if;

  if v_clean ~* '^k[yỳ]\s*[0-9]+$' then
    v_num := regexp_replace(v_clean, '^k[yỳ]\s*([0-9]+)$', '\1', 'i');
    return 'Kỳ ' || v_num;
  end if;

  return v_clean;
end;
$$;

-- Normalize existing quiz_collections.term values
update public.quiz_collections
set term = public.normalize_quiz_term(term)
where term is distinct from public.normalize_quiz_term(term);

-- 3. BUG-21: Preserve quiz_collections.term during restore_backup_atomic
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
  v_term text;
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
    v_term := public.normalize_quiz_term(v_col ->> 'term');
    insert into public.quiz_collections (id, name, term, description, created_by)
    values (
      (v_col ->> 'id')::uuid,
      coalesce(v_col ->> 'name', 'Bộ sưu tập'),
      v_term,
      coalesce(v_col ->> 'description', ''),
      v_actor
    )
    on conflict (id) do update
    set name = excluded.name,
        term = excluded.term,
        description = excluded.description,
        updated_at = now();
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
