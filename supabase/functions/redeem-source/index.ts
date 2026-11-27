import { createClient } from 'npm:@supabase/supabase-js';
import {
  computeLookupDigest,
  normalizeAccessCode,
  validateHttpsUrl,
  verifyAccessCodeHash,
} from '../_shared/sourceCrypto.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const SIGNED_URL_TTL_SECONDS = 60;

function toPublicSignedUrl(signedUrl: string, req: Request): string {
  const publicOverride = Deno.env.get('PUBLIC_SUPABASE_URL');
  const parsed = new URL(signedUrl);
  if (publicOverride) {
    const pub = new URL(publicOverride);
    parsed.protocol = pub.protocol;
    parsed.host = pub.host;
    return parsed.toString();
  }
  if (parsed.hostname === 'kong' || parsed.hostname.startsWith('supabase_kong_')) {
    const fwdHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const fwdProto = req.headers.get('x-forwarded-proto') || 'http';
    const fwdPort = req.headers.get('x-forwarded-port');
    if (fwdHost && !fwdHost.startsWith('kong')) {
      parsed.protocol = `${fwdProto}:`;
      if (!fwdHost.includes(':') && fwdPort && fwdPort !== '80' && fwdPort !== '443') {
        parsed.host = `${fwdHost}:${fwdPort}`;
      } else {
        parsed.host = fwdHost;
      }
    }
  }
  return parsed.toString();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function recordFailedAttempt(
  sbAdmin: ReturnType<typeof createClient>,
  userId: string,
  reasonCategory: string
) {
  const now = Date.now();
  const { data: rl } = await sbAdmin
    .from('source_redeem_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  let attempts = 1;
  let windowStart = now;
  if (rl) {
    const prevWindow = new Date(rl.window_started_at).getTime();
    if (now - prevWindow <= RATE_LIMIT_WINDOW_MS) {
      attempts = (rl.failed_attempts || 0) + 1;
      windowStart = prevWindow;
    }
  }

  const blockedUntil = attempts >= RATE_LIMIT_MAX_ATTEMPTS
    ? new Date(now + RATE_LIMIT_COOLDOWN_MS).toISOString()
    : null;

  await sbAdmin.from('source_redeem_rate_limits').upsert({
    user_id: userId,
    failed_attempts: attempts,
    window_started_at: new Date(windowStart).toISOString(),
    blocked_until: blockedUntil,
    updated_at: new Date(now).toISOString(),
  });

  await sbAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    action: 'SOURCE_REDEEM_FAILURE',
    entity_type: 'source_access_code',
    metadata: { reason: reasonCategory },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const pepperSecret = Deno.env.get('SOURCE_CODE_PEPPER') || serviceKey;
  if (!url || !serviceKey) return json({ error: 'Server configuration error.' }, 500);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Vui lòng đăng nhập.' }, 401);

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerRes, error: callerErr } = await sbAdmin.auth.getUser(token);
  if (callerErr || !callerRes?.user) {
    return json({ error: 'Vui lòng đăng nhập.' }, 401);
  }
  const userId = callerRes.user.id;

  const { data: profile } = await sbAdmin
    .from('profiles')
    .select('id, status, must_change_password')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || profile.status !== 'ACTIVE' || profile.must_change_password) {
    return json({ error: 'Tài khoản chưa được phép thực hiện thao tác này.' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const rawText = await req.text();
    if (rawText.length > 4096) return json({ error: 'Yêu cầu vượt quá kích thước cho phép.' }, 413);
    body = JSON.parse(rawText);
  } catch {
    return json({ error: 'Dữ liệu yêu cầu không hợp lệ.' }, 400);
  }

  const action = String(body.action || 'redeem');

  // List authenticated user's redeemed packages (no access codes, no storage_path)
  if (action === 'list_my_redemptions') {
    const { data: rows, error } = await sbAdmin
      .from('source_redemptions')
      .select(`
        id,
        redeemed_at,
        status,
        package:source_packages!source_redemptions_source_package_id_fkey(
          id, name, description, instructions, category, version, delivery_type, file_name, file_size, status
        )
      `)
      .eq('user_id', userId)
      .order('redeemed_at', { ascending: false });

    if (error) return json({ error: 'Không thể tải lịch sử nhận SRC.' }, 500);

    return json({
      redemptions: (rows || []).map((r) => ({
        id: r.id,
        redeemed_at: r.redeemed_at,
        status: r.status,
        package: r.package,
      })),
    });
  }

  // Re-issue short-lived signed URL or link for an existing valid redemption (no extra redemption count)
  if (action === 'get_download_url') {
    const redemptionId = String(body.redemptionId || '').trim();
    if (!redemptionId) return json({ error: 'Thiếu redemptionId.' }, 400);

    const { data: red } = await sbAdmin
      .from('source_redemptions')
      .select(`
        id,
        user_id,
        source_package_id,
        package:source_packages!source_redemptions_source_package_id_fkey(*)
      `)
      .eq('id', redemptionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!red || !red.package) {
      return json({ error: 'Không tìm thấy lượt nhận SRC hợp lệ.' }, 404);
    }

    const pkg = red.package as Record<string, unknown>;
    if (pkg.status !== 'ACTIVE') {
      return json({ error: 'Gói SRC này hiện đã bị khóa hoặc ngừng phát hành.' }, 403);
    }

    if (pkg.delivery_type === 'LINK') {
      const linkCheck = validateHttpsUrl(String(pkg.external_url || ''));
      if (!linkCheck.ok) return json({ error: 'Liên kết tài nguyên không hợp lệ.' }, 400);
      return json({
        deliveryType: 'LINK',
        externalUrl: linkCheck.url,
        packageName: pkg.name,
      });
    }

    const storagePath = String(pkg.storage_path || '');
    const fileName = String(pkg.file_name || 'source.zip');
    const { data: signed, error: signErr } = await sbAdmin.storage
      .from('source-packages')
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, { download: fileName });

    if (signErr || !signed?.signedUrl) {
      return json({ error: 'Không thể tạo liên kết tải xuống lúc này.' }, 500);
    }

    await sbAdmin.from('audit_logs').insert({
      actor_user_id: userId,
      action: 'SOURCE_DOWNLOAD_URL_ISSUED',
      entity_type: 'source_package',
      entity_id: String(pkg.id),
      metadata: { redemption_id: redemptionId, expires_in: SIGNED_URL_TTL_SECONDS },
    });

    return json({
      deliveryType: 'FILE',
      signedUrl: toPublicSignedUrl(signed.signedUrl, req),
      expiresIn: SIGNED_URL_TTL_SECONDS,
      fileName,
    });
  }

  // Redeem SRC by access code
  const accessCode = normalizeAccessCode(String(body.accessCode || ''));
  const operationId = String(body.operationId || '').trim();
  if (!accessCode || accessCode.length > 64 || !operationId) {
    return json({ error: 'Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.' }, 400);
  }

  // DB-backed rate limit check
  const { data: rl } = await sbAdmin
    .from('source_redeem_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (rl?.blocked_until && new Date(rl.blocked_until).getTime() > Date.now()) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(rl.blocked_until).getTime() - Date.now()) / 1000)
    );
    return json(
      {
        error: `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${retryAfterSeconds} giây.`,
        retryAfterSeconds,
      },
      429
    );
  }

  // Safe HMAC lookup + PBKDF2 hash verification
  const lookupDigest = await computeLookupDigest(accessCode, pepperSecret);
  const { data: codeRow } = await sbAdmin
    .from('source_access_codes')
    .select('id, code_hash, status, expires_at')
    .eq('code_lookup_digest', lookupDigest)
    .maybeSingle();

  if (!codeRow || !(await verifyAccessCodeHash(accessCode, codeRow.code_hash))) {
    await recordFailedAttempt(sbAdmin, userId, 'invalid_code');
    return json({ error: 'Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.' }, 400);
  }

  // Execute atomic redemption RPC (FOR UPDATE row lock + idempotent operationId)
  const { data: redeemResult, error: rpcErr } = await sbAdmin.rpc('redeem_source_package_atomic', {
    p_user_id: userId,
    p_access_code_id: codeRow.id,
    p_operation_id: operationId,
  });

  if (rpcErr || !redeemResult) {
    const msg = rpcErr?.message || '';
    if (msg.includes('LIMIT_REACHED')) {
      return json({ error: 'Bạn đã đạt giới hạn nhận SRC.' }, 400);
    }
    if (msg.includes('CODE_INVALID') || msg.includes('CODE_EXPIRED') || msg.includes('PACKAGE_INACTIVE')) {
      await recordFailedAttempt(sbAdmin, userId, 'inactive_or_expired');
      return json({ error: 'Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.' }, 400);
    }
    return json({ error: 'Không thể nhận SRC lúc này. Vui lòng thử lại.' }, 500);
  }

  // Clear rate limit failed attempts upon valid redemption
  await sbAdmin.from('source_redeem_rate_limits').delete().eq('user_id', userId);

  const pkg = redeemResult.package as Record<string, unknown>;
  const safePkg = {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    instructions: pkg.instructions,
    category: pkg.category,
    version: pkg.version,
    delivery_type: pkg.delivery_type,
    file_name: pkg.file_name,
    file_size: pkg.file_size,
  };

  if (pkg.delivery_type === 'LINK') {
    const linkCheck = validateHttpsUrl(String(pkg.external_url || ''));
    if (!linkCheck.ok) {
      return json({ error: 'Không thể nhận SRC lúc này. Vui lòng thử lại.' }, 500);
    }
    return json({
      redemptionId: redeemResult.redemption_id,
      idempotent: Boolean(redeemResult.idempotent),
      package: safePkg,
      externalUrl: linkCheck.url,
    });
  }

  const storagePath = String(pkg.storage_path || '');
  const fileName = String(pkg.file_name || 'source.zip');
  const { data: signed, error: signErr } = await sbAdmin.storage
    .from('source-packages')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, { download: fileName });

  if (signErr || !signed?.signedUrl) {
    return json({ error: 'Không thể tạo liên kết tải xuống lúc này. Vui lòng thử lại.' }, 500);
  }

  await sbAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    action: 'SOURCE_DOWNLOAD_URL_ISSUED',
    entity_type: 'source_package',
    entity_id: String(pkg.id),
    metadata: { redemption_id: redeemResult.redemption_id, expires_in: SIGNED_URL_TTL_SECONDS },
  });

  return json({
    redemptionId: redeemResult.redemption_id,
    idempotent: Boolean(redeemResult.idempotent),
    package: safePkg,
    signedUrl: toPublicSignedUrl(signed.signedUrl, req),
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
});
