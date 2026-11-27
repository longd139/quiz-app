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
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
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
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? '';
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY') ?? '';
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET') ?? '';

  if (!url || !serviceKey) return json({ error: 'Supabase server env not configured.' }, 500);
  if (!cloudName || !apiKey || !apiSecret) {
    return json({ error: 'Cloudinary server secrets are not configured.' }, 500);
  }

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
    .select('id, role, status')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || profile.status !== 'ACTIVE') {
    return json({ error: 'Tài khoản bị khóa hoặc không hoạt động.' }, 403);
  }

  if (!checkRateLimit(userId)) {
    return json({ error: 'Quá nhiều yêu cầu tải ảnh. Vui lòng thử lại sau.' }, 429);
  }

  let body: { folder?: string; mimeType?: string; fileSize?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON không hợp lệ.' }, 400);
  }

  const folder = String(body.folder ?? 'vocab_flashcards').trim();
  if (!ALLOWED_FOLDERS.has(folder)) {
    return json({ error: 'Thư mục upload không được phép.' }, 400);
  }

  // Only ADMIN can upload shared flashcard images
  if (folder === 'vocab_flashcards' && profile.role !== 'ADMIN') {
    return json({ error: 'Chỉ Quản trị viên mới được tải ảnh lên nội dung chung.' }, 403);
  }

  if (body.mimeType && !ALLOWED_MIME_TYPES.has(body.mimeType)) {
    return json({ error: 'Định dạng ảnh không hợp lệ (chỉ hỗ trợ JPG, PNG, WebP, GIF).' }, 400);
  }
  if (typeof body.fileSize === 'number' && body.fileSize > MAX_FILE_SIZE_BYTES) {
    return json({ error: 'Kích thước ảnh vượt quá giới hạn 5MB.' }, 400);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = await sha1Hex(stringToSign);

  await sbAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    action: 'CLOUDINARY_UPLOAD_SIGN',
    entity_type: 'media',
    entity_id: folder,
    metadata: { folder, mimeType: body.mimeType ?? null },
  });

  return json({
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
  });
});
