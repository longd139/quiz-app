// Edge Function: issue một JWT ngắn hạn chứa claim `room_secret = <secret>`.
// Client dùng JWT này làm Authorization để:
//   - Realtime (RLS-aware) chỉ nhận thay đổi của đúng phòng.
//   - (tuỳ chọn) RLS policy `auth.jwt()->>'room_secret'` cho REST.
// Signature bằng ROOM_JWT_SECRET (project JWT secret) → Supabase gateway
// xác thực được. Secret này chỉ nằm server-side, không đưa vào client.
// Lưu ý: không đặt tên bắt đầu bằng `SUPABASE_` (CLI chặn tên reserved).
import { createClient } from 'npm:@supabase/supabase-js';
import { SignJWT } from 'npm:jose';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: CORS });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const jwtSecret = Deno.env.get('ROOM_JWT_SECRET') ?? '';

  if (!url || !serviceKey) return json({ error: 'Supabase env chưa được cấu hình.' }, 500);
  if (!jwtSecret) return json({ error: 'ROOM_JWT_SECRET chưa được set.' }, 500);

  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body không phải JSON.' }, 400);
  }

  const secret = (body.secret ?? '').trim();
  if (!secret) return json({ error: 'Thiếu secret.' }, 400);

  // Xác thực phòng tồn tại qua service role (không cần claim).
  const sb = createClient(url, serviceKey);
  const { data, error } = await sb
    .from('app_rooms')
    .select('room_id')
    .eq('secret', secret)
    .limit(1)
    .maybeSingle();

  if (error) return json({ error: 'Lỗi truy vấn phòng: ' + error.message }, 500);
  if (!data) return json({ error: 'Không tìm thấy phòng với secret này.' }, 404);

  // Sign JWT. role=anon → PostgREST/Realtime map sang role anon; claim room_secret
  // để policy RLS so khớp. Token sống 30 ngày (đủ cho dùng cá nhân).
  const token = await new SignJWT({ role: 'anon', room_secret: secret })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('supabase')
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(jwtSecret));

  return json({ token, room_id: data.room_id });
});