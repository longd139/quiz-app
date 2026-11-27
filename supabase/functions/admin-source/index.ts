import { createClient } from 'npm:@supabase/supabase-js';
import {
  computeLookupDigest,
  generateSecureAccessCode,
  hashAccessCode,
  maskAccessCode,
  normalizeAccessCode,
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
    headers: { 'Content-Type': 'application/json', ...CORS },
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

  // Multipart ZIP upload workflow
  if (contentType.includes('multipart/form-data')) {
    try {
      const form = await req.formData();
      const packageId = String(form.get('packageId') || '').trim();
      const file = form.get('file');
      if (!packageId) return json({ error: 'Thiếu packageId.' }, 400);
      if (!(file instanceof File)) return json({ error: 'Vui lòng chọn tệp .zip.' }, 400);

      const { data: pkg, error: pkgErr } = await sbAdmin
        .from('source_packages')
        .select('id, delivery_type, storage_path')
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
        })
        .eq('id', packageId)
        .select()
        .single();

      if (updErr) {
        // Cleanup orphan uploaded file if DB update fails
        await sbAdmin.storage.from('source-packages').remove([objectPath]);
        return json({ error: `Lỗi cập nhật gói SRC: ${updErr.message}` }, 500);
      }

      // Delete old file only after DB update succeeds and no other package references it
      if (pkg.storage_path && pkg.storage_path !== objectPath) {
        const { count } = await sbAdmin
          .from('source_packages')
          .select('id', { count: 'exact', head: true })
          .eq('storage_path', pkg.storage_path);
        if ((count ?? 0) === 0) {
          await sbAdmin.storage.from('source-packages').remove([pkg.storage_path]);
        }
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
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = String(body.action || '');

  try {
    if (action === 'overview_and_list') {
      const [{ data: packages, error: pErr }, { data: codes, error: cErr }, { data: redemptions, error: rErr }] = await Promise.all([
        sbAdmin.from('source_packages').select('*').order('created_at', { ascending: false }),
        sbAdmin
          .from('source_access_codes')
          .select('id, source_package_id, code_label, status, expires_at, max_redemptions, redemption_count, max_redemptions_per_user, created_at, revoked_at')
          .order('created_at', { ascending: false }),
        sbAdmin
          .from('source_redemptions')
          .select('id, source_package_id, access_code_id, user_id, redeemed_at, status, profile:profiles!source_redemptions_user_id_fkey(email, full_name)')
          .order('redeemed_at', { ascending: false })
          .limit(200),
      ]);

      if (pErr) return json({ error: pErr.message }, 500);
      if (cErr) return json({ error: cErr.message }, 500);
      if (rErr) return json({ error: rErr.message }, 500);

      const now = Date.now();
      const pkgList = packages || [];
      const codeList = codes || [];
      const redList = redemptions || [];

      const overview = {
        totalPackages: pkgList.length,
        activePackages: pkgList.filter((p) => p.status === 'ACTIVE').length,
        lockedPackages: pkgList.filter((p) => p.status === 'INACTIVE' || p.status === 'ARCHIVED').length,
        totalRedemptions: codeList.reduce((acc, c) => acc + (c.redemption_count || 0), 0),
        activeCodes: codeList.filter((c) => c.status === 'ACTIVE' && (!c.expires_at || new Date(c.expires_at).getTime() > now)).length,
        expiredCodes: codeList.filter((c) => c.status === 'ACTIVE' && c.expires_at && new Date(c.expires_at).getTime() <= now).length,
      };

      return json({
        overview,
        packages: pkgList,
        codes: codeList,
        redemptions: redList.map((r) => ({
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
      const category = body.category ? String(body.category).trim() : null;
      const collectionId = body.collection_id ? String(body.collection_id).trim() : null;
      const version = body.version ? String(body.version).trim() : null;
      const deliveryType = body.delivery_type === 'LINK' ? 'LINK' : 'FILE';
      const status = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(String(body.status))
        ? String(body.status)
        : 'DRAFT';

      if (!name) return json({ error: 'Vui lòng nhập tên gói SRC.' }, 400);

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

      if (!packageId) return json({ error: 'Thiếu id gói SRC.' }, 400);
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
        .select()
        .single();

      if (updErr) return json({ error: updErr.message }, 400);

      // Clean up previous storage file if switching from FILE to LINK
      if (deliveryType === 'LINK' && existing.storage_path) {
        const { count } = await sbAdmin
          .from('source_packages')
          .select('id', { count: 'exact', head: true })
          .eq('storage_path', existing.storage_path);
        if ((count ?? 0) === 0) {
          await sbAdmin.storage.from('source-packages').remove([existing.storage_path]);
        }
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
      const expiresAt = body.expires_at ? String(body.expires_at) : null;
      const maxRedemptions = body.max_redemptions ? Number(body.max_redemptions) : null;
      const maxPerUser = body.max_redemptions_per_user ? Number(body.max_redemptions_per_user) : null;

      if (!packageId) return json({ error: 'Thiếu source_package_id.' }, 400);
      if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0)) {
        return json({ error: 'Giới hạn lượt nhận phải là số nguyên dương.' }, 400);
      }
      if (maxPerUser !== null && (!Number.isInteger(maxPerUser) || maxPerUser <= 0)) {
        return json({ error: 'Giới hạn mỗi tài khoản phải là số nguyên dương.' }, 400);
      }

      const plaintextCode = mode === 'manual'
        ? normalizeAccessCode(String(body.code || ''))
        : generateSecureAccessCode(12);

      const strengthErr = validateAccessCodeStrength(plaintextCode);
      if (strengthErr) return json({ error: strengthErr }, 400);

      const lookupDigest = await computeLookupDigest(plaintextCode, pepperSecret);
      const codeHash = await hashAccessCode(plaintextCode);
      const codeLabel = maskAccessCode(plaintextCode);

      if (revokeCodeId) {
        await sbAdmin
          .from('source_access_codes')
          .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
          .eq('id', revokeCodeId);

        await sbAdmin.from('audit_logs').insert({
          actor_user_id: callerId,
          action: 'ADMIN_SOURCE_CODE_REVOKE',
          entity_type: 'source_access_code',
          entity_id: revokeCodeId,
          metadata: { package_id: packageId, reason: 'rotate' },
        });
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

      // Return plaintextCode ONLY ONCE upon creation
      return json({ code: createdCode, plaintextCode });
    }

    if (action === 'revoke_code') {
      const codeId = String(body.code_id || '').trim();
      if (!codeId) return json({ error: 'Thiếu code_id.' }, 400);

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
