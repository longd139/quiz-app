import { createClient } from 'npm:@supabase/supabase-js';
import {
  computeLookupDigest,
  isValidUuid,
  normalizeAccessCode,
  requireSourceCodePepper,
  resolveTrustedPublicSupabaseUrl,
  rewriteSignedStorageUrl,
  validateHttpsUrl,
  verifyAccessCodeHash,
} from '../_shared/sourceCrypto.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 300;
const RATE_LIMIT_COOLDOWN_SECONDS = 60;

function getSignedUrlTtlSeconds(): number {
  const raw = Number(Deno.env.get('SOURCE_SIGNED_URL_TTL_SECONDS') || '60');
  if (!Number.isFinite(raw) || raw < 1) return 60;
  return Math.min(300, Math.floor(raw));
}

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...CORS,
      ...extraHeaders,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: 'Server configuration error.' }, 500);

  let pepperSecret: string;
  let trustedPublicUrl: URL;
  try {
    pepperSecret = requireSourceCodePepper();
    trustedPublicUrl = resolveTrustedPublicSupabaseUrl();
  } catch (cfgErr) {
    const code = cfgErr instanceof Error ? cfgErr.message : 'CONFIG_ERROR';
    return json(
      { error: code === 'MISCONFIGURED_PEPPER' ? 'Hệ thống chưa cấu hình mã bảo mật SRC.' : 'Hệ thống chưa cấu hình PUBLIC_SUPABASE_URL hợp lệ.' },
      500
    );
  }

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
  const signedTtl = getSignedUrlTtlSeconds();

  // Paginated list of authenticated user's redeemed packages
  if (action === 'list_my_redemptions') {
    const allRows: Record<string, unknown>[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
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
        .order('redeemed_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) return json({ error: 'Không thể tải lịch sử nhận SRC.' }, 500);
      if (!rows || rows.length === 0) break;
      allRows.push(...rows);
      if (rows.length < pageSize) break;
      offset += pageSize;
    }

    return json({
      redemptions: allRows.map((r) => ({
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
    if (!isValidUuid(redemptionId)) return json({ error: 'redemptionId không hợp lệ.' }, 400);

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
      .createSignedUrl(storagePath, signedTtl, { download: fileName });

    if (signErr || !signed?.signedUrl) {
      return json({ error: 'Không thể tạo liên kết tải xuống lúc này.' }, 500);
    }

    let safeSignedUrl: string;
    try {
      safeSignedUrl = rewriteSignedStorageUrl(signed.signedUrl, trustedPublicUrl);
    } catch {
      return json({ error: 'Cấu hình đường dẫn tải xuống không hợp lệ.' }, 500);
    }

    await sbAdmin.from('audit_logs').insert({
      actor_user_id: userId,
      action: 'SOURCE_DOWNLOAD_URL_ISSUED',
      entity_type: 'source_package',
      entity_id: String(pkg.id),
      metadata: { redemption_id: redemptionId, expires_in: signedTtl },
    });

    return json({
      deliveryType: 'FILE',
      signedUrl: safeSignedUrl,
      expiresIn: signedTtl,
      fileName,
    });
  }

  if (action !== 'redeem') {
    return json({ error: `Unsupported action: ${action}` }, 400);
  }

  // Redeem SRC by access code
  const accessCode = normalizeAccessCode(String(body.accessCode || ''));
  const operationId = String(body.operationId || '').trim();
  if (!accessCode || accessCode.length > 64 || !operationId || operationId.length > 128) {
    return json({ error: 'Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.' }, 400);
  }

  // BUG-29: Atomic DB-backed rate limit reservation BEFORE code lookup/verification (fail-closed)
  const { data: rlRes, error: rlErr } = await sbAdmin.rpc('reserve_source_redeem_attempt_atomic', {
    p_user_id: userId,
    p_max_attempts: RATE_LIMIT_MAX_ATTEMPTS,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    p_cooldown_seconds: RATE_LIMIT_COOLDOWN_SECONDS,
  });

  if (rlErr || !rlRes) {
    return json({ error: 'Không thể nhận SRC lúc này. Vui lòng thử lại.' }, 500);
  }

  if (!rlRes.allowed) {
    const retryAfterSeconds = Number(rlRes.retry_after_seconds || RATE_LIMIT_COOLDOWN_SECONDS);
    return json(
      {
        error: `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${retryAfterSeconds} giây.`,
        retryAfterSeconds,
      },
      429,
      { 'Retry-After': String(retryAfterSeconds) }
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
    await sbAdmin.from('audit_logs').insert({
      actor_user_id: userId,
      action: 'SOURCE_REDEEM_FAILURE',
      entity_type: 'source_access_code',
      metadata: { reason: 'invalid_code' },
    });
    return json({ error: 'Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.' }, 400);
  }

  // BUG-34: Concurrency-safe atomic redemption RPC
  const { data: redeemResult, error: rpcErr } = await sbAdmin.rpc('redeem_source_package_atomic', {
    p_user_id: userId,
    p_access_code_id: codeRow.id,
    p_operation_id: operationId,
  });

  if (rpcErr || !redeemResult) {
    const msg = rpcErr?.message || '';
    if (msg.includes('OPERATION_CONFLICT')) {
      return json({ error: 'Yêu cầu thao tác bị xung đột. Vui lòng thử lại.' }, 409);
    }
    if (msg.includes('LIMIT_REACHED') || msg.includes('USER_LIMIT_REACHED')) {
      return json({ error: 'Bạn đã đạt giới hạn nhận SRC.' }, 400);
    }
    if (msg.includes('USER_FORBIDDEN')) {
      return json({ error: 'Tài khoản chưa được phép thực hiện thao tác này.' }, 403);
    }
    if (msg.includes('CODE_INVALID') || msg.includes('CODE_EXPIRED') || msg.includes('PACKAGE_INACTIVE')) {
      await sbAdmin.from('audit_logs').insert({
        actor_user_id: userId,
        action: 'SOURCE_REDEEM_FAILURE',
        entity_type: 'source_access_code',
        metadata: { reason: 'inactive_or_expired' },
      });
      return json({ error: 'Mã nhận SRC không hợp lệ hoặc không còn hiệu lực.' }, 400);
    }
    return json({ error: 'Không thể nhận SRC lúc này. Vui lòng thử lại.' }, 500);
  }

  // Release ONLY this successful request's reserved rate-limit slot
  await sbAdmin.rpc('finalize_source_redeem_attempt_atomic', {
    p_user_id: userId,
    p_success: true,
  });

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
    .createSignedUrl(storagePath, signedTtl, { download: fileName });

  if (signErr || !signed?.signedUrl) {
    return json({ error: 'Không thể tạo liên kết tải xuống lúc này. Vui lòng thử lại.' }, 500);
  }

  let safeSignedUrl: string;
  try {
    safeSignedUrl = rewriteSignedStorageUrl(signed.signedUrl, trustedPublicUrl);
  } catch {
    return json({ error: 'Cấu hình đường dẫn tải xuống không hợp lệ.' }, 500);
  }

  await sbAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    action: 'SOURCE_DOWNLOAD_URL_ISSUED',
    entity_type: 'source_package',
    entity_id: String(pkg.id),
    metadata: { redemption_id: redeemResult.redemption_id, expires_in: signedTtl },
  });

  return json({
    redemptionId: redeemResult.redemption_id,
    idempotent: Boolean(redeemResult.idempotent),
    package: safePkg,
    signedUrl: safeSignedUrl,
    expiresIn: signedTtl,
  });
});
