import { createClient } from 'npm:@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!/[A-Z]/.test(pw)) return 'Mật khẩu phải có ít nhất 1 chữ hoa.';
  if (!/[a-z]/.test(pw)) return 'Mật khẩu phải có ít nhất 1 chữ thường.';
  if (!/[0-9]/.test(pw)) return 'Mật khẩu phải có ít nhất 1 chữ số.';
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !anonKey || !serviceKey) return json({ error: 'Server configuration error.' }, 500);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userRes, error: authErr } = await sbAdmin.auth.getUser(token);
  if (authErr || !userRes?.user?.email) {
    return json({ error: 'Phiên đăng nhập không hợp lệ.' }, 401);
  }

  const userId = userRes.user.id;
  const email = userRes.user.email;

  const { data: profile } = await sbAdmin
    .from('profiles')
    .select('id, status')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || profile.status !== 'ACTIVE') {
    return json({ error: 'Tài khoản bị khóa hoặc không hoạt động.' }, 403);
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Dữ liệu JSON không hợp lệ.' }, 400);
  }

  const currentPassword = String(body.currentPassword ?? '');
  const newPassword = String(body.newPassword ?? '');

  if (!currentPassword) return json({ error: 'Vui lòng nhập mật khẩu hiện tại.' }, 400);
  const pwErr = validatePassword(newPassword);
  if (pwErr) return json({ error: pwErr }, 400);
  if (currentPassword === newPassword) {
    return json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' }, 400);
  }

  // Reauthenticate using anon client to verify current password
  const sbAnon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: reauthErr } = await sbAnon.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (reauthErr) {
    return json({ error: 'Mật khẩu hiện tại không chính xác.' }, 400);
  }

  // Update password via Admin API and clear must_change_password + password_changed flag
  const { error: updatePwErr } = await sbAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
    user_metadata: {
      ...(userRes.user.user_metadata || {}),
      password_changed: true,
    },
  });
  if (updatePwErr) {
    return json({ error: updatePwErr.message || 'Không thể cập nhật mật khẩu mới.' }, 400);
  }

  const { error: profErr } = await sbAdmin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', userId);

  if (profErr) {
    return json({ error: 'Lỗi cập nhật trạng thái tài khoản: ' + profErr.message }, 500);
  }

  await sbAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    action: 'USER_PASSWORD_CHANGE',
    entity_type: 'profile',
    entity_id: userId,
    metadata: { self_service: true },
  });

  return json({ success: true });
});
