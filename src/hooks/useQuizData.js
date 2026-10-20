import { useState, useCallback, useEffect, useRef } from 'react';
import { loadData, saveData, ensureCollections } from '../data/storage';
import { checkAndCreateDailyBackup } from '../data/backupManager';
import {
  getRoomConfig, isConfigured, createRoom, finalizeRoom, joinRoom,
  pullRoomData, pushRoomData, schedulePush, startPolling, stopPolling,
  clearRoomConfig
} from '../data/supabaseSync';

export function useQuizData() {
  const [data, setData] = useState(() => {
    const d = loadData();
    const { data: migrated, changed } = ensureCollections(d);
    const backups = checkAndCreateDailyBackup(migrated);
    migrated.dailyBackups = backups;
    if (changed || (backups && backups.length > 0)) saveData(migrated);
    return migrated;
  });
  const [syncStatus, setSyncStatus] = useState(() => {
    if (!isConfigured()) return getRoomConfig() ? 'error' : 'unconfigured';
    return 'synced';
  });
  const dataRef = useRef(data);
  const mountedRef = useRef(false);

  const update = useCallback(async (newData) => {
    // Tự động sao lưu hàng ngày & xoay vòng retention (giữ tối đa 2 ngày gần nhất)
    const backups = checkAndCreateDailyBackup(newData);
    const dataWithBackups = { ...newData, dailyBackups: backups };

    dataRef.current = dataWithBackups;
    saveData(dataWithBackups);
    setData(dataWithBackups);
    const cfg = getRoomConfig();
    if (cfg && cfg.secret) {
      setSyncStatus('syncing');
      try {
        await pushRoomData(cfg.secret, dataWithBackups);
        setSyncStatus('synced');
      } catch (e) {
        console.error('Supabase push failed:', e);
        setSyncStatus('error');
      }
    }
  }, []);

  const refresh = useCallback(() => {
    const d = loadData();
    dataRef.current = d;
    setData(d);
    return d;
  }, []);

  // Kết nối cloud + subscribe realtime khi mở app.
  useEffect(() => {
    const cfg = getRoomConfig();
    if (!isConfigured() || !cfg) return;

    let active = true;

    (async () => {
      try {
        // Làm mới nhanh từ cloud (nếu có dữ liệu mới hơn).
        const { data: cloudData } = await pullRoomData(cfg.secret);
        if (!active) return;

        const hasCloudContent = cloudData && (
          (Array.isArray(cloudData.tests) && cloudData.tests.length > 0) ||
          (Array.isArray(cloudData.vocabDecks) && cloudData.vocabDecks.some(d => d.cards?.length > 0)) ||
          (Array.isArray(cloudData.history) && cloudData.history.length > 0)
        );
        const hasLocalContent = dataRef.current && (
          (Array.isArray(dataRef.current.tests) && dataRef.current.tests.length > 0) ||
          (Array.isArray(dataRef.current.vocabDecks) && dataRef.current.vocabDecks.some(d => d.cards?.length > 0)) ||
          (Array.isArray(dataRef.current.history) && dataRef.current.history.length > 0)
        );

        if (hasCloudContent) {
          const { data: normalized } = ensureCollections(cloudData);
          const backups = checkAndCreateDailyBackup(normalized);
          normalized.dailyBackups = backups;
          dataRef.current = normalized;
          saveData(normalized);
          setData(normalized);
        }
        // Nếu dữ liệu local có mà trên cloud chưa có (lần đầu khởi tạo), đẩy dữ liệu local lên cloud.
        else if (hasLocalContent) {
          await pushRoomData(cfg.secret, dataRef.current);
        }

        if (!active) return;
        setSyncStatus('synced');

        startPolling(cfg.secret, (update0) => {
          if (!active) return;
          if (update0.data) {
            const { data: normalized } = ensureCollections(update0.data);
            const backups = checkAndCreateDailyBackup(normalized);
            normalized.dailyBackups = backups;
            dataRef.current = normalized;
            saveData(normalized);
            setData(normalized);
          }
          setSyncStatus('synced');
        });
      } catch (_e) {
        if (active) setSyncStatus('error');
      }
    })();

    return () => {
      active = false;
      stopPolling();
    };
  }, []);

  // ---- Actions ----
  const doCreateRoom = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const { secret, room_id } = await createRoom();
      finalizeRoom(secret, room_id);
      // Đưa dữ liệu local hiện có lên phòng mới.
      await pushRoomData(secret, dataRef.current);
      startPolling(secret, (u) => {
        if (u.data) { const n = ensureCollections(u.data).data; dataRef.current = n; saveData(n); setData(n); }
        setSyncStatus('synced');
      });
      setSyncStatus('synced');
      return { secret, room_id };
    } catch (e) { setSyncStatus('error'); throw e; }
  }, []);

  const doJoinRoom = useCallback(async (secret) => {
    secret = (secret || '').trim();
    if (!secret) throw new Error('Vui lòng nhập mã phòng.');
    setSyncStatus('syncing');
    try {
      const cfg = getRoomConfig();
      if (cfg && cfg.room_id) stopPolling();
      const result = await joinRoom(secret);
      // Nếu phòng đã có dữ liệu → lấy cloud; nếu rỗng → đẩy local lên.
      const cloud = result.data;
      const hasCloud = cloud && (cloud.tests?.length || cloud.history?.length || cloud.vocabDecks?.length);
      const hasLocal = dataRef.current && (dataRef.current.tests?.length || dataRef.current.history?.length || dataRef.current.vocabDecks?.length);
      if (hasCloud) {
        const n = ensureCollections(cloud).data;
        dataRef.current = n; saveData(n); setData(n);
      } else if (hasLocal) {
        await pushRoomData(secret, dataRef.current);
      }
      const newCfg = getRoomConfig();
      if (newCfg) startPolling(newCfg.secret, (u) => {
        if (u.data) { const n = ensureCollections(u.data).data; dataRef.current = n; saveData(n); setData(n); }
        setSyncStatus('synced');
      });
      setSyncStatus('synced');
      return result;
    } catch (e) { setSyncStatus('error'); throw e; }
  }, []);

  const doDisconnectSync = useCallback(() => {
    stopPolling();
    clearRoomConfig();
    setSyncStatus('unconfigured');
  }, []);

  const doPush = useCallback(async () => {
    const cfg = getRoomConfig();
    if (!cfg || !cfg.secret) { setSyncStatus('unconfigured'); return; }
    setSyncStatus('syncing');
    try { await pushRoomData(cfg.secret, dataRef.current); setSyncStatus('synced'); }
    catch (e) { setSyncStatus('error'); throw e; }
  }, []);

  const doPull = useCallback(async () => {
    const cfg = getRoomConfig();
    if (!cfg || !cfg.secret) { setSyncStatus('unconfigured'); return; }
    setSyncStatus('syncing');
    try {
      const { data: cloud } = await pullRoomData(cfg.secret);
      if (cloud && (cloud.tests?.length || cloud.history?.length)) {
        const n = ensureCollections(cloud).data;
        dataRef.current = n; saveData(n); setData(n);
      }
      setSyncStatus('synced');
      return cloud;
    } catch (e) { setSyncStatus('error'); throw e; }
  }, []);

  return {
    data, update, refresh,
    syncStatus,
    doPush, doPull, doCreateRoom, doJoinRoom, doDisconnectSync,
    setSyncStatus
  };
}