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

// Simple in-memory per-admin rate limiter (max 30 sensitive mutations per minute)
const rateBucket = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(adminId: string): boolean {
  const now = Date.now();
  const entry = rateBucket.get(adminId);
  if (!entry || now > entry.resetAt) {
    rateBucket.set(adminId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count += 1;
  return true;
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
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: 'Server configuration error.' }, 500);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller JWT
  const { data: userRes, error: authErr } = await sbAdmin.auth.getUser(token);
  if (authErr || !userRes?.user) {
    return json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }, 401);
  }

  const callerId = userRes.user.id;
  const { data: callerProfile, error: profErr } = await sbAdmin
    .from('profiles')
    .select('id, role, status, must_change_password')
    .eq('id', callerId)
    .maybeSingle();

  if (profErr || !callerProfile) {
    return json({ error: 'Không tìm thấy hồ sơ người dùng.' }, 403);
  }
  if (callerProfile.status !== 'ACTIVE' || callerProfile.role !== 'ADMIN' || callerProfile.must_change_password) {
    return json({ error: 'Bạn không có quyền thực hiện thao tác quản trị.' }, 403);
  }

  if (!checkRateLimit(callerId)) {
    return json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.' }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Dữ liệu JSON không hợp lệ.' }, 400);
  }

  const action = String(body.action ?? '');

  try {
    if (action === 'create_user') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const fullName = String(body.full_name ?? '').trim();
      const password = String(body.password ?? '');
      const role = body.role === 'ADMIN' ? 'ADMIN' : 'USER';
      const status = body.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
      const mustChangePassword = Boolean(body.must_change_password ?? true);

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: 'Email không hợp lệ.' }, 400);
      }
      if (!fullName) {
        return json({ error: 'Vui lòng nhập họ và tên.' }, 400);
      }
      const pwErr = validatePassword(password);
      if (pwErr) return json({ error: pwErr }, 400);

      const { data: created, error: createErr } = await sbAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, must_change_password: mustChangePassword },
      });

      if (createErr || !created?.user) {
        return json({ error: createErr?.message || 'Không thể tạo tài khoản.' }, 400);
      }

      const newUserId = created.user.id;
      const { data: profile, error: upsertErr } = await sbAdmin
        .from('profiles')
        .upsert({
          id: newUserId,
          email,
          full_name: fullName,
          role,
          status,
          must_change_password: mustChangePassword,
        })
        .select()
        .single();

      if (upsertErr) {
        // Compensate: remove newly created Auth user to avoid orphan accounts
        await sbAdmin.auth.admin.deleteUser(newUserId);
        return json({ error: 'Không thể lưu hồ sơ người dùng, đã hoàn tác tài khoản: ' + upsertErr.message }, 500);
      }

      await sbAdmin.from('audit_logs').insert({
        actor_user_id: callerId,
        action: 'ADMIN_USER_CREATE',
        entity_type: 'profile',
        entity_id: newUserId,
        metadata: { email, role, status, must_change_password: mustChangePassword },
      });

      return json({ user: profile });
    }

    if (action === 'update_user') {
      const targetUserId = String(body.user_id ?? '').trim();
      if (!targetUserId) return json({ error: 'Thiếu user_id.' }, 400);

      const nextRole = body.role === 'ADMIN' || body.role === 'USER' ? body.role : null;
      const nextStatus = body.status === 'ACTIVE' || body.status === 'DISABLED' ? body.status : null;
      const nextName = typeof body.full_name === 'string' ? body.full_name.trim() : null;
      const nextMustChange = typeof body.must_change_password === 'boolean'
        ? body.must_change_password
        : null;

      const { data: updated, error: txErr } = await sbAdmin.rpc('admin_update_profile_tx', {
        p_actor_id: callerId,
        p_target_id: targetUserId,
        p_full_name: nextName,
        p_role: nextRole,
        p_status: nextStatus,
        p_must_change_password: nextMustChange,
      });

      if (txErr) return json({ error: txErr.message }, 400);
      return json({ user: updated });
    }

    if (action === 'reset_password') {
      const targetUserId = String(body.user_id ?? '').trim();
      const newPassword = String(body.password ?? '');
      const mustChangePassword = Boolean(body.must_change_password ?? true);

      if (!targetUserId) return json({ error: 'Thiếu user_id.' }, 400);
      const pwErr = validatePassword(newPassword);
      if (pwErr) return json({ error: pwErr }, 400);

      const { error: resetErr } = await sbAdmin.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });
      if (resetErr) return json({ error: resetErr.message }, 400);

      const { data: updated, error: profUpdErr } = await sbAdmin
        .from('profiles')
        .update({ must_change_password: mustChangePassword })
        .eq('id', targetUserId)
        .select()
        .single();

      if (profUpdErr) return json({ error: profUpdErr.message }, 400);

      await sbAdmin.from('audit_logs').insert({
        actor_user_id: callerId,
        action: 'ADMIN_USER_RESET_PASSWORD',
        entity_type: 'profile',
        entity_id: targetUserId,
        metadata: { email: updated.email, must_change_password: mustChangePassword },
      });

      return json({ user: updated });
    }

    return json({ error: 'Hành động không được hỗ trợ.' }, 400);
  } catch (err) {
    console.error('admin-users error:', err);
    return json({ error: 'Lỗi xử lý máy chủ.' }, 500);
  }
});
