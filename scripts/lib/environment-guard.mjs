/* global process, URL */
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function parseEnvContent(content = '') {
  const result = {};
  const lines = String(content).split(/\r?\n/);
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eqIndex = withoutExport.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = withoutExport.slice(0, eqIndex).trim();
    let val = withoutExport.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else {
      const commentIdx = val.indexOf(' #');
      if (commentIdx >= 0) val = val.slice(0, commentIdx).trim();
    }
    result[key] = val;
  }
  return result;
}

export function loadViteEffectiveEnv(rootDir, mode = 'development', baseEnv = process.env) {
  const files = [
    '.env',
    '.env.local',
    `.env.${mode}`,
    `.env.${mode}.local`,
  ];
  const merged = {};
  for (const rel of files) {
    const full = path.join(rootDir, rel);
    if (fs.existsSync(full)) {
      Object.assign(merged, parseEnvContent(fs.readFileSync(full, 'utf8')));
    }
  }
  for (const [k, v] of Object.entries(baseEnv || {})) {
    if (v !== undefined) merged[k] = v;
  }
  return merged;
}

export function readSupabaseProjectId(configTomlPath) {
  if (!fs.existsSync(configTomlPath)) {
    throw new Error(`Missing Supabase config file: ${configTomlPath}`);
  }
  const content = fs.readFileSync(configTomlPath, 'utf8');
  const match = content.match(/^\s*project_id\s*=\s*"([^"]+)"/m);
  return match ? match[1] : '';
}

export function assertEnvFileIsLocal(filePath, rootDir = process.cwd()) {
  if (!fs.existsSync(filePath)) return;
  const relPath = path.relative(rootDir, filePath) || filePath;
  const parsed = parseEnvContent(fs.readFileSync(filePath, 'utf8'));

  for (const envKey of ['APP_ENV', 'VITE_APP_ENV']) {
    const val = (parsed[envKey] || '').trim().toLowerCase();
    if (val === 'production' || val === 'staging') {
      throw new Error(
        `Environment guard blocked: ${relPath} defines ${envKey}=${val} (remote/production config cannot be used for local setup).`
      );
    }
  }

  for (const urlKey of ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'DATABASE_URL', 'DB_URL']) {
    const rawUrl = (parsed[urlKey] || '').trim();
    if (!rawUrl) continue;
    let u;
    try {
      u = new URL(rawUrl);
    } catch {
      throw new Error(`Environment guard blocked: ${relPath} has invalid URL in ${urlKey}.`);
    }
    if (!ALLOWED_LOCAL_HOSTS.has(u.hostname.toLowerCase())) {
      throw new Error(
        `Environment guard blocked: ${relPath} points ${urlKey} to non-local host "${u.hostname}".`
      );
    }
  }
}

export function assertLocalEnvironment({
  appEnv = 'development',
  supabaseUrl = '',
  dbUrl = '',
  operation = 'local-operation',
  expectedProjectId = '',
  actualProjectId = '',
  expectedApiPort = '',
  expectedDbPort = '',
} = {}) {
  const normalizedEnv = String(appEnv || '').trim().toLowerCase();
  if (normalizedEnv === 'production' || normalizedEnv === 'staging') {
    throw new Error(
      `ENV GUARD BLOCKED: Refusing "${operation}" because APP_ENV/VITE_APP_ENV="${appEnv}" is not local.`
    );
  }

  if (!supabaseUrl) {
    throw new Error(`ENV GUARD BLOCKED: Refusing "${operation}": missing SUPABASE_URL / VITE_SUPABASE_URL.`);
  }

  let parsedApi;
  try {
    parsedApi = new URL(supabaseUrl);
  } catch {
    throw new Error(`ENV GUARD BLOCKED: Refusing "${operation}": invalid SUPABASE_URL "${supabaseUrl}".`);
  }

  if (!ALLOWED_LOCAL_HOSTS.has(parsedApi.hostname.toLowerCase())) {
    throw new Error(
      `ENV GUARD BLOCKED: Refusing "${operation}" against remote host "${parsedApi.hostname}". Only localhost / 127.0.0.1 is allowed.`
    );
  }

  if (expectedApiPort && String(parsedApi.port || '') !== String(expectedApiPort)) {
    throw new Error(
      `ENV GUARD BLOCKED: Refusing "${operation}": expected local API port ${expectedApiPort}, got "${parsedApi.port || '(default)'}".`
    );
  }

  if (dbUrl) {
    let parsedDb;
    try {
      parsedDb = new URL(dbUrl);
    } catch {
      throw new Error(`ENV GUARD BLOCKED: Refusing "${operation}": invalid DB_URL.`);
    }
    if (!ALLOWED_LOCAL_HOSTS.has(parsedDb.hostname.toLowerCase())) {
      throw new Error(
        `ENV GUARD BLOCKED: Refusing "${operation}" against remote DB host "${parsedDb.hostname}".`
      );
    }
    if (expectedDbPort && String(parsedDb.port || '') !== String(expectedDbPort)) {
      throw new Error(
        `ENV GUARD BLOCKED: Refusing "${operation}": expected DB port ${expectedDbPort}, got "${parsedDb.port || '(default)'}".`
      );
    }
  }

  if (expectedProjectId && actualProjectId && expectedProjectId !== actualProjectId) {
    throw new Error(
      `ENV GUARD BLOCKED: Refusing "${operation}": expected Supabase project_id "${expectedProjectId}", got "${actualProjectId}".`
    );
  }

  return { hostname: parsedApi.hostname.toLowerCase(), appEnv: normalizedEnv };
}
