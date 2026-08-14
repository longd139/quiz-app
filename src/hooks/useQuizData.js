import { useState, useCallback, useEffect, useRef } from 'react';
import { loadData, saveData, ensureCollections } from '../data/storage';
import {
  getRoomConfig, isConfigured, createRoom, finalizeRoom, joinRoom,
  pullRoomData, pushRoomData, schedulePush, startPolling, stopPolling,
  clearRoomConfig
} from '../data/supabaseSync';

export function useQuizData() {
  const [data, setData] = useState(() => {
    const d = loadData();
    const { data: migrated, changed } = ensureCollections(d);
    if (changed) saveData(migrated);
    return migrated;
  });
  const [syncStatus, setSyncStatus] = useState(() => {
    if (!isConfigured()) return getRoomConfig() ? 'error' : 'unconfigured';
    return 'synced';
  });
  const dataRef = useRef(data);
  const mountedRef = useRef(false);

  const update = useCallback((newData) => {
    dataRef.current = newData;
    saveData(newData);
    setData(newData);
    const cfg = getRoomConfig();
    if (cfg && cfg.secret) schedulePush(cfg.secret, newData);
  }, []);

  const refresh = useCallback(() => {
    const d = loadData();
    dataRef.current = d;
    setData(d);
    return d;
  }, []);

  // Kết nối cloud + subscribe realtime khi mở app.
  useEffect(() => {
    if (mountedRef.current) return;
    const cfg = getRoomConfig();
    if (!isConfigured() || !cfg) return;
    mountedRef.current = true;

    let active = true;
    setSyncStatus('syncing');

    (async () => {
      try {
        // Làm mới nhanh từ cloud (nếu có dữ liệu mới hơn).
        const { data: cloudData } = await pullRoomData(cfg.secret);
        if (active && cloudData && (cloudData.tests?.length || cloudData.history?.length)) {
          dataRef.current = cloudData;
          saveData(cloudData);
          setData(cloudData);
        }
        // Nếu dữ liệu local chưa có trên cloud, đẩy lên.
        else if (active && dataRef.current && (dataRef.current.tests?.length || dataRef.current.history?.length)) {
          await pushRoomData(cfg.secret, dataRef.current);
        }
      } catch (_e) {
        setSyncStatus('error');
      }

      if (!active) return;
      startPolling(cfg.secret, (update0) => {
        if (update0.data) {
          const { data: normalized } = ensureCollections(update0.data);
          dataRef.current = normalized;
          saveData(normalized);
          setData(normalized);
        }
        setSyncStatus('synced');
      });
      setSyncStatus('synced');
    })();

    return () => { active = false; };
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
      const hasCloud = cloud && (cloud.tests?.length || cloud.history?.length);
      const hasLocal = dataRef.current && (dataRef.current.tests?.length || dataRef.current.history?.length);
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