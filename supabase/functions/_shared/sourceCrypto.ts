const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const PBKDF2_ITERATIONS = 100_000;
const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function normalizeAccessCode(raw: string): string {
  return String(raw ?? '').trim();
}

export function validateAccessCodeStrength(code: string): string | null {
  if (!code) return 'Vui lòng nhập mã truy cập.';
  if (/\s/.test(code)) return 'Mã truy cập không được chứa khoảng trắng.';
  if (code.length < 8) return 'Mã truy cập phải có ít nhất 8 ký tự.';
  if (code.length > 64) return 'Mã truy cập không được vượt quá 64 ký tự.';
  if (!/^[\x21-\x7E]+$/.test(code)) return 'Mã truy cập chỉ được chứa ký tự ASCII hợp lệ.';
  return null;
}

export function generateSecureAccessCode(length = 12): string {
  const safeLen = Math.max(12, Math.min(32, length));
  const randomBytes = new Uint8Array(safeLen * 2);
  crypto.getRandomValues(randomBytes);
  let out = '';
  let idx = 0;
  while (out.length < safeLen) {
    if (idx >= randomBytes.length) {
      crypto.getRandomValues(randomBytes);
      idx = 0;
    }
    const byte = randomBytes[idx++];
    const maxValid = 256 - (256 % CODE_ALPHABET.length);
    if (byte < maxValid) {
      out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return out;
}

export function maskAccessCode(code: string): string {
  const clean = normalizeAccessCode(code);
  if (clean.length <= 4) return '****';
  return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
}

export async function computeLookupDigest(normalizedCode: string, pepperSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pepperSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(normalizedCode));
  return toHex(new Uint8Array(sig));
}

export async function hashAccessCode(normalizedCode: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(normalizedCode),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    256
  );
  return `pbkdf2_sha256$${toHex(salt)}$${toHex(new Uint8Array(bits))}`;
}

export async function verifyAccessCodeHash(normalizedCode: string, storedHash: string): Promise<boolean> {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2_sha256') return false;
  const salt = fromHex(parts[1]);
  const expected = fromHex(parts[2]);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(normalizedCode),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    256
  );
  return constantTimeEqual(new Uint8Array(bits), expected);
}

export function validateHttpsUrl(rawUrl: string): { ok: boolean; url?: string; error?: string } {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { ok: false, error: 'Vui lòng nhập liên kết HTTPS.' };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'URL không hợp lệ.' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Chỉ chấp nhận liên kết HTTPS an toàn (https://).' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'URL không được chứa thông tin đăng nhập.' };
  }
  return { ok: true, url: parsed.toString() };
}

export function validateZipBuffer(bytes: Uint8Array, fileName: string, maxBytes: number): string | null {
  const lowerName = String(fileName || '').trim().toLowerCase();
  if (!lowerName.endsWith('.zip')) {
    return 'Chỉ hỗ trợ tệp nén định dạng .zip.';
  }
  if (bytes.byteLength <= 0) {
    return 'Tệp tải lên bị rỗng.';
  }
  if (bytes.byteLength > maxBytes) {
    return `Dung lượng tệp vượt quá giới hạn cho phép (${Math.round(maxBytes / (1024 * 1024))} MB).`;
  }
  // ZIP magic bytes: PK\x03\x04 (local file header) or PK\x05\x06 (empty archive) or PK\x07\x08
  const isZipSig =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08));

  if (!isZipSig) {
    return 'Chữ ký tệp không phải định dạng ZIP hợp lệ.';
  }
  return null;
}

export function sanitizeSafeFileName(fileName: string): string {
  const base = String(fileName || 'source.zip').split(/[/\\]/).pop() || 'source.zip';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.+/g, '.');
  return cleaned.toLowerCase().endsWith('.zip') ? cleaned : `${cleaned}.zip`;
}
