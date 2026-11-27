import { supabase, hasSupabase } from './supabase';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Upload image to Cloudinary using a server-signed signature from the
 * `cloudinary-sign` Supabase Edge Function.
 * No Cloudinary API Secret is ever stored or used in the frontend.
 *
 * @param {File|Blob} file
 * @param {'vocab_flashcards'|'user_avatars'} [folder='vocab_flashcards']
 * @returns {Promise<string>} secure_url of uploaded image
 */
export async function uploadToCloudinary(file, folder = 'vocab_flashcards') {
  if (!hasSupabase) {
    throw new Error('Chưa cấu hình Supabase để xác thực tải ảnh.');
  }
  if (!file) {
    throw new Error('Không có tệp ảnh nào được chọn.');
  }

  const mimeType = file.type || 'image/png';
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('Định dạng ảnh không hợp lệ. Chỉ hỗ trợ JPG, PNG, WebP hoặc GIF.');
  }
  if (typeof file.size === 'number' && file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Kích thước ảnh vượt quá giới hạn 5MB.');
  }

  const { data: signData, error: signErr } = await supabase.functions.invoke('cloudinary-sign', {
    body: {
      folder,
      mimeType,
      fileSize: file.size,
    },
  });

  if (signErr || !signData?.signature) {
    throw new Error(signErr?.message || signData?.error || 'Không thể lấy chữ ký tải ảnh từ máy chủ.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signData.apiKey);
  formData.append('timestamp', String(signData.timestamp));
  formData.append('signature', signData.signature);
  formData.append('folder', signData.folder);
  if (signData.allowedFormats) {
    formData.append('allowed_formats', signData.allowedFormats);
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Lỗi tải ảnh lên Cloudinary (${res.status})`);
  }

  return data.secure_url || data.url;
}
