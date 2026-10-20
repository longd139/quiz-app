// Quản lý sao lưu dữ liệu tự động theo ngày (Daily Backup)
// Quy tắc Retention: Giữ tối đa 2 bản sao lưu của 2 ngày gần nhất (khi sang ngày thứ 3, xóa ngày thứ 1).

const BACKUP_STORAGE_KEY = 'quiz_daily_backups';
export const MAX_DAILY_BACKUPS = 2;

// Lấy ngày hiện tại theo chuẩn YYYY-MM-DD theo giờ địa phương
export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Đọc danh sách backup từ LocalStorage
export function loadLocalBackups() {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

// Lưu danh sách backup vào LocalStorage
export function saveLocalBackups(backups) {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
  } catch (_e) {}
}

// Tạo snapshot chuẩn từ data hiện tại (loại bỏ trường dailyBackups để không bị lặp lồng)
export function createDataSnapshot(data) {
  if (!data) return {};
  return {
    collections: data.collections ? JSON.parse(JSON.stringify(data.collections)) : [],
    tests: data.tests ? JSON.parse(JSON.stringify(data.tests)) : [],
    history: data.history ? JSON.parse(JSON.stringify(data.history)) : [],
    settings: data.settings ? JSON.parse(JSON.stringify(data.settings)) : { shuffleQuestions: true, shuffleOptions: false, practiceMode: 'submit' },
    questionStats: data.questionStats ? JSON.parse(JSON.stringify(data.questionStats)) : {},
    vocabCollections: data.vocabCollections ? JSON.parse(JSON.stringify(data.vocabCollections)) : [],
    vocabDecks: data.vocabDecks ? JSON.parse(JSON.stringify(data.vocabDecks)) : [],
    vocabStats: data.vocabStats ? JSON.parse(JSON.stringify(data.vocabStats)) : {},
    activityLog: data.activityLog ? JSON.parse(JSON.stringify(data.activityLog)) : {},
    mooskCount: typeof data.mooskCount === 'number' ? data.mooskCount : 0
  };
}

// Tính tóm tắt cho bản backup
export function getBackupSummary(snapshot) {
  const tests = snapshot.tests || [];
  const decks = snapshot.vocabDecks || [];
  return {
    testCount: tests.length,
    questionCount: tests.reduce((acc, t) => acc + (t.questions?.length || 0), 0),
    deckCount: decks.length,
    cardCount: decks.reduce((acc, d) => acc + (d.cards?.length || 0), 0),
    historyCount: (snapshot.history || []).length
  };
}

/**
 * Kiểm tra và tạo/cập nhật bản sao lưu của ngày hôm nay.
 * Áp dụng quy tắc xoay vòng (Retention Policy):
 * - Nếu có 3 ngày sao lưu -> Xóa ngày cũ nhất (ngày 1), chỉ giữ lại 2 ngày gần nhất (ngày 2 và 3).
 * Trả về danh sách backups mới nhất.
 */
export function checkAndCreateDailyBackup(currentData) {
  if (!currentData) return loadLocalBackups();

  const hasAnyData = (currentData.tests?.length > 0) ||
                     (currentData.vocabDecks?.length > 0) ||
                     (currentData.history?.length > 0);
  if (!hasAnyData) {
    return loadLocalBackups();
  }

  const today = getTodayDateString();
  const now = new Date().toISOString();

  // Kết hợp từ cả LocalStorage và data.dailyBackups (nếu có) để không bỏ sót bản nào
  let existingBackups = loadLocalBackups();
  if (Array.isArray(currentData.dailyBackups) && currentData.dailyBackups.length > 0) {
    const map = new Map();
    existingBackups.forEach(b => map.set(b.date, b));
    currentData.dailyBackups.forEach(b => {
      if (!map.has(b.date) || new Date(b.updatedAt || 0) > new Date(map.get(b.date).updatedAt || 0)) {
        map.set(b.date, b);
      }
    });
    existingBackups = Array.from(map.values());
  }

  // Sắp xếp các bản backup theo ngày giảm dần (mới nhất lên đầu)
  existingBackups.sort((a, b) => b.date.localeCompare(a.date));

  const snapshot = createDataSnapshot(currentData);
  const summary = getBackupSummary(snapshot);

  const existingTodayIndex = existingBackups.findIndex(b => b.date === today);

  if (existingTodayIndex >= 0) {
    // Đã có bản backup hôm nay -> Cập nhật lại snapshot mới nhất của ngày hôm nay
    existingBackups[existingTodayIndex] = {
      ...existingBackups[existingTodayIndex],
      updatedAt: now,
      summary,
      data: snapshot
    };
  } else {
    // Chưa có bản backup hôm nay -> Tạo mới bản backup cho ngày hôm nay
    const newBackup = {
      id: `backup_${today}`,
      date: today,
      createdAt: now,
      updatedAt: now,
      summary,
      data: snapshot
    };
    existingBackups.unshift(newBackup);
  }

  // Sắp xếp lại theo thứ tự ngày mới nhất -> cũ hơn
  existingBackups.sort((a, b) => b.date.localeCompare(a.date));

  // Áp dụng Retention: Giữ tối đa MAX_DAILY_BACKUPS (2 bản của 2 ngày gần nhất).
  // Khi sang ngày thứ 3, bản backup của ngày thứ 1 sẽ tự động bị cắt bỏ (xóa vĩnh viễn).
  if (existingBackups.length > MAX_DAILY_BACKUPS) {
    existingBackups = existingBackups.slice(0, MAX_DAILY_BACKUPS);
  }

  saveLocalBackups(existingBackups);
  return existingBackups;
}

/**
 * Khôi phục dữ liệu từ một bản backup
 */
export function restoreFromBackup(backupItem, currentData, updateFn) {
  if (!backupItem || !backupItem.data) {
    throw new Error('Dữ liệu bản sao lưu không hợp lệ.');
  }

  const restoredData = createDataSnapshot(backupItem.data);

  // Bảo toàn danh sách backup hiện có
  const currentBackups = loadLocalBackups();
  restoredData.dailyBackups = currentBackups;

  updateFn(restoredData);
  return restoredData;
}
