import { supabase, hasSupabase } from '../lib/supabase';

const SENSITIVE_KEYS = new Set([
  'password',
  'temp_password',
  'temporary_password',
  'access_token',
  'refresh_token',
  'api_secret',
  'room_secret',
  'roomSecret',
  'service_role_key',
]);

function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    clean[k] = v;
  }
  return clean;
}

export async function recordCentralAuditLog({ actorUserId, action, entityType, entityId = null, metadata = {} }) {
  if (!hasSupabase || !actorUserId) return;
  try {
    await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      metadata: sanitizeMetadata(metadata),
    });
  } catch (err) {
    console.warn('Audit log write skipped:', err?.message);
  }
}

export async function fetchAuditLogs({ action = 'ALL', search = '', page = 1, pageSize = 30 } = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*, actor:profiles!audit_logs_actor_user_id_fkey(email, full_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (action !== 'ALL') {
    query = query.ilike('action', `%${action}%`);
  }
  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`action.ilike.${term},entity_type.ilike.${term},entity_id.ilike.${term}`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { logs: data || [], total: count ?? 0 };
}
