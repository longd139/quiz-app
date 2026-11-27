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

const ALLOWED_FOLDERS = new Set(['vocab_flashcards', 'user_avatars']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const rateBucket = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateBucket.get(userId);
  if (!entry || now > entry.resetAt) {
    rateBucket.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count += 1;
  return true;
}

function detectImageType(bytes: Uint8Array): { ext: string; mime: string } | null {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  // GIF: GIF87a / GIF89a
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return { ext: 'gif', mime: 'image/gif' };
  }
  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

async function sha1Hex(message: string): Promise<string> {
  const bytes = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: 'Supabase server env not configured.' }, 500);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userRes, error: authErr } = await sbAdmin.auth.getUser(token);
  if (authErr || !userRes?.user) {
    return json({ error: 'Phiên đăng nhập không hợp lệ.' }, 401);
  }

  const userId = userRes.user.id;
  const { data: profile } = await sbAdmin
    .from('profiles')
    .select('id, role, status, must_change_password')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || profile.status !== 'ACTIVE' || profile.must_change_password) {
    return json({ error: 'Tài khoản bị khóa hoặc cần đổi mật khẩu trước khi tải ảnh.' }, 403);
  }

  if (!checkRateLimit(userId)) {
    return json({ error: 'Quá nhiều yêu cầu tải ảnh. Vui lòng thử lại sau.' }, 429);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json({ error: 'Yêu cầu phải là multipart/form-data.' }, 400);
  }

  const folder = String(formData.get('folder') ?? 'vocab_flashcards').trim();
  if (!ALLOWED_FOLDERS.has(folder)) {
    return json({ error: 'Thư mục upload không được phép.' }, 400);
  }
  if (folder === 'vocab_flashcards' && profile.role !== 'ADMIN') {
    return json({ error: 'Chỉ Quản trị viên mới được tải ảnh lên nội dung chung.' }, 403);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return json({ error: 'Thiếu tệp ảnh hợp lệ.' }, 400);
  }

  // Enforce actual byte length server-side (never trust client-declared file.size)
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes.byteLength === 0) {
    return json({ error: 'Tệp ảnh rỗng.' }, 400);
  }
  if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    return json({ error: 'Kích thước ảnh thực tế vượt quá giới hạn 5MB.' }, 413);
  }

  // Enforce actual file magic bytes (never trust client-declared MIME type)
  const detected = detectImageType(bytes);
  if (!detected) {
    return json({ error: 'Nội dung tệp không phải ảnh hợp lệ (chỉ hỗ trợ JPG, PNG, WebP, GIF).' }, 400);
  }

  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? '';
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY') ?? '';
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET') ?? '';
  const isLocalSupabase = url.includes('127.0.0.1') || url.includes('localhost') || url.includes('kong:');

  // Local / Test mode: store in local Supabase Storage bucket `quiz_media`
  if (isLocalSupabase || (!cloudName && !apiKey && !apiSecret)) {
    // Ensure bucket exists
    await sbAdmin.storage.createBucket('quiz_media', { public: true }).catch(() => {});
    const objectPath = `${folder}/${userId}/${crypto.randomUUID()}.${detected.ext}`;
    const { error: upErr } = await sbAdmin.storage
      .from('quiz_media')
      .upload(objectPath, bytes, { contentType: detected.mime, upsert: false });

    if (upErr) {
      return json({ error: 'Lỗi lưu ảnh local: ' + upErr.message }, 500);
    }

    const { data: pub } = sbAdmin.storage.from('quiz_media').getPublicUrl(objectPath);

    await sbAdmin.from('audit_logs').insert({
      actor_user_id: userId,
      action: 'MEDIA_UPLOAD_LOCAL',
      entity_type: 'media',
      entity_id: objectPath,
      metadata: { folder, mime: detected.mime, sizeBytes: bytes.byteLength },
    });

    return json({ url: pub.publicUrl, adapter: 'local-supabase' });
  }

  // Production Cloudinary server-side upload proxy
  if (!cloudName || !apiKey || !apiSecret) {
    return json({ error: 'Cloudinary server secrets are not configured.' }, 500);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const allowedFormats = 'jpg,png,webp,gif';
  const stringToSign = `allowed_formats=${allowedFormats}&folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = await sha1Hex(stringToSign);

  const cloudForm = new FormData();
  cloudForm.append('file', new Blob([bytes], { type: detected.mime }), `upload.${detected.ext}`);
  cloudForm.append('api_key', apiKey);
  cloudForm.append('timestamp', String(timestamp));
  cloudForm.append('signature', signature);
  cloudForm.append('folder', folder);
  cloudForm.append('allowed_formats', allowedFormats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: cloudForm,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return json({ error: data?.error?.message || `Lỗi tải ảnh lên Cloudinary (${res.status})` }, 502);
  }

  await sbAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    action: 'CLOUDINARY_UPLOAD_PROXY',
    entity_type: 'media',
    entity_id: folder,
    metadata: { folder, mime: detected.mime, sizeBytes: bytes.byteLength },
  });

  return json({ url: data.secure_url || data.url, adapter: 'cloudinary' });
});
