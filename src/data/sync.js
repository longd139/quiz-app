import { loadData, saveData } from './storage';

const GIST_API = 'https://api.github.com/gists';
const GIST_FILENAME = 'quiz-data.json';
const GIST_DESC = 'Quiz Luyện Tập - Data';
const SYNC_KEY = 'quiz_sync_config';

export function getSyncConfig() {
  try { const raw = localStorage.getItem(SYNC_KEY); if (!raw) return null; return JSON.parse(raw); } catch (e) { return null; }
}

export function setSyncConfig(config) { localStorage.setItem(SYNC_KEY, JSON.stringify(config)); }

export function clearSyncConfig() { localStorage.removeItem(SYNC_KEY); }

export function isSyncConfigured() {
  const cfg = getSyncConfig();
  return !!(cfg && cfg.github_token && cfg.gist_id);
}

async function gistRequest(method, url, token, body) {
  const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json' };
  const opts = { method, headers };
  if (body) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(url, opts);
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'HTTP ' + res.status + ' ' + res.statusText); }
  return res.json();
}

export async function createGist(token, data) {
  const body = { description: GIST_DESC, public: false, files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } } };
  const result = await gistRequest('POST', GIST_API, token, body);
  return result.id;
}

export async function readGist(token, gistId) {
  const gist = await gistRequest('GET', GIST_API + '/' + gistId, token);
  const file = gist.files && gist.files[GIST_FILENAME];
  if (!file) throw new Error('Gist không chứa file ' + GIST_FILENAME);
  let data;
  try {
    data = JSON.parse(file.content);
    if (!data.collections) data.collections = [];
    if (!data.tests) data.tests = [];
    if (!data.history) data.history = [];
    if (!data.settings) data.settings = { shuffleQuestions: true, shuffleOptions: false, practiceMode: 'submit' };
    if (!data.questionStats) data.questionStats = {};
  } catch (e) { throw new Error('Dữ liệu trong Gist không phải JSON hợp lệ.'); }
  return { data, updatedAt: gist.updated_at };
}

export async function updateGist(token, gistId, data) {
  const body = { files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } } };
  const result = await gistRequest('PATCH', GIST_API + '/' + gistId, token, body);
  return result.updated_at;
}

let pushTimer = null;

export function schedulePush(delayMs = 2000) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushToCloud(), delayMs);
}

export async function pushToCloud() {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.github_token || !cfg.gist_id) return;
  try {
    const data = loadData();
    const updatedAt = await updateGist(cfg.github_token, cfg.gist_id, data);
    cfg.last_pushed_at = updatedAt || new Date().toISOString();
    cfg.last_synced_at = new Date().toISOString();
    setSyncConfig(cfg);
    return 'synced';
  } catch (e) { console.error('Push failed:', e); throw e; }
}

export async function pullFromCloud() {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.github_token || !cfg.gist_id) return;
  try {
    const result = await readGist(cfg.github_token, cfg.gist_id);
    saveData(result.data);
    cfg.last_synced_at = result.updatedAt || new Date().toISOString();
    setSyncConfig(cfg);
    return result.data;
  } catch (e) { console.error('Pull failed:', e); throw e; }
}

export async function autoSync() {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.github_token || !cfg.gist_id) return 'unconfigured';
  try {
    const result = await readGist(cfg.github_token, cfg.gist_id);
    const gistTime = new Date(result.updatedAt).getTime();
    const localTime = cfg.last_synced_at ? new Date(cfg.last_synced_at).getTime() : 0;
    if (gistTime > localTime) {
      const localData = loadData();
      const localHasContent = localData.tests.length > 0 || localData.history.length > 0;
      if (localHasContent && JSON.stringify(localData) !== JSON.stringify(result.data)) {
        return { conflict: true, cloudData: result.data, localData };
      }
      saveData(result.data);
      cfg.last_synced_at = result.updatedAt;
      setSyncConfig(cfg);
      return { pulled: true, data: result.data };
    } else if (gistTime < localTime) {
      await pushToCloud();
      return { pushed: true };
    }
    cfg.last_synced_at = new Date().toISOString();
    setSyncConfig(cfg);
    return 'synced';
  } catch (e) { console.error('Auto-sync failed:', e); throw e; }
}
