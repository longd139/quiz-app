-- =============================================================
-- Quiz Luyện Tập — Supabase schema (đồng bộ cloud thay GitHub Gist)
-- Chạy file này trong Supabase SQL Editor.
--
-- Mô hình: 1 phòng = 1 document jsonb. Các thiết bị cùng một "secret"
-- nối chung 1 phòng, đồng bộ realtime.
--
-- Bảo mật: RLS + Realtime RLS-aware.
--   - Direct table bị revoke khỏi anon/authenticated.
--   - Đọc/ghi qua security-definer RPC gated bởi secret.
--   - Realtime: policy SELECT so `auth.jwt()->>'room_secret' = secret`.
--     Client có JWT (do Edge Function sign) với claim `room_secret`
--     → chỉ nhận realtime đúng phòng của mình.
-- =============================================================

create extension if not exists "pgcrypto" with schema extensions;

-- ---------------------------------------------------------------------
-- 1) Bảng lưu trữ
-- ---------------------------------------------------------------------
create table if not exists public.app_rooms (
  room_id    uuid primary key default gen_random_uuid(),
  secret     text not null unique,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.app_rooms.secret is 'Mã phòng/join secret. Chỉ những thiết bị biết secret mới truy cập được.';

-- Chặn anon/authenticated truy cập bảng trực tiếp (tất cả đi qua RPC).
-- Vẫn grant SELECT để Realtime (RLS-aware) có thể phân phát—nhưng chỉ đúng
-- row thỏa policy bên dưới (có JWT claim room_secret).
revoke all on table public.app_rooms from anon, authenticated;
grant select on table public.app_rooms to anon;

-- Bật RLS
alter table public.app_rooms enable row level security;

-- Policy: chỉ đọc được row mà JWT của mình khớp secret (realtime delivery).
drop policy if exists "room_select_by_claim" on public.app_rooms;
create policy "room_select_by_claim" on public.app_rooms
  for select
  using ((auth.jwt() ->> 'room_secret') = secret);

-- Cho Realtime thấy toàn bộ row để broadcast thay đổi (replica identity full)
alter table public.app_rooms replica identity full;

-- ---------------------------------------------------------------------
-- 2) RPC — security definer, gated bởi secret (không lộ row phòng khác)
-- ---------------------------------------------------------------------
create or replace function public.create_app_room(p_secret text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.app_rooms (secret)
  values (p_secret)
  on conflict (secret) do nothing
  returning room_id into v_id;

  if v_id is null then
    select room_id into v_id from public.app_rooms where secret = p_secret;
  end if;

  return v_id;
end $$;

create or replace function public.get_app_room(p_secret text)
returns table (room_id uuid, data jsonb, updated_at timestamptz)
language sql security definer stable set search_path = public as $$
  select r.room_id, r.data::jsonb, r.updated_at
  from public.app_rooms r
  where r.secret = p_secret
  limit 1;
$$;

create or replace function public.upsert_app_room(p_secret text, p_data jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.app_rooms
     set data = p_data, updated_at = now()
   where secret = p_secret;

  if not found then
    insert into public.app_rooms (secret, data, updated_at)
    values (p_secret, p_data, now());
  end if;
end $$;

create or replace function public.get_room_id_by_secret(p_secret text)
returns uuid
language sql security definer stable set search_path = public as $$
  select room_id from public.app_rooms where secret = p_secret limit 1;
$$;

grant execute on function public.create_app_room(text) to anon, authenticated;
grant execute on function public.get_app_room(text) to anon, authenticated;
grant execute on function public.upsert_app_room(text, jsonb) to anon, authenticated;
grant execute on function public.get_room_id_by_secret(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Realtime publication
-- ---------------------------------------------------------------------
-- Đảm bảo bảng được thêm vào publication mặc định của Supabase.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_rooms'
  ) then
    alter publication supabase_realtime add table public.app_rooms;
  end if;
end $$;