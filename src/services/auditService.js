import { supabase, hasSupabase } from '../lib/supabase';

const ALLOWED_CLIENT_ACTIONS = new Set([
  'CLIENT_PREFERENCE_UPDATE',
  'CLIENT_PERSONAL_EXPORT',
]);

/**
 * Only non-sensitive client telemetry actions may be written by the client.
 * Security & Admin audit events are recorded exclusively by DB RPCs / Edge Functions.
 */
export async function recordClientAuditLog({ actorUserId, action, entityType, entityId = null, metadata = {} }) {
  if (!hasSupabase || !actorUserId || !ALLOWED_CLIENT_ACTIONS.has(action)) return;
  try {
    await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      metadata,
    });
  } catch (err) {
    console.warn('Client audit log skipped:', err?.message);
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
