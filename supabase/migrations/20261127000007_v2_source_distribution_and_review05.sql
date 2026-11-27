-- =============================================================================
-- QUIZ APP V2.0 — SECURE SOURCE CODE DISTRIBUTION + REVIEW 05 PATCHES (BUG-25, BUG-27)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tables: source_packages, source_access_codes, source_redemptions, rate limits
-- -----------------------------------------------------------------------------
create table if not exists public.source_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  instructions text not null default '',
  category text,
  collection_id uuid references public.quiz_collections(id) on delete set null,
  version text,
  delivery_type text not null check (delivery_type in ('FILE', 'LINK')),
  storage_path text,
  external_url text,
  file_name text,
  file_size bigint check (file_size is null or file_size >= 0),
  mime_type text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_source_pkg_delivery_fields check (
    (
      delivery_type = 'FILE'
      and coalesce(external_url, '') = ''
      and (status <> 'ACTIVE' or (coalesce(trim(storage_path), '') <> '' and coalesce(trim(file_name), '') <> ''))
    )
    or
    (
      delivery_type = 'LINK'
      and coalesce(storage_path, '') = ''
      and (status <> 'ACTIVE' or (coalesce(trim(external_url), '') ~* '^https://'))
    )
  )
);

create index if not exists idx_source_packages_status on public.source_packages(status);
create index if not exists idx_source_packages_created_at on public.source_packages(created_at desc);

drop trigger if exists trg_source_packages_updated_at on public.source_packages;
create trigger trg_source_packages_updated_at
  before update on public.source_packages
  for each row execute function public.set_updated_at();

