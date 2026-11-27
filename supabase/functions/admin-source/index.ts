import { createClient } from 'npm:@supabase/supabase-js';
import {
  computeLookupDigest,
  generateSecureAccessCode,
  hashAccessCode,
  isValidUuid,
  maskAccessCode,
  normalizeAccessCode,
  requireSourceCodePepper,
  sanitizeSafeFileName,
  validateAccessCodeStrength,
  validateHttpsUrl,
  validateZipBuffer,
} from '../_shared/sourceCrypto.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_SOURCE_FILE_BYTES = Number(Deno.env.get('MAX_SOURCE_FILE_BYTES') || 20 * 1024 * 1024);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...CORS,
    },
  });
}

async function safeDeleteOldStorageObject(sbAdmin: ReturnType<typeof createClient>, oldPath: string | null) {
  if (!oldPath) return;
  const { count, error } = await sbAdmin
    .from('source_packages')
    .select('id', { count: 'exact', head: true })
    .eq('storage_path', oldPath);
  if (error || count === null || count > 0) return;
  await sbAdmin.storage.from('source-packages').remove([oldPath]);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: 'Server configuration error.' }, 500);

  let pepperSecret: string;
  try {
    pepperSecret = requireSourceCodePepper();
  } catch {
    return json({ error: 'Cấu hình bảo mật SOURCE_CODE_PEPPER chưa hợp lệ.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerRes, error: callerErr } = await sbAdmin.auth.getUser(token);
  if (callerErr || !callerRes?.user) return json({ error: 'Invalid session' }, 401);
  const callerId = callerRes.user.id;

  const { data: callerProfile } = await sbAdmin
    .from('profiles')
    .select('id, role, status, must_change_password')
    .eq('id', callerId)
    .maybeSingle();

  if (!callerProfile || callerProfile.status !== 'ACTIVE' || callerProfile.role !== 'ADMIN' || callerProfile.must_change_password) {
    return json({ error: 'Forbidden: Admin privileges required.' }, 403);
  }

  const contentType = req.headers.get('content-type') || '';

  // Multipart ZIP upload workflow (BUG-31 safe file lifecycle)
  if (contentType.includes('multipart/form-data')) {
    const contentLen = Number(req.headers.get('content-length') || '0');
    if (contentLen > MAX_SOURCE_FILE_BYTES + 1024 * 1024) {
      return json({ error: 'Kích thước upload vượt quá giới hạn cho phép.' }, 413);
    }
    try {
      const form = await req.formData();
      const packageId = String(form.get('packageId') || '').trim();
      const file = form.get('file');
      if (!isValidUuid(packageId)) return json({ error: 'packageId không hợp lệ.' }, 400);
      if (!(file instanceof File)) return json({ error: 'Vui lòng chọn tệp .zip.' }, 400);

      const { data: pkg, error: pkgErr } = await sbAdmin
        .from('source_packages')
        .select('id, delivery_type, storage_path, lock_version')
        .eq('id', packageId)
        .maybeSingle();

      if (pkgErr || !pkg) return json({ error: 'Không tìm thấy gói SRC.' }, 404);
      if (pkg.delivery_type !== 'FILE') {
        return json({ error: 'Gói SRC này không dùng hình thức Upload file.' }, 400);
      }

      const buffer = new Uint8Array(await file.arrayBuffer());
      const fileErr = validateZipBuffer(buffer, file.name, MAX_SOURCE_FILE_BYTES);
      if (fileErr) return json({ error: fileErr }, 400);

      const safeName = sanitizeSafeFileName(file.name);
      const objectPath = `${packageId}/${crypto.randomUUID()}-${safeName}`;

      const { error: upErr } = await sbAdmin.storage
        .from('source-packages')
        .upload(objectPath, buffer, {
          contentType: 'application/zip',
          upsert: false,
        });

      if (upErr) {
        return json({ error: `Lỗi tải tệp lên Storage: ${upErr.message}` }, 500);
      }

      const { data: updatedPkg, error: updErr } = await sbAdmin
        .from('source_packages')
        .update({
          storage_path: objectPath,
          file_name: safeName,
          file_size: buffer.byteLength,
          mime_type: 'application/zip',
          lock_version: (pkg.lock_version || 1) + 1,
        })
        .eq('id', packageId)
        .eq('delivery_type', 'FILE')
        .eq('lock_version', pkg.lock_version || 1)
        .select()
        .single();

      if (updErr || !updatedPkg) {
        await sbAdmin.storage.from('source-packages').remove([objectPath]);
        return json({ error: updErr?.message || 'Xung đột cập nhật gói SRC, vui lòng thử lại.' }, 409);
      }

      if (pkg.storage_path && pkg.storage_path !== objectPath) {
        await safeDeleteOldStorageObject(sbAdmin, pkg.storage_path);
      }

      await sbAdmin.from('audit_logs').insert({
        actor_user_id: callerId,
        action: 'ADMIN_SOURCE_PACKAGE_UPDATE',
        entity_type: 'source_package',
        entity_id: packageId,
        metadata: { file_name: safeName, file_size: buffer.byteLength },
      });

      return json({ package: updatedPkg });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Upload error' }, 500);
    }
  }

  // JSON Admin Actions
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 32 * 1024) return json({ error: 'Yêu cầu vượt quá kích thước cho phép.' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = String(body.action || '');

  try {
    if (action === 'overview_and_list') {
      const page = Math.max(1, Number(body.page || 1));
      const pageSize = Math.max(1, Math.min(50, Number(body.pageSize || 10)));
      const search = String(body.search || '').trim();
      const statusFilter = String(body.statusFilter || 'ALL');
      const typeFilter = String(body.typeFilter || 'ALL');
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const nowIso = new Date().toISOString();

      let pkgQuery = sbAdmin
        .from('source_packages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (statusFilter !== 'ALL') pkgQuery = pkgQuery.eq('status', statusFilter);
      if (typeFilter !== 'ALL') pkgQuery = pkgQuery.eq('delivery_type', typeFilter);
      if (search) {
        const esc = search.replace(/[%_]/g, '');
        pkgQuery = pkgQuery.or(`name.ilike.%${esc}%,category.ilike.%${esc}%,version.ilike.%${esc}%`);
      }

      const [
        pkgRes,
        totalPkgsRes,
        activePkgsRes,
        lockedPkgsRes,
        totalRedRes,
        activeCodesRes,
        expiredCodesRes,
        redRes,
      ] = await Promise.all([
        pkgQuery,
        sbAdmin.from('source_packages').select('id', { count: 'exact', head: true }),
        sbAdmin.from('source_packages').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        sbAdmin.from('source_packages').select('id', { count: 'exact', head: true }).in('status', ['INACTIVE', 'ARCHIVED']),
        sbAdmin.from('source_redemptions').select('id', { count: 'exact', head: true }),
        sbAdmin
          .from('source_access_codes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ACTIVE')
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
        sbAdmin
          .from('source_access_codes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ACTIVE')
          .lte('expires_at', nowIso),
        sbAdmin
          .from('source_redemptions')
          .select('id, source_package_id, access_code_id, user_id, redeemed_at, status, profile:profiles!source_redemptions_user_id_fkey(email, full_name)')
          .order('redeemed_at', { ascending: false })
          .limit(100),
      ]);

      if (pkgRes.error) return json({ error: pkgRes.error.message }, 500);

      const pkgIds = (pkgRes.data || []).map((p) => p.id);
      const redCodeIds = (redRes.data || []).map((r) => r.access_code_id);
      const allCodeLookupIds = Array.from(new Set([...pkgIds]));

      let codesList: Record<string, unknown>[] = [];
      if (allCodeLookupIds.length > 0) {
        const { data: cData, error: cErr } = await sbAdmin
          .from('source_access_codes')
          .select('id, source_package_id, code_label, status, expires_at, max_redemptions, redemption_count, max_redemptions_per_user, created_at, revoked_at')
          .in('source_package_id', allCodeLookupIds)
          .order('created_at', { ascending: false });
        if (cErr) return json({ error: cErr.message }, 500);
        codesList = cData || [];
      }

      if (redCodeIds.length > 0) {
        const existingCodeIds = new Set(codesList.map((c) => c.id));
        const missingCodeIds = redCodeIds.filter((id) => !existingCodeIds.has(id));
        if (missingCodeIds.length > 0) {
          const { data: extraCodes } = await sbAdmin
            .from('source_access_codes')
            .select('id, source_package_id, code_label, status')
            .in('id', missingCodeIds);
          if (extraCodes) codesList = [...codesList, ...extraCodes];
        }
      }

      return json({
        overview: {
          totalPackages: totalPkgsRes.count ?? 0,
          activePackages: activePkgsRes.count ?? 0,
          lockedPackages: lockedPkgsRes.count ?? 0,
          totalRedemptions: totalRedRes.count ?? 0,
          activeCodes: activeCodesRes.count ?? 0,
          expiredCodes: expiredCodesRes.count ?? 0,
        },
        packages: pkgRes.data || [],
        totalFilteredPackages: pkgRes.count ?? 0,
        page,
        pageSize,
        codes: codesList,
        redemptions: (redRes.data || []).map((r) => ({
          id: r.id,
          source_package_id: r.source_package_id,
          access_code_id: r.access_code_id,
          user_id: r.user_id,
          redeemed_at: r.redeemed_at,
          status: r.status,
          user_email: (r.profile as { email?: string } | null)?.email || '',
          user_name: (r.profile as { full_name?: string } | null)?.full_name || '',
        })),
      });
    }

    if (action === 'create_package' || action === 'update_package') {
      const isCreate = action === 'create_package';
      const packageId = String(body.id || '').trim();
      const name = String(body.name || '').trim();
      const description = String(body.description || '').trim();
      const instructions = String(body.instructions || '').trim();
      const category = body.category ? String(body.category).trim().slice(0, 120) : null;
      const collectionId = body.collection_id ? String(body.collection_id).trim() : null;
      const version = body.version ? String(body.version).trim().slice(0, 64) : null;
      const deliveryType = body.delivery_type === 'LINK' ? 'LINK' : 'FILE';
      const status = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(String(body.status))
        ? String(body.status)
        : 'DRAFT';

      if (!name || name.length > 200) return json({ error: 'Tên gói SRC phải từ 1 đến 200 ký tự.' }, 400);
      if (description.length > 4000 || instructions.length > 4000) {
        return json({ error: 'Mô tả hoặc hướng dẫn vượt quá 4000 ký tự.' }, 400);
      }
      if (collectionId && !isValidUuid(collectionId)) {
        return json({ error: 'collection_id không hợp lệ.' }, 400);
      }

      let externalUrl: string | null = null;
      if (deliveryType === 'LINK') {
        const rawUrl = String(body.external_url || '').trim();
        if (rawUrl || status === 'ACTIVE') {
          const v = validateHttpsUrl(rawUrl);
          if (!v.ok) return json({ error: v.error }, 400);
          externalUrl = v.url || null;
        }
      }

      if (isCreate) {
        const { data: created, error } = await sbAdmin
          .from('source_packages')
          .insert({
            name,
            description,
            instructions,
            category,
            collection_id: collectionId || null,
            version,
            delivery_type: deliveryType,
            external_url: deliveryType === 'LINK' ? externalUrl : null,
            status: deliveryType === 'FILE' && status === 'ACTIVE' ? 'DRAFT' : status,
            created_by: callerId,
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, 400);

        await sbAdmin.from('audit_logs').insert({
          actor_user_id: callerId,
          action: 'ADMIN_SOURCE_PACKAGE_CREATE',
          entity_type: 'source_package',
          entity_id: created.id,
          metadata: { delivery_type: deliveryType, status: created.status },
        });

        return json({ package: created });
      }

      if (!isValidUuid(packageId)) return json({ error: 'id gói SRC không hợp lệ.' }, 400);
      const { data: existing } = await sbAdmin
        .from('source_packages')
        .select('*')
        .eq('id', packageId)
        .maybeSingle();
      if (!existing) return json({ error: 'Không tìm thấy gói SRC.' }, 404);

      const updateFields: Record<string, unknown> = {
        name,
        description,
        instructions,
        category,
        collection_id: collectionId || null,
        version,
        delivery_type: deliveryType,
        status,
        lock_version: (existing.lock_version || 1) + 1,
      };

      if (deliveryType === 'LINK') {
        updateFields.external_url = externalUrl;
        updateFields.storage_path = null;
        updateFields.file_name = null;
        updateFields.file_size = null;
        updateFields.mime_type = null;
      } else {
        updateFields.external_url = null;
        if (status === 'ACTIVE' && !existing.storage_path) {
          return json({ error: 'Vui lòng tải lên tệp .zip trước khi kích hoạt gói FILE.' }, 400);
        }
      }

      const { data: updated, error: updErr } = await sbAdmin
        .from('source_packages')
        .update(updateFields)
        .eq('id', packageId)
        .eq('lock_version', existing.lock_version || 1)
        .select()
        .single();

      if (updErr || !updated) return json({ error: updErr?.message || 'Xung đột cập nhật gói SRC.' }, 409);

      if (deliveryType === 'LINK' && existing.storage_path) {
        await safeDeleteOldStorageObject(sbAdmin, existing.storage_path);
      }

      await sbAdmin.from('audit_logs').insert({
        actor_user_id: callerId,
        action: status === 'ARCHIVED' ? 'ADMIN_SOURCE_PACKAGE_ARCHIVE' : 'ADMIN_SOURCE_PACKAGE_UPDATE',
        entity_type: 'source_package',
        entity_id: packageId,
        metadata: { status, delivery_type: deliveryType },
      });

      return json({ package: updated });
    }

    if (action === 'create_code' || action === 'rotate_code') {
      const packageId = String(body.source_package_id || '').trim();
      const revokeCodeId = action === 'rotate_code' ? String(body.revoke_code_id || '').trim() : '';
      const mode = body.mode === 'manual' ? 'manual' : 'random';
      const expiresAtRaw = body.expires_at ? String(body.expires_at).trim() : null;

      if (!isValidUuid(packageId)) return json({ error: 'source_package_id không hợp lệ.' }, 400);
      if (action === 'rotate_code' && !isValidUuid(revokeCodeId)) {
        return json({ error: 'revoke_code_id không hợp lệ.' }, 400);
      }

      let expiresAt: string | null = null;
      if (expiresAtRaw) {
        const parsedDate = new Date(expiresAtRaw);
        if (Number.isNaN(parsedDate.getTime())) return json({ error: 'Thời gian hết hạn không hợp lệ.' }, 400);
        expiresAt = parsedDate.toISOString();
      }

      let maxRedemptions: number | null = null;
      if (body.max_redemptions !== null && body.max_redemptions !== undefined && body.max_redemptions !== '') {
        const n = Number(body.max_redemptions);
        if (!Number.isInteger(n) || n <= 0) return json({ error: 'Giới hạn lượt nhận phải là số nguyên dương.' }, 400);
        maxRedemptions = n;
      }

      let maxPerUser: number | null = null;
      if (body.max_redemptions_per_user !== null && body.max_redemptions_per_user !== undefined && body.max_redemptions_per_user !== '') {
        const n = Number(body.max_redemptions_per_user);
        if (!Number.isInteger(n) || n <= 0) return json({ error: 'Giới hạn mỗi tài khoản phải là số nguyên dương.' }, 400);
        maxPerUser = n;
      }

      const plaintextCode = mode === 'manual'
        ? normalizeAccessCode(String(body.code || ''))
        : generateSecureAccessCode(12);

      const strengthErr = validateAccessCodeStrength(plaintextCode);
      if (strengthErr) return json({ error: strengthErr }, 400);

      const lookupDigest = await computeLookupDigest(plaintextCode, pepperSecret);
      const codeHash = await hashAccessCode(plaintextCode);
      const codeLabel = maskAccessCode(plaintextCode);

      if (action === 'rotate_code') {
        const { data: rotRes, error: rotErr } = await sbAdmin.rpc('rotate_source_access_code_atomic', {
          p_actor_id: callerId,
          p_package_id: packageId,
          p_old_code_id: revokeCodeId,
          p_code_label: codeLabel,
          p_code_hash: codeHash,
          p_lookup_digest: lookupDigest,
          p_expires_at: expiresAt,
          p_max_redemptions: maxRedemptions,
          p_max_per_user: maxPerUser,
          p_mode: mode,
        });

        if (rotErr) {
          const msg = rotErr.code === '23505'
            ? 'Mã truy cập mới bị trùng. Đã hoàn tác xoay mã, mã cũ vẫn giữ nguyên.'
            : rotErr.message;
          return json({ error: msg }, 400);
        }

        return json({ code: rotRes.new_code, plaintextCode });
      }

      const { data: createdCode, error: insErr } = await sbAdmin
        .from('source_access_codes')
        .insert({
          source_package_id: packageId,
          code_label: codeLabel,
          code_hash: codeHash,
          code_lookup_digest: lookupDigest,
          status: 'ACTIVE',
          expires_at: expiresAt,
          max_redemptions: maxRedemptions,
          max_redemptions_per_user: maxPerUser,
          created_by: callerId,
        })
        .select('id, source_package_id, code_label, status, expires_at, max_redemptions, redemption_count, max_redemptions_per_user, created_at')
        .single();

      if (insErr) {
        const msg = insErr.code === '23505'
          ? 'Mã truy cập này đã tồn tại trên hệ thống. Vui lòng chọn mã khác.'
          : insErr.message;
        return json({ error: msg }, 400);
      }

      await sbAdmin.from('audit_logs').insert({
        actor_user_id: callerId,
        action: 'ADMIN_SOURCE_CODE_CREATE',
        entity_type: 'source_access_code',
        entity_id: createdCode.id,
        metadata: { package_id: packageId, mode },
      });

      return json({ code: createdCode, plaintextCode });
    }

    if (action === 'revoke_code') {
      const codeId = String(body.code_id || '').trim();
      if (!isValidUuid(codeId)) return json({ error: 'code_id không hợp lệ.' }, 400);

      const { data: revoked, error } = await sbAdmin
        .from('source_access_codes')
        .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
        .eq('id', codeId)
        .select('id, source_package_id, code_label, status, revoked_at')
        .single();

      if (error) return json({ error: error.message }, 400);

      await sbAdmin.from('audit_logs').insert({
        actor_user_id: callerId,
        action: 'ADMIN_SOURCE_CODE_REVOKE',
        entity_type: 'source_access_code',
        entity_id: codeId,
        metadata: { package_id: revoked.source_package_id },
      });

      return json({ code: revoked });
    }

    return json({ error: `Unsupported action: ${action}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
