/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import { assertLocalEnvironment, readSupabaseProjectId } from './lib/environment-guard.mjs';

const root = process.cwd();
const testWorkdir = path.join(root, 'supabase-test');
const mode = process.argv[2]; // 'integration' | 'e2e'

if (mode !== 'integration' && mode !== 'e2e') {
  console.error('Usage: node scripts/run-test-stack.mjs <integration|e2e> [extra args...]');
  process.exit(1);
}

const extraArgs = process.argv.slice(3);

function syncDir(srcDir, destDir) {
  fs.rmSync(destDir, { recursive: true, force: true });
  if (fs.existsSync(srcDir)) {
    fs.cpSync(srcDir, destDir, { recursive: true });
  }
}

function getTestStatus() {
  const raw = execSync('npx supabase --workdir supabase-test status --output json', { encoding: 'utf8' });
  return JSON.parse(raw);
}

async function main() {
  const testProjectId = readSupabaseProjectId(path.join(testWorkdir, 'supabase', 'config.toml'));
  if (testProjectId !== 'quiz-app-test') {
    throw new Error(`Expected supabase-test/supabase/config.toml project_id="quiz-app-test", got "${testProjectId}".`);
  }

  // Sync migrations and edge functions from single source of truth
  syncDir(path.join(root, 'supabase', 'migrations'), path.join(testWorkdir, 'supabase', 'migrations'));
  syncDir(path.join(root, 'supabase', 'functions'), path.join(testWorkdir, 'supabase', 'functions'));

  const testPepper = process.env.TEST_SOURCE_CODE_PEPPER || crypto.randomBytes(32).toString('hex');
  const initialFnEnv = [
    'APP_ENV=test',
    'PUBLIC_SUPABASE_URL=http://127.0.0.1:54331',
    `SOURCE_CODE_PEPPER=${testPepper}`,
    `SOURCE_SIGNED_URL_TTL_SECONDS=${process.env.TEST_SIGNED_URL_TTL_SECONDS || '60'}`,
    'MAX_SOURCE_FILE_BYTES=20971520',
    'MEDIA_STORAGE_PROVIDER=supabase',
    'ALLOWED_ORIGINS=http://127.0.0.1:5174,http://localhost:5174',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(testWorkdir, 'supabase', 'functions', '.env'), initialFnEnv, 'utf8');
  fs.writeFileSync(path.join(testWorkdir, 'supabase', 'functions', '.env.local'), initialFnEnv, 'utf8');

  console.log('Starting isolated test Supabase stack (quiz-app-test on port 54331)...');
  execSync(
    'npx supabase --workdir supabase-test start --exclude logflare,vector,realtime,imgproxy,supavisor,studio,pg-meta,mailpit',
    { stdio: 'inherit' }
  );

  let exitCode;
  try {
    const status = getTestStatus();
    const apiUrl = status.API_URL || 'http://127.0.0.1:54331';
    const dbUrl = status.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';
    const anonKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
    const serviceKey = status.SECRET_KEY || status.SERVICE_ROLE_KEY;

    assertLocalEnvironment({
      appEnv: 'test',
      supabaseUrl: apiUrl,
      dbUrl,
      operation: `test:${mode}`,
      expectedProjectId: 'quiz-app-test',
      actualProjectId: testProjectId,
      expectedApiPort: '54331',
      expectedDbPort: '54332',
    });

    // Write isolated test env files
    fs.writeFileSync(
      path.join(root, '.env.test.local'),
      [
        'VITE_APP_ENV=test',
        `VITE_SUPABASE_URL=${apiUrl}`,
        `VITE_SUPABASE_PUBLISHABLE_KEY=${anonKey}`,
        '',
      ].join('\n'),
      'utf8'
    );

    const fullTestFnEnv = [
      'APP_ENV=test',
      `SUPABASE_URL=${apiUrl}`,
      `PUBLIC_SUPABASE_URL=${apiUrl}`,
      `SUPABASE_ANON_KEY=${status.ANON_KEY || anonKey}`,
      `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
      `SOURCE_CODE_PEPPER=${testPepper}`,
      `SOURCE_SIGNED_URL_TTL_SECONDS=${process.env.TEST_SIGNED_URL_TTL_SECONDS || '60'}`,
      'MAX_SOURCE_FILE_BYTES=20971520',
      'MEDIA_STORAGE_PROVIDER=supabase',
      'ALLOWED_ORIGINS=http://127.0.0.1:5174,http://localhost:5174',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(testWorkdir, 'supabase', 'functions', '.env'), fullTestFnEnv, 'utf8');
    fs.writeFileSync(path.join(testWorkdir, 'supabase', 'functions', '.env.local'), fullTestFnEnv, 'utf8');

    console.log('Resetting and seeding isolated quiz-app-test database...');
    execSync('npx supabase --workdir supabase-test db reset --local', { stdio: 'inherit' });
    execSync('node scripts/seed-local.mjs --workdir supabase-test --reset-passwords', {
      stdio: 'inherit',
      env: {
        ...process.env,
        APP_ENV: 'test',
        SUPABASE_WORKDIR: 'supabase-test',
        SUPABASE_URL: apiUrl,
        DB_URL: dbUrl,
        SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      },
    });

    const childEnv = {
      ...process.env,
      APP_ENV: 'test',
      VITE_APP_ENV: 'test',
      SUPABASE_WORKDIR: 'supabase-test',
      SUPABASE_URL: apiUrl,
      DB_URL: dbUrl,
      SUPABASE_ANON_KEY: status.ANON_KEY || anonKey,
      SUPABASE_PUBLISHABLE_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      VITE_SUPABASE_URL: apiUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: anonKey,
    };

    if (mode === 'integration') {
      const res = spawnSync('node', ['--test', '--test-concurrency=1', 'tests/integration/*.test.mjs', ...extraArgs], {
        stdio: 'inherit',
        env: childEnv,
        shell: true,
      });
      exitCode = res.status ?? 1;
    } else {
      const res = spawnSync('npx', ['playwright', 'test', ...extraArgs], {
        stdio: 'inherit',
        env: childEnv,
        shell: true,
      });
      exitCode = res.status ?? 1;
    }
  } finally {
    console.log('Stopping isolated test Supabase stack (quiz-app-test)...');
    try {
      execSync('npx supabase --workdir supabase-test stop --no-backup', { stdio: 'inherit' });
    } catch (stopErr) {
      console.error('Warning: failed to stop quiz-app-test:', stopErr.message);
    }
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('run-test-stack failed:', err.message || err);
  process.exit(1);
});
