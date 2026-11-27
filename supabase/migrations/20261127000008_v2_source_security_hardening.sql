-- =============================================================================
-- QUIZ APP V2.0 — SRC SECURITY HARDENING (BUG-29, BUG-30, BUG-31, BUG-34)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BUG-31: Restrict direct REST mutations on source_packages & strengthen constraints
-- -----------------------------------------------------------------------------
alter table public.source_packages
  add column if not exists lock_version integer not null default 1 check (lock_version >= 1);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_source_pkg_storage_path_ownership'
  ) then
    alter table public.source_packages
      add constraint chk_source_pkg_storage_path_ownership check (
        delivery_type <> 'FILE'
        or storage_path is null
        or storage_path ~ ('^' || id::text || '/')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_source_access_codes_id_pkg'
  ) then
    alter table public.source_access_codes
      add constraint uq_source_access_codes_id_pkg unique (id, source_package_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_source_redemptions_code_pkg'
  ) then
    alter table public.source_redemptions
      add constraint fk_source_redemptions_code_pkg
      foreign key (access_code_id, source_package_id)
      references public.source_access_codes(id, source_package_id)
      on delete restrict;
  end if;
end $$;

-- Remove FOR ALL policy; only trusted server (service_role) may mutate source_packages
drop policy if exists source_packages_admin_all on public.source_packages;
drop policy if exists source_packages_admin_select on public.source_packages;
create policy source_packages_admin_select
  on public.source_packages for select to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.source_packages from public, anon, authenticated;
revoke all on public.source_access_codes from public, anon, authenticated;
revoke insert, update, delete on public.source_redemptions from public, anon, authenticated;
revoke all on public.source_redeem_rate_limits from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. BUG-29: Atomic Database-Backed Rate Limiting RPCs
-- -----------------------------------------------------------------------------
create or replace function public.reserve_source_redeem_attempt_atomic(
  p_user_id uuid,
  p_max_attempts integer default 5,
  p_window_seconds integer default 300,
  p_cooldown_seconds integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rl public.source_redeem_rate_limits;
  v_now timestamptz := now();
  v_attempts integer;
  v_window_start timestamptz;
  v_blocked_until timestamptz;
  v_retry_after integer;
begin
  if p_user_id is null then
    raise exception 'INVALID_USER';
  end if;

  insert into public.source_redeem_rate_limits (user_id, failed_attempts, window_started_at, updated_at)
  values (p_user_id, 0, v_now, v_now)
  on conflict (user_id) do nothing;

  select * into v_rl
  from public.source_redeem_rate_limits
  where user_id = p_user_id
  for update;

  if v_rl.blocked_until is not null and v_rl.blocked_until > v_now then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_rl.blocked_until - v_now)))::integer);
    return jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', v_retry_after,
      'failed_attempts', v_rl.failed_attempts
    );
  end if;

  if (v_rl.blocked_until is not null and v_rl.blocked_until <= v_now)
     or (v_rl.window_started_at < v_now - make_interval(secs => p_window_seconds)) then
    v_attempts := 1;
    v_window_start := v_now;
  else
    v_attempts := v_rl.failed_attempts + 1;
    v_window_start := v_rl.window_started_at;
  end if;

  if v_attempts >= p_max_attempts then
    v_blocked_until := v_now + make_interval(secs => p_cooldown_seconds);
  else
    v_blocked_until := null;
  end if;

  update public.source_redeem_rate_limits
  set failed_attempts = v_attempts,
      window_started_at = v_window_start,
      blocked_until = v_blocked_until,
      updated_at = v_now
  where user_id = p_user_id;

  return jsonb_build_object(
    'allowed', true,
    'failed_attempts', v_attempts,
    'blocked_until', v_blocked_until
  );
end;
$$;

