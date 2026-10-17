// 10 Curated color presets for Part of Speech badges
export const BADGE_COLORS = [
  { id: 'blue', name: 'Xanh dương (Blue)', bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200/90 dark:border-blue-800', hex: '#3b82f6' },
  { id: 'indigo', name: 'Chàm (Indigo)', bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200/90 dark:border-indigo-800', hex: '#6366f1' },
  { id: 'emerald', name: 'Lục bảo (Emerald)', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/90 dark:border-emerald-800', hex: '#10b981' },
  { id: 'amber', name: 'Vàng hổ phách (Amber)', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200/90 dark:border-amber-800', hex: '#f59e0b' },
  { id: 'rose', name: 'Đỏ hồng (Rose)', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200/90 dark:border-rose-800', hex: '#f43f5e' },
  { id: 'purple', name: 'Tím (Purple)', bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200/90 dark:border-purple-800', hex: '#a855f7' },
  { id: 'cyan', name: 'Xanh lơ (Cyan)', bg: 'bg-cyan-50 dark:bg-cyan-950/60', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200/90 dark:border-cyan-800', hex: '#06b6d4' },
  { id: 'teal', name: 'Xanh mòng két (Teal)', bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200/90 dark:border-teal-800', hex: '#14b8a6' },
  { id: 'orange', name: 'Cam (Orange)', bg: 'bg-orange-50 dark:bg-orange-950/60', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200/90 dark:border-orange-800', hex: '#f97316' },
  { id: 'slate', name: 'Ghi xám (Slate)', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700', hex: '#64748b' }
];

export const COMMON_POS_LIST = [
  'noun',
  'verb',
  'adj',
  'adv',
  'phrasal verb',
  'idiom',
  'collocation',
  'n',
  'v',
  'prep'
];

export const DEFAULT_POS_COLOR_MAP = {
  noun: 'emerald',
  n: 'emerald',
  'danh từ': 'emerald',
  verb: 'blue',
  v: 'blue',
  'động từ': 'blue',
  adj: 'amber',
  adjective: 'amber',
  'tính từ': 'amber',
  adv: 'purple',
  adverb: 'purple',
  'trạng từ': 'purple',
  'phrasal verb': 'cyan',
  idiom: 'rose',
  collocation: 'teal',
  prep: 'slate',
  preposition: 'slate',
  'giới từ': 'slate'
};

const POS_COLOR_STORAGE_KEY = 'app_pos_color_map';
const CUSTOM_POS_LIST_KEY = 'app_custom_pos_list';

export function getCustomPosList() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_POS_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading custom pos list:', e);
  }
  return [];
}

export function saveCustomPos(posName, colorId = 'emerald') {
  if (!posName || typeof window === 'undefined') return getCustomPosList();
  const name = posName.trim();
  if (!name) return getCustomPosList();

  // Save color mapping
  if (colorId) {
    savePosColor(name, colorId);
  }

  // Persist to custom pos list if not in COMMON_POS_LIST or already saved
  try {
    const current = getCustomPosList();
    const isCommon = COMMON_POS_LIST.some(p => p.toLowerCase() === name.toLowerCase());
    const exists = current.some(p => p.toLowerCase() === name.toLowerCase());

    let updated = current;
    if (!isCommon && !exists) {
      updated = [...current, name];
      localStorage.setItem(CUSTOM_POS_LIST_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error('Error saving custom pos:', e);
    return getCustomPosList();
  }
}

const DELETED_POS_LIST_KEY = 'app_deleted_pos_list';

export function getDeletedPosList() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_POS_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading deleted pos list:', e);
  }
  return [];
}

export function deleteCustomPos(posName) {
  if (!posName || typeof window === 'undefined') return getCustomPosList();
  const name = posName.trim().toLowerCase();
  try {
    const current = getCustomPosList();
    const updated = current.filter(p => p.toLowerCase() !== name);
    localStorage.setItem(CUSTOM_POS_LIST_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting custom pos:', e);
    return getCustomPosList();
  }
}

export function deletePos(posName) {
  if (!posName || typeof window === 'undefined') return getAllPosList();
  const name = posName.trim().toLowerCase();

  // Remove from custom pos list
  deleteCustomPos(name);

  // Add to deleted pos list so common defaults can also be hidden/deleted
  try {
    const deleted = getDeletedPosList();
    if (!deleted.includes(name)) {
      deleted.push(name);
      localStorage.setItem(DELETED_POS_LIST_KEY, JSON.stringify(deleted));
    }
  } catch (e) {
    console.error('Error adding to deleted pos list:', e);
  }

  return getAllPosList();
}

export function updateCustomPos(oldName, newName, newColorId = 'emerald') {
  if (!oldName || !newName || typeof window === 'undefined') return getAllPosList();
  const oldTrimmed = oldName.trim();
  const newTrimmed = newName.trim();

  // If name changed, delete old
  if (oldTrimmed.toLowerCase() !== newTrimmed.toLowerCase()) {
    deletePos(oldTrimmed);
  }

  // Undelete newName if it was marked as deleted
  try {
    const deleted = getDeletedPosList();
    const updatedDeleted = deleted.filter(p => p !== newTrimmed.toLowerCase());
    localStorage.setItem(DELETED_POS_LIST_KEY, JSON.stringify(updatedDeleted));
  } catch (e) {}

  // Save new name and color
  saveCustomPos(newTrimmed, newColorId);
  return getAllPosList();
}

export function getAllPosList() {
  const custom = getCustomPosList();
  const deleted = getDeletedPosList();
  const seen = new Set();
  const result = [];

  for (const pos of [...COMMON_POS_LIST, ...custom]) {
    const lower = pos.toLowerCase();
    if (!deleted.includes(lower) && !seen.has(lower)) {
      seen.add(lower);
      result.push(pos);
    }
  }
  return result;
}

export function getPosColorMap() {
  if (typeof window === 'undefined') return DEFAULT_POS_COLOR_MAP;
  try {
    const raw = localStorage.getItem(POS_COLOR_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_POS_COLOR_MAP, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading pos color map:', e);
  }
  return DEFAULT_POS_COLOR_MAP;
}

export function savePosColor(pos, colorId) {
  if (!pos || typeof window === 'undefined') return;
  const key = pos.trim().toLowerCase();
  if (!key) return;
  try {
    const map = getPosColorMap();
    map[key] = colorId;
    localStorage.setItem(POS_COLOR_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error saving pos color:', e);
  }
}

export function getColorForPos(pos, fallbackColorId = 'emerald') {
  if (!pos) return fallbackColorId;
  const key = pos.trim().toLowerCase();
  const map = getPosColorMap();
  return map[key] || fallbackColorId;
}

export function getBadgeColor(colorId, partOfSpeech = null) {
  const resolvedColorId = partOfSpeech ? getColorForPos(partOfSpeech, colorId) : colorId;
  return BADGE_COLORS.find(c => c.id === resolvedColorId) || BADGE_COLORS[0];
}


