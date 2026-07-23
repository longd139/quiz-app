import { useState, useCallback, useEffect, useRef } from 'react';
import { loadData, saveData, ensureCollections, uid } from '../data/storage';
import { getSyncConfig, setSyncConfig, isSyncConfigured, schedulePush, pushToCloud, pullFromCloud, autoSync, clearSyncConfig, createGist } from '../data/sync';

export function useQuizData() {
  const [data, setData] = useState(() => {
    const d = loadData();
    const { data: migrated, changed } = ensureCollections(d);
    if (changed) saveData(migrated);
    return migrated;
  });
  const [syncStatus, setSyncStatus] = useState(() => isSyncConfigured() ? 'synced' : (getSyncConfig() ? 'error' : 'unconfigured'));
  const conflictRef = useRef(null);

  const update = useCallback((newData) => {
    saveData(newData);
    setData(newData);
    if (isSyncConfigured()) schedulePush(2000);
  }, []);

  const refresh = useCallback(() => {
    const d = loadData();
    setData(d);
    return d;
  }, []);

  // Auto-sync on mount
  useEffect(() => {
    if (!isSyncConfigured()) return;
    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        const result = await autoSync();
        if (result === 'synced' || result?.pushed) {
          setSyncStatus('synced');
        } else if (result?.pulled) {
          setData(result.data);
          setSyncStatus('synced');
        } else if (result?.conflict) {
          conflictRef.current = result;
          setSyncStatus('conflict');
        }
      } catch (e) { setSyncStatus('error'); }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Sync actions
  const doPush = useCallback(async () => {
    setSyncStatus('syncing');
    try { await pushToCloud(); setSyncStatus('synced'); }
    catch (e) { setSyncStatus('error'); throw e; }
  }, []);

  const doPull = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const result = await pullFromCloud();
      setData(result);
      setSyncStatus('synced');
    } catch (e) { setSyncStatus('error'); throw e; }
  }, []);

  const resolveConflict = useCallback((useCloud) => {
    const conflict = conflictRef.current;
    if (!conflict) return;
    if (useCloud) {
      saveData(conflict.cloudData);
      setData(conflict.cloudData);
    } else {
      // Push local to cloud
      schedulePush(500);
    }
    conflictRef.current = null;
    setSyncStatus('synced');
  }, []);

  const doSetupSync = useCallback(async (token) => {
    token = token.trim();
    if (!token) throw new Error('Vui lòng nhập GitHub token.');
    setSyncStatus('syncing');
    try {
      const currentData = loadData();
      const gistId = await createGist(token, currentData);
      const cfg = { github_token: token, gist_id: gistId, last_synced_at: new Date().toISOString(), last_pushed_at: new Date().toISOString() };
      setSyncConfig(cfg);
      setSyncStatus('synced');
    } catch (e) { setSyncStatus('error'); throw e; }
  }, []);

  const doDisconnectSync = useCallback(() => {
    clearSyncConfig();
    setSyncStatus('unconfigured');
  }, []);

  return {
    data, update, refresh,
    syncStatus, conflictRef,
    doPush, doPull, doSetupSync, doDisconnectSync, resolveConflict,
    setSyncStatus
  };
}
