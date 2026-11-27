/* global process, console */
import path from 'node:path';
import { execSync } from 'node:child_process';
import { assertLocalEnvironment, readSupabaseProjectId } from './lib/environment-guard.mjs';

const args = process.argv.slice(2);
if (!args.includes('--confirm-local-reset')) {
  console.error('Refusing to reset local database without explicit --confirm-local-reset flag.');
  process.exit(1);
}

const projectId = readSupabaseProjectId(path.join(process.cwd(), 'supabase', 'config.toml'));
const status = JSON.parse(execSync('npx supabase status --output json', { encoding: 'utf8' }));
assertLocalEnvironment({
  appEnv: process.env.APP_ENV || 'development',
  supabaseUrl: status.API_URL || 'http://127.0.0.1:54321',
  dbUrl: status.DB_URL || '',
  operation: 'db:reset:local',
  expectedProjectId: 'quiz-app-local',
  actualProjectId: projectId,
  expectedApiPort: '54321',
  expectedDbPort: '54322',
});

execSync('npx supabase db reset --local', { stdio: 'inherit' });
execSync('node scripts/seed-local.mjs --reset-passwords', { stdio: 'inherit' });