create table if not exists public.source_access_codes (
  id uuid primary key default gen_random_uuid(),
  source_package_id uuid not null references public.source_packages(id) on delete cascade,
  code_label text not null default '',
  code_hash text not null,
  code_lookup_digest text not null unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  max_redemptions_per_user integer check (max_redemptions_per_user is null or max_redemptions_per_user > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_source_access_codes_pkg on public.source_access_codes(source_package_id);
create index if not exists idx_source_access_codes_status on public.source_access_codes(status);

create table if not exists public.source_redemptions (
  id uuid primary key default gen_random_uuid(),
  source_package_id uuid not null references public.source_packages(id) on delete restrict,
  access_code_id uuid not null references public.source_access_codes(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  operation_id text not null,
  redeemed_at timestamptz not null default now(),
  status text not null default 'SUCCESS' check (status in ('SUCCESS')),
  unique (user_id, operation_id)
);

create index if not exists idx_source_redemptions_user on public.source_redemptions(user_id, redeemed_at desc);
create index if not exists idx_source_redemptions_pkg on public.source_redemptions(source_package_id, redeemed_at desc);
create index if not exists idx_source_redemptions_code on public.source_redemptions(access_code_id, user_id);

create table if not exists public.source_redeem_rate_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Row Level Security & Strict Grants
-- -----------------------------------------------------------------------------
alter table public.source_packages enable row level security;
alter table public.source_access_codes enable row level security;
alter table public.source_redemptions enable row level security;
alter table public.source_redeem_rate_limits enable row level security;

revoke all on public.source_packages from public, anon;
revoke all on public.source_access_codes from public, anon, authenticated;
revoke all on public.source_redemptions from public, anon;
revoke all on public.source_redeem_rate_limits from public, anon, authenticated;

-- Admin can manage source_packages; regular users CANNOT read unredeemed packages directly
drop policy if exists source_packages_admin_all on public.source_packages;
create policy source_packages_admin_all
  on public.source_packages for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Users can only read their own redemption rows; only trusted server (service_role) inserts
drop policy if exists source_redemptions_select_own_or_admin on public.source_redemptions;
create policy source_redemptions_select_own_or_admin
  on public.source_redemptions for select to authenticated
  using (
    (user_id = auth.uid() and public.is_active_user())
    or public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 3. Private Storage Bucket: source-packages
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-packages',
  'source-packages',
  false,
  20971520,
  array['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Ensure no public or regular-user direct access to storage.objects in source-packages
drop policy if exists source_packages_bucket_no_direct_read on storage.objects;
-- By default with RLS enabled on storage.objects, omitting SELECT/INSERT/UPDATE/DELETE policies
-- for anon/authenticated denies all direct client access; service_role bypasses RLS.

-- -----------------------------------------------------------------------------
-- 4. Atomic Redemption RPC (called exclusively by trusted redeem-source Edge Function)
-- -----------------------------------------------------------------------------
create or replace function public.redeem_source_package_atomic(
  p_user_id uuid,
  p_access_code_id uuid,
  p_operation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.source_access_codes;
  v_pkg public.source_packages;
  v_existing public.source_redemptions;
  v_redemption public.source_redemptions;
  v_user_count integer;
begin
  if p_user_id is null or p_access_code_id is null or coalesce(trim(p_operation_id), '') = '' then
    raise exception 'INVALID_INPUT: Missing redemption parameters.';
  end if;

  -- 1. Idempotency check first
  select * into v_existing
  from public.source_redemptions
  where user_id = p_user_id and operation_id = p_operation_id;

  if found then
    select * into v_pkg from public.source_packages where id = v_existing.source_package_id;
    if not found or v_pkg.status <> 'ACTIVE' then
      raise exception 'PACKAGE_INACTIVE: Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.';
    end if;
    return jsonb_build_object(
      'idempotent', true,
      'redemption_id', v_existing.id,
      'redeemed_at', v_existing.redeemed_at,
      'package', jsonb_build_object(
        'id', v_pkg.id,
        'name', v_pkg.name,
        'description', v_pkg.description,
        'instructions', v_pkg.instructions,
        'category', v_pkg.category,
        'version', v_pkg.version,
        'delivery_type', v_pkg.delivery_type,
        'file_name', v_pkg.file_name,
        'file_size', v_pkg.file_size,
        'mime_type', v_pkg.mime_type,
        'storage_path', v_pkg.storage_path,
        'external_url', v_pkg.external_url
      )
    );
  end if;

  -- 2. Lock access code row to prevent concurrent over-redemption
  select * into v_code
  from public.source_access_codes
  where id = p_access_code_id
  for update;

  if not found or v_code.status <> 'ACTIVE' then
    raise exception 'CODE_INVALID: Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.';
  end if;

  if v_code.expires_at is not null and v_code.expires_at <= now() then
    raise exception 'CODE_EXPIRED: Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.';
  end if;

  if v_code.max_redemptions is not null and v_code.redemption_count >= v_code.max_redemptions then
    raise exception 'LIMIT_REACHED: Bạn đã đạt giới hạn nhận SRC.';
  end if;

  -- 3. Verify package is ACTIVE
  select * into v_pkg
  from public.source_packages
  where id = v_code.source_package_id;

  if not found or v_pkg.status <> 'ACTIVE' then
    raise exception 'PACKAGE_INACTIVE: Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.';
  end if;

  -- 4. Per-user redemption limit check
  if v_code.max_redemptions_per_user is not null then
    select count(*) into v_user_count
    from public.source_redemptions
    where user_id = p_user_id and access_code_id = v_code.id;

    if v_user_count >= v_code.max_redemptions_per_user then
      raise exception 'USER_LIMIT_REACHED: Bạn đã đạt giới hạn nhận SRC.';
    end if;
  end if;

  -- 5. Record redemption & increment counter atomically
  insert into public.source_redemptions (source_package_id, access_code_id, user_id, operation_id, status)
  values (v_pkg.id, v_code.id, p_user_id, p_operation_id, 'SUCCESS')
  returning * into v_redemption;

  update public.source_access_codes
  set redemption_count = redemption_count + 1
  where id = v_code.id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_user_id,
    'SOURCE_REDEEM_SUCCESS',
    'source_package',
    v_pkg.id::text,
    jsonb_build_object(
      'package_id', v_pkg.id,
      'access_code_id', v_code.id,
      'redemption_id', v_redemption.id
    )
  );

  return jsonb_build_object(
    'idempotent', false,
    'redemption_id', v_redemption.id,
    'redeemed_at', v_redemption.redeemed_at,
    'package', jsonb_build_object(
      'id', v_pkg.id,
      'name', v_pkg.name,
      'description', v_pkg.description,
      'instructions', v_pkg.instructions,
      'category', v_pkg.category,
      'version', v_pkg.version,
      'delivery_type', v_pkg.delivery_type,
      'file_name', v_pkg.file_name,
      'file_size', v_pkg.file_size,
      'mime_type', v_pkg.mime_type,
      'storage_path', v_pkg.storage_path,
      'external_url', v_pkg.external_url
    )
  );
end;
$$;

revoke all on function public.redeem_source_package_atomic(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_source_package_atomic(uuid, uuid, text) to service_role;

-- -----------------------------------------------------------------------------
-- 5. BUG-25 & BUG-27: Disable unsafe replace restore; preserve existing term when backup omits term
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
  v_has_term boolean;
  v_term text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  if p_mode <> 'merge' then
    raise exception 'Chế độ khôi phục "%" đã bị vô hiệu hóa để bảo vệ dữ liệu học tập cá nhân. Chỉ hỗ trợ chế độ merge.', p_mode;
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

  for v_col in select * from jsonb_array_elements(coalesce(v_snap -> 'collections', '[]'::jsonb)) loop
    v_has_term := (v_col ? 'term') and (v_col ->> 'term' is not null);
    v_term := case when v_has_term then public.normalize_quiz_term(v_col ->> 'term') else '' end;

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
        term = case when v_has_term then excluded.term else public.quiz_collections.term end,
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
