import { supabase, hasSupabase } from './supabase';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Upload image through the trusted `media-upload` Supabase Edge Function.
 * Server enforces JWT, role/status, actual byte size (<=5MB), and file magic bytes.
 * In local/test environments, stores in local Supabase Storage; in production,
 * proxies server-side to Cloudinary. Zero secrets exist in the frontend.
 *
 * @param {File|Blob} file
 * @param {'vocab_flashcards'|'user_avatars'} [folder='vocab_flashcards']
 * @returns {Promise<string>} Public/secure URL of uploaded image
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

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const { data, error } = await supabase.functions.invoke('media-upload', {
    body: formData,
  });

  if (error || !data?.url) {
    throw new Error(error?.message || data?.error || 'Không thể tải ảnh lên máy chủ.');
  }

  return data.url;
}
