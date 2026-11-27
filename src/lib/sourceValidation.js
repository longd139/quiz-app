export const MAX_SOURCE_FILE_BYTES = 20 * 1024 * 1024; // 20 MB configurable limit

export function normalizeAccessCodeInput(raw = '') {
  return String(raw || '').trim();
}

export function validateAccessCodeInput(raw = '') {
  const code = normalizeAccessCodeInput(raw);
  if (!code) return 'Vui lòng nhập mã truy cập.';
  if (/\s/.test(code)) return 'Mã truy cập không được chứa khoảng trắng.';
  if (code.length < 8) return 'Mã truy cập phải có ít nhất 8 ký tự.';
  if (code.length > 64) return 'Mã truy cập không được vượt quá 64 ký tự.';
  if (!/^[\x21-\x7E]+$/.test(code)) return 'Mã truy cập chỉ được chứa ký tự ASCII hợp lệ.';
  return null;
}

export function validateExternalHttpsUrl(rawUrl = '') {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { ok: false, error: 'Vui lòng nhập liên kết HTTPS.' };
  let parsed;
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

export function validateSourceZipFile(file, maxBytes = MAX_SOURCE_FILE_BYTES) {
  if (!file) return 'Vui lòng chọn tệp .zip.';
  const name = String(file.name || '').trim().toLowerCase();
  if (!name.endsWith('.zip')) return 'Chỉ hỗ trợ tệp nén định dạng .zip.';
  if (typeof file.size === 'number') {
    if (file.size <= 0) return 'Tệp tải lên bị rỗng.';
    if (file.size > maxBytes) {
      return `Dung lượng tệp vượt quá ${Math.round(maxBytes / (1024 * 1024))} MB.`;
    }
  }
  return null;
}

export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return '—';
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function isAccessCodeExpired(expiresAt, nowMs = Date.now()) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= nowMs;
}

export function isAccessCodeExhausted(redemptionCount, maxRedemptions) {
  if (maxRedemptions === null || maxRedemptions === undefined) return false;
  return Number(redemptionCount || 0) >= Number(maxRedemptions);
}