create or replace function public.finalize_source_redeem_attempt_atomic(
  p_user_id uuid,
  p_success boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rl public.source_redeem_rate_limits;
  v_next integer;
begin
  if p_user_id is null or not p_success then
    return;
  end if;

  select * into v_rl
  from public.source_redeem_rate_limits
  where user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  -- Release only the 1 slot reserved by this successful request; do not wipe concurrent failures
  v_next := greatest(0, v_rl.failed_attempts - 1);
  update public.source_redeem_rate_limits
  set failed_attempts = v_next,
      blocked_until = case when v_next = 0 then null else blocked_until end,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.reserve_source_redeem_attempt_atomic(uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_source_redeem_attempt_atomic(uuid, integer, integer, integer) to service_role;

revoke all on function public.finalize_source_redeem_attempt_atomic(uuid, boolean) from public, anon, authenticated;
grant execute on function public.finalize_source_redeem_attempt_atomic(uuid, boolean) to service_role;

-- -----------------------------------------------------------------------------
-- 3. BUG-30: Transactional Access Code Rotation RPC
-- -----------------------------------------------------------------------------
create or replace function public.rotate_source_access_code_atomic(
  p_actor_id uuid,
  p_package_id uuid,
  p_old_code_id uuid,
  p_code_label text,
  p_code_hash text,
  p_lookup_digest text,
  p_expires_at timestamptz default null,
  p_max_redemptions integer default null,
  p_max_per_user integer default null,
  p_mode text default 'random'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.profiles;
  v_pkg public.source_packages;
  v_old public.source_access_codes;
  v_new public.source_access_codes;
  v_now timestamptz := now();
begin
  -- 1. Verify actor is ACTIVE ADMIN without pending password change
  select * into v_actor from public.profiles where id = p_actor_id;
  if not found or v_actor.role <> 'ADMIN' or v_actor.status <> 'ACTIVE' or v_actor.must_change_password then
    raise exception 'FORBIDDEN: Admin privileges required.';
  end if;

  -- 2. Consistent lock order: source_packages -> source_access_codes
  select * into v_pkg
  from public.source_packages
  where id = p_package_id
  for update;

  if not found then
    raise exception 'PACKAGE_NOT_FOUND: Không tìm thấy gói SRC.';
  end if;

  select * into v_old
  from public.source_access_codes
  where id = p_old_code_id
  for update;

  if not found then
    raise exception 'CODE_NOT_FOUND: Không tìm thấy mã truy cập cần xoay.';
  end if;

  if v_old.source_package_id <> p_package_id then
    raise exception 'CODE_PACKAGE_MISMATCH: Mã truy cập không thuộc gói SRC này.';
  end if;

  if v_old.status <> 'ACTIVE' then
    raise exception 'CODE_ALREADY_REVOKED: Mã truy cập đã bị thu hồi trước đó.';
  end if;

  if p_max_redemptions is not null and p_max_redemptions <= 0 then
    raise exception 'INVALID_LIMIT: Giới hạn lượt nhận phải lớn hơn 0.';
  end if;

  if p_max_per_user is not null and p_max_per_user <= 0 then
    raise exception 'INVALID_LIMIT: Giới hạn mỗi tài khoản phải lớn hơn 0.';
  end if;

  -- 3. Insert new code first (duplicate digest rolls back entire transaction cleanly)
  insert into public.source_access_codes (
    source_package_id, code_label, code_hash, code_lookup_digest,
    status, expires_at, max_redemptions, max_redemptions_per_user, created_by
  ) values (
    p_package_id, p_code_label, p_code_hash, p_lookup_digest,
    'ACTIVE', p_expires_at, p_max_redemptions, p_max_per_user, p_actor_id
  )
  returning * into v_new;

  -- 4. Revoke old code inside same transaction
  update public.source_access_codes
  set status = 'REVOKED',
      revoked_at = v_now
  where id = p_old_code_id;

  -- 5. Write trusted audit events
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values
    (p_actor_id, 'ADMIN_SOURCE_CODE_REVOKE', 'source_access_code', p_old_code_id::text,
      jsonb_build_object('package_id', p_package_id, 'reason', 'rotate')),
    (p_actor_id, 'ADMIN_SOURCE_CODE_CREATE', 'source_access_code', v_new.id::text,
      jsonb_build_object('package_id', p_package_id, 'mode', p_mode, 'rotated_from', p_old_code_id));

  return jsonb_build_object(
    'new_code', jsonb_build_object(
      'id', v_new.id,
      'source_package_id', v_new.source_package_id,
      'code_label', v_new.code_label,
      'status', v_new.status,
      'expires_at', v_new.expires_at,
      'max_redemptions', v_new.max_redemptions,
      'redemption_count', v_new.redemption_count,
      'max_redemptions_per_user', v_new.max_redemptions_per_user,
      'created_at', v_new.created_at
    ),
    'revoked_code_id', p_old_code_id
  );
end;
$$;

revoke all on function public.rotate_source_access_code_atomic(uuid, uuid, uuid, text, text, text, timestamptz, integer, integer, text) from public, anon, authenticated;
grant execute on function public.rotate_source_access_code_atomic(uuid, uuid, uuid, text, text, text, timestamptz, integer, integer, text) to service_role;

-- -----------------------------------------------------------------------------
-- 4. BUG-34: Concurrency-Safe Idempotent Redemption RPC
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
  v_profile public.profiles;
  v_code public.source_access_codes;
  v_pkg public.source_packages;
  v_existing public.source_redemptions;
  v_redemption public.source_redemptions;
  v_user_count integer;
begin
  if p_user_id is null or p_access_code_id is null or coalesce(trim(p_operation_id), '') = '' then
    raise exception 'INVALID_INPUT: Missing redemption parameters.';
  end if;

  -- Serialize concurrent requests sharing the same (user_id, operation_id)
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_operation_id, 0));

  -- 1. Verify user inside transaction
  select * into v_profile from public.profiles where id = p_user_id;
  if not found or v_profile.status <> 'ACTIVE' or v_profile.must_change_password then
    raise exception 'USER_FORBIDDEN: Tài khoản chưa được phép thực hiện thao tác này.';
  end if;

  -- 2. Idempotency check under advisory lock
  select * into v_existing
  from public.source_redemptions
  where user_id = p_user_id and operation_id = p_operation_id;

  if found then
    if v_existing.access_code_id <> p_access_code_id then
      raise exception 'OPERATION_CONFLICT: Mã thao tác đã được sử dụng cho một mã khác.';
    end if;

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

  -- 3. Consistent lock order: source_access_codes -> source_packages (validate code -> package)
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

  select * into v_pkg
  from public.source_packages
  where id = v_code.source_package_id
  for update;

  if not found or v_pkg.status <> 'ACTIVE' then
    raise exception 'PACKAGE_INACTIVE: Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.';
  end if;

  -- 4. Per-user limit check
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
