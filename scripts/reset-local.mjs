/* global process, console */
import { execSync } from 'node:child_process';
import { assertLocalEnvironment } from './lib/environment-guard.mjs';

const args = process.argv.slice(2);
if (!args.includes('--confirm-local-reset')) {
  console.error('Refusing to reset local database without explicit --confirm-local-reset flag.');
  process.exit(1);
}

const status = JSON.parse(execSync('npx supabase status --output json', { encoding: 'utf8' }));
assertLocalEnvironment({
  appEnv: process.env.APP_ENV || 'development',
  supabaseUrl: status.API_URL || 'http://127.0.0.1:54321',
  operation: 'db:reset:local',
});

execSync('npx supabase db reset --local', { stdio: 'inherit' });
execSync('node scripts/seed-local.mjs', { stdio: 'inherit' });
