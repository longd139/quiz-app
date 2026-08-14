// Đồng bộ cloud qua Supabase (thay thế GitHub Gist).
// Mô hình: 1 phòng = 1 document jsonb trong bảng `app_rooms`.
// Thiết bị join bằng một `secret`. Vì dự án dùng publishable key (bản Supabase mới)
// chặn JWT tự sign để Realtime RLS, ta dùng POLL get_app_room mỗi vài giây để
// tự đồng bộ — vẫn an toàn (chỉ RPC security-definer gated bằng secret truy cập được).
import { anonClient, hasSupabase } from '../lib/supabase';

const ROOM_KEY = 'quiz_room_config';

export function getRoomConfig() {
  try { const raw = localStorage.getItem(ROOM_KEY); if (!raw) return null; return JSON.parse(raw); } catch (_e) { return null; }
}

export function setRoomConfig(cfg) { localStorage.setItem(ROOM_KEY, JSON.stringify(cfg)); }

export function clearRoomConfig() { localStorage.removeItem(ROOM_KEY); }

export function isConfigured() {
  const cfg = getRoomConfig();
  return hasSupabase && !!(cfg && cfg.secret && cfg.room_id);
}

// ---- Tạo phòng -----------------------------------------------------------
export async function createRoom() {
  if (!hasSupabase) throw new Error('Chưa cấu hình Supabase (thiếu env).');
  const secret = crypto.randomUUID();
  const { data: id, error } = await anonClient.rpc('create_app_room', { p_secret: secret });
  if (error) throw new Error('Tạo phòng thất bại: ' + error.message);
  return { secret, room_id: id };
}

// Lưu cấu hình phòng (dùng sau khi tạo phòng để không kéo data rỗng đè local).
export function finalizeRoom(secret, room_id) {
  const cfg = { secret, room_id, last_synced_at: new Date().toISOString(), last_pushed_at: new Date().toISOString() };
  setRoomConfig(cfg);
  return cfg;
}

// ---- Join phòng có sẵn (trả về dữ liệu cloud + lưu cấu hình) ------------
export async function joinRoom(secret) {
  if (!hasSupabase) throw new Error('Chưa cấu hình Supabase (thiếu env).');
  const { data, error } = await anonClient.rpc('get_app_room', { p_secret: secret });
  if (error) throw new Error('Lỗi kết nối: ' + error.message);
  if (!data || !data.length) throw new Error('Không tìm thấy phòng với mã này.');
  setRoomConfig({ secret, room_id: data[0].room_id, last_synced_at: new Date().toISOString(), last_pushed_at: new Date().toISOString() });
  return { data: data[0].data, updatedAt: data[0].updated_at };
}

// ---- Đọc dữ liệu cloud (dùng khi open app / poll) ----------------------
export async function pullRoomData(secret) {
  const { data, error } = await anonClient.rpc('get_app_room', { p_secret: secret });
  if (error) throw new Error('Pull thất bại: ' + error.message);
  if (!data || !data.length) throw new Error('Không tìm thấy phòng.');
  return { data: data[0].data, updatedAt: data[0].updated_at };
}

// ---- Đẩy dữ liệu local lên cloud (upsert toàn bộ document) --------------
let lastPushedAtMs = 0;
export async function pushRoomData(secret, data) {
  const { error } = await anonClient.rpc('upsert_app_room', { p_secret: secret, p_data: data });
  if (error) throw new Error('Push thất bại: ' + error.message);
  lastPushedAtMs = Date.now();
  return new Date().toISOString();
}

let pushTimer = null;
export function schedulePush(secret, data, delayMs = 1500) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try { await pushRoomData(secret, data); } catch (e) { console.error('Supabase push failed:', e); }
  }, delayMs);
}

export function resetEchoGuard() { lastPushedAtMs = 0; }

// ---- Poll: tự lấy dữ liệu mới từ cloud định kỳ (thay cho realtime) -----
let pollTimer = null;
let lastAppliedUpdatedAt = null;

export function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

export function startPolling(secret, onUpdate, intervalMs = 5000) {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const { data, updatedAt } = await pullRoomData(secret);
      if (!data) return;
      const evtAt = updatedAt ? new Date(updatedAt).getTime() : 0;
      // Bỏ qua echo từ chính thiết bị này.
      if (evtAt && evtAt <= lastPushedAtMs) return;
      if (updatedAt === lastAppliedUpdatedAt) return; // chưa đổi
      lastAppliedUpdatedAt = updatedAt;
      onUpdate({ data, updatedAt });
    } catch (_e) {
      // Lỗi mạng tạm thời — bỏ qua, lượt sau poll lại.
    }
  }, intervalMs);
}