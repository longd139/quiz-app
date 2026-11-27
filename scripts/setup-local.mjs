/* global process, console */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { assertLocalEnvironment } from './lib/environment-guard.mjs';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function getSupabaseStatusJson() {
  const out = run('npx supabase status --output json');
  return JSON.parse(out);
}

function writeEnvIfMissingOrLocal(filePath, content) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    if (!existing.includes('127.0.0.1') && !existing.includes('localhost')) {
      console.log(`Skipped ${path.basename(filePath)} (custom non-local file exists).`);
      return;
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Wrote ${path.basename(filePath)}`);
}

async function main() {
  console.log('1. Checking Docker daemon...');
  run('docker info --format "{{.ServerVersion}}"');

  console.log('2. Checking/Starting local Supabase stack...');
  let status;
  try {
    status = getSupabaseStatusJson();
  } catch {
    execSync('npx supabase start', { stdio: 'inherit' });
    status = getSupabaseStatusJson();
  }

  const apiUrl = status.API_URL || 'http://127.0.0.1:54321';
  const anonKey = status.ANON_KEY || status.PUBLISHABLE_KEY;
  const serviceKey = status.SERVICE_ROLE_KEY;

  assertLocalEnvironment({
    appEnv: 'development',
    supabaseUrl: apiUrl,
    operation: 'setup:local',
  });

  if (!anonKey || !serviceKey) {
    throw new Error('Could not read local Supabase keys from `supabase status --output json`.');
  }

  writeEnvIfMissingOrLocal(
    path.resolve('.env.development.local'),
    `VITE_APP_ENV=development\nVITE_SUPABASE_URL=${apiUrl}\nVITE_SUPABASE_PUBLISHABLE_KEY=${anonKey}\nVITE_UPLOAD_ADAPTER=local-supabase\n`
  );

  writeEnvIfMissingOrLocal(
    path.resolve('.env.test.local'),
    `VITE_APP_ENV=test\nVITE_SUPABASE_URL=${apiUrl}\nVITE_SUPABASE_PUBLISHABLE_KEY=${anonKey}\nVITE_UPLOAD_ADAPTER=local-supabase\n`
  );

  writeEnvIfMissingOrLocal(
    path.resolve('supabase/functions/.env.local'),
    `SUPABASE_URL=${apiUrl}\nSUPABASE_ANON_KEY=${anonKey}\nSUPABASE_SERVICE_ROLE_KEY=${serviceKey}\n`
  );

  console.log('3. Seeding local test accounts and fixture data...');
  execSync('node scripts/seed-local.mjs', {
    stdio: 'inherit',
    env: {
      ...process.env,
      APP_ENV: 'development',
      SUPABASE_URL: apiUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    },
  });

  console.log('\nLocal Supabase environment ready!');
  console.log(`  Frontend:        http://127.0.0.1:5173 (run: npm run dev)`);
  console.log(`  Supabase API:    ${apiUrl}`);
  console.log(`  Supabase Studio: ${status.STUDIO_URL || 'http://127.0.0.1:54323'}`);
  console.log(`  Edge Functions:  npm run functions:serve:local`);
}

main().catch((err) => {
  console.error('setup:local failed:', err.message);
  process.exit(1);
});
