// Khởi tạo Supabase client.
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY lấy từ env (xem .env.local).
// - anonClient: dùng anon key, cho các RPC security-definer (create/get/upsert room,
//   gated bởi secret) — hợp lệ với role anon qua grant execute.
// - createRealtimeClient(token): client với JWT room (claim room_secret) để Realtime
//   RLS-aware chỉ nhận đúng phòng.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabase = Boolean(url && anonKey);

export function supabaseAnonKey() {
  return anonKey;
}

export const anonClient = hasSupabase ? createClient(url, anonKey) : null;

export function supabaseUrl() {
  return url;
}

export function createRealtimeClient(token) {
  return createClient(url, token, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
