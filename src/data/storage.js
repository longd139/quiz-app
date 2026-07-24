// Data storage helpers + model factories

const STORAGE_KEY = 'quiz_data';

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const data = JSON.parse(raw);
    return {
      collections: data.collections || [],
      tests: data.tests || [],
      history: data.history || [],
      settings: data.settings || { shuffleQuestions: true, shuffleOptions: false, practiceMode: 'submit' },
      questionStats: data.questionStats || {}
    };
  } catch (e) { return defaultData(); }
}

function defaultData() {
  return { collections: [], tests: [], history: [], settings: { shuffleQuestions: true, shuffleOptions: false, practiceMode: 'submit' }, questionStats: {} };
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function createQuestion() {
  return { id: uid(), prompt: '', options: [{ label: 'A', text: '' }, { label: 'B', text: '' }, { label: 'C', text: '' }, { label: 'D', text: '' }], correctIndices: [], explanation: '' };
}

export function createTest(name, collectionId) {
  const now = new Date().toISOString();
  return { id: uid(), name, collectionId: collectionId || null, questions: [], createdAt: now, updatedAt: now };
}

export function createCollection(name) {
  return { id: uid(), name, createdAt: new Date().toISOString() };
}

export function getCollectionName(collections, id) {
  const c = collections.find(c => c.id === id);
  return c ? c.name : 'Chưa phân loại';
}

// Migrate old tests without collectionId
export function ensureCollections(data) {
  let changed = false;
  const hasUnclassified = data.tests.some(t => !t.collectionId);
  if (hasUnclassified) {
    let uncat = data.collections.find(c => c.name === 'Chưa phân loại');
    if (!uncat) {
      uncat = createCollection('Chưa phân loại');
      data.collections.push(uncat);
      changed = true;
    }
    data.tests.forEach(t => { if (!t.collectionId) { t.collectionId = uncat.id; changed = true; } });
  }
  return { data, changed };
}

// Helpers
export function escHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function escAttr(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function truncate(s, max) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '...' : s;
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function getFilteredTests(data, collectionId) {
  if (!collectionId) return data.tests;
  return data.tests.filter(t => t.collectionId === collectionId);
}
