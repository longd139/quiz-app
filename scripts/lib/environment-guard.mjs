/* global process, URL */
/**
 * Production Protection Guard (Phase 02.5)
 * Ensures local/test scripts NEVER target a remote or production Supabase/PostgreSQL host.
 */

const ALLOWED_LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', 'host.docker.internal']);

export function assertLocalEnvironment({
  appEnv = process.env.VITE_APP_ENV || process.env.APP_ENV || process.env.NODE_ENV || 'development',
  supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '',
  operation = 'local database operation',
} = {}) {
  const normalizedEnv = String(appEnv).toLowerCase();
  if (normalizedEnv === 'production' || normalizedEnv === 'prod' || normalizedEnv === 'staging') {
    throw new Error(
      `[ENV GUARD BLOCKED] Refusing "${operation}" because APP_ENV="${appEnv}" is not local development/test.`
    );
  }

  if (!supabaseUrl) {
    throw new Error(
      `[ENV GUARD BLOCKED] Refusing "${operation}" because SUPABASE_URL / VITE_SUPABASE_URL is missing.`
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error(`[ENV GUARD BLOCKED] Invalid Supabase URL "${supabaseUrl}" for "${operation}".`);
  }

  if (!ALLOWED_LOCAL_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(
      `[ENV GUARD BLOCKED] Remote Supabase host "${parsedUrl.hostname}" is forbidden for "${operation}". Only localhost/127.0.0.1 is allowed.`
    );
  }

  if (dbUrl) {
    let parsedDb;
    try {
      parsedDb = new URL(dbUrl);
    } catch {
      throw new Error(`[ENV GUARD BLOCKED] Invalid DATABASE_URL for "${operation}".`);
    }
    if (!ALLOWED_LOCAL_HOSTS.has(parsedDb.hostname)) {
      throw new Error(
        `[ENV GUARD BLOCKED] Remote PostgreSQL host "${parsedDb.hostname}" is forbidden for "${operation}".`
      );
    }
  }

  return {
    appEnv: normalizedEnv,
    hostname: parsedUrl.hostname,
    supabaseUrl,
  };
}
