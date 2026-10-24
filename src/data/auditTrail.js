// Engine ghi nhận và quản lý Nhật ký kiểm toán chi tiết (Audit Trail)
// Lưu vết mọi hành động: tạo/sửa/xóa từ vựng, bộ từ, bài test, request đồng bộ Cloud, sao lưu/khôi phục.

const AUDIT_STORAGE_KEY = 'quiz_audit_trail_events';
const MAX_AUDIT_LOGS = 500;

export const AUDIT_CATEGORIES = {
  VOCAB: 'vocab',     // Thao tác từ vựng & bộ từ
  TEST: 'test',       // Thao tác bài test & câu hỏi
  SYNC: 'sync',       // Request đồng bộ Cloud Supabase
  BACKUP: 'backup',   // Sao lưu, khôi phục & nhập/xuất file
};

export const AUDIT_TYPES = {
  // Từ vựng
  VOCAB_CARD_CREATE: 'VOCAB_CARD_CREATE',
  VOCAB_CARD_UPDATE: 'VOCAB_CARD_UPDATE',
  VOCAB_CARD_DELETE: 'VOCAB_CARD_DELETE',
  VOCAB_DECK_CREATE: 'VOCAB_DECK_CREATE',
  VOCAB_DECK_UPDATE: 'VOCAB_DECK_UPDATE',
  VOCAB_DECK_DELETE: 'VOCAB_DECK_DELETE',
  VOCAB_COLLECTION_CREATE: 'VOCAB_COLLECTION_CREATE',

  // Bài test & câu hỏi
  TEST_CREATE: 'TEST_CREATE',
  TEST_UPDATE: 'TEST_UPDATE',
  TEST_DELETE: 'TEST_DELETE',
  QUESTION_ADD: 'QUESTION_ADD',
  QUESTION_DELETE: 'QUESTION_DELETE',

  // Đồng bộ Cloud (Supabase RPC)
  CLOUD_PUSH: 'CLOUD_PUSH',
  CLOUD_PULL: 'CLOUD_PULL',
  CLOUD_JOIN_ROOM: 'CLOUD_JOIN_ROOM',
  CLOUD_CREATE_ROOM: 'CLOUD_CREATE_ROOM',
  CLOUD_DISCONNECT: 'CLOUD_DISCONNECT',

  // Sao lưu & Tệp
  DATA_IMPORT: 'DATA_IMPORT',
  DATA_EXPORT: 'DATA_EXPORT',
  BACKUP_CREATE: 'BACKUP_CREATE',
  BACKUP_RESTORE: 'BACKUP_RESTORE',
  BACKUP_DELETE: 'BACKUP_DELETE',
};

/**
 * Đọc danh sách sự kiện audit từ localStorage
 */
export function loadAuditLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    return [];
  }
}

/**
 * Ghi nhận một sự kiện chi tiết vào Nhật ký kiểm toán
 * @param {Object} entry
 * @param {string} entry.type - Một trong các giá trị AUDIT_TYPES
 * @param {string} entry.title - Tiêu đề ngắn gọn của sự kiện
 * @param {Object|string} entry.detail - Thông tin chi tiết (từ vựng, định nghĩa, số lượng, v.v.)
 * @param {string} [entry.category] - Phân loại (vocab, test, sync, backup)
 * @param {'success'|'error'|'info'|'warning'} [entry.status='success'] - Trạng thái
 */
export function recordAuditLog({
  type,
  title,
  detail = {},
  category = AUDIT_CATEGORIES.VOCAB,
  status = 'success'
}) {
  try {
    const now = new Date();
    const newEntry = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      timestamp: now.toISOString(),
      localTime: now.toLocaleString('vi-VN'),
      type: type || 'SYSTEM_EVENT',
      title: title || 'Hành động hệ thống',
      detail: typeof detail === 'object' && detail !== null ? detail : { message: String(detail) },
      category,
      status
    };

    const currentLogs = loadAuditLogs();
    const updatedLogs = [newEntry, ...currentLogs].slice(0, MAX_AUDIT_LOGS);

    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updatedLogs));

    // Bắn event để UI cập nhật ngay lập tức nếu đang mở
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('quiz_audit_updated', { detail: newEntry }));
    }

    return newEntry;
  } catch (err) {
    console.error('Failed to record audit log:', err);
    return null;
  }
}

/**
 * Xóa toàn bộ lịch sử audit log
 */
export function clearAuditLogs() {
  try {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('quiz_audit_updated'));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Xuất audit logs thành file JSON
 */
export function exportAuditLogs() {
  const logs = loadAuditLogs();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      totalEvents: logs.length,
      events: logs
    },
    null,
    2
  );
}
