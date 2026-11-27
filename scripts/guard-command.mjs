/* global process, console */
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import {
  assertEnvFileIsLocal,
  assertLocalEnvironment,
  loadViteEffectiveEnv,
  readSupabaseProjectId,
} from './lib/environment-guard.mjs';

const rootDir = process.cwd();
const [, , target, ...restArgs] = process.argv;

function checkLocalConfigToml(workdir = '.', expectedProjectId = 'quiz-app-local') {
  const tomlPath = path.join(rootDir, workdir, 'supabase', 'config.toml');
  const actualProjectId = readSupabaseProjectId(tomlPath);
  if (actualProjectId !== expectedProjectId) {
    throw new Error(
      `[ENV-GUARD] ${workdir}/supabase/config.toml project_id="${actualProjectId}" does not match expected "${expectedProjectId}".`
    );
  }
  return actualProjectId;
}

function getRunningStatus(workdir = '.') {
  const raw = execSync(`npx supabase --workdir "${workdir}" status --output json`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(raw);
}

try {
  if (target === 'dev') {
    const eff = loadViteEffectiveEnv(rootDir, 'development');
    assertLocalEnvironment({
      appEnv: eff.VITE_APP_ENV || eff.APP_ENV || 'development',
      supabaseUrl: eff.VITE_SUPABASE_URL || '',
      operation: 'vite dev (development)',
      expectedApiPort: '54321',
    });
    const res = spawnSync('npx', ['vite', '--mode', 'development', ...restArgs], {
      stdio: 'inherit',
      shell: true,
    });
    process.exit(res.status ?? 1);
  } else if (target === 'db:migrate:local') {
    const projectId = checkLocalConfigToml('.', 'quiz-app-local');
    const status = getRunningStatus('.');
    assertLocalEnvironment({
      appEnv: process.env.APP_ENV || 'development',
      supabaseUrl: status.API_URL || 'http://127.0.0.1:54321',
      dbUrl: status.DB_URL || '',
      operation: 'db:migrate:local',
      expectedProjectId: 'quiz-app-local',
      actualProjectId: projectId,
      expectedApiPort: '54321',
      expectedDbPort: '54322',
    });
    const res = spawnSync('npx', ['supabase', '--workdir', '.', 'migration', 'up', '--local'], {
      stdio: 'inherit',
      shell: true,
    });
    process.exit(res.status ?? 1);
  } else if (target === 'functions:serve:local') {
    const projectId = checkLocalConfigToml('.', 'quiz-app-local');
    assertEnvFileIsLocal(path.join(rootDir, 'supabase', 'functions', '.env.local'), rootDir);
    const status = getRunningStatus('.');
    assertLocalEnvironment({
      appEnv: process.env.APP_ENV || 'development',
      supabaseUrl: status.API_URL || 'http://127.0.0.1:54321',
      dbUrl: status.DB_URL || '',
      operation: 'functions:serve:local',
      expectedProjectId: 'quiz-app-local',
      actualProjectId: projectId,
      expectedApiPort: '54321',
      expectedDbPort: '54322',
    });
    const res = spawnSync(
      'npx',
      ['supabase', '--workdir', '.', 'functions', 'serve', '--env-file', 'supabase/functions/.env.local', '--no-verify-jwt'],
      { stdio: 'inherit', shell: true }
    );
    process.exit(res.status ?? 1);
  } else {
    console.error(`Unknown guard-command target: ${target}`);
    process.exit(1);
  }
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
