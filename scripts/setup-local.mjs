/* global process, console */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  assertEnvFileIsLocal,
  assertLocalEnvironment,
  parseEnvContent,
  readSupabaseProjectId,
} from './lib/environment-guard.mjs';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const forceWrite = args.has('--force');

const ENV_FILES_TO_CHECK = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.test',
  '.env.test.local',
  'supabase/functions/.env.local',
];

function validateExistingEnvFiles() {
  for (const rel of ENV_FILES_TO_CHECK) {
    assertEnvFileIsLocal(path.join(root, rel), root);
  }
}

function writeEnvIfMissing(filePath, content) {
  if (fs.existsSync(filePath) && !forceWrite) {
    assertEnvFileIsLocal(filePath, root);
    console.log(`Preserved existing ${path.relative(root, filePath)}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Generated ${path.relative(root, filePath)}`);
}

function getSupabaseStatus() {
  const raw = execSync('npx supabase status --output json', { encoding: 'utf8' });
  return JSON.parse(raw);
}

async function main() {
  console.log('1/5 Validating local project config & existing environment files...');
  const projectId = readSupabaseProjectId(path.join(root, 'supabase', 'config.toml'));
  if (projectId !== 'quiz-app-local') {
    throw new Error(`Expected supabase/config.toml project_id="quiz-app-local", got "${projectId}".`);
  }
  validateExistingEnvFiles();

  console.log('2/5 Starting lightweight local Supabase stack (quiz-app-local)...');
  execSync('npx supabase start --exclude logflare,vector,realtime,imgproxy,supavisor', {
    stdio: 'inherit',
  });

  const status = getSupabaseStatus();
  const apiUrl = status.API_URL || 'http://127.0.0.1:54321';
  const dbUrl = status.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  const anonKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
  const serviceKey = status.SECRET_KEY || status.SERVICE_ROLE_KEY;

  assertLocalEnvironment({
    appEnv: 'development',
    supabaseUrl: apiUrl,
    dbUrl,
    operation: 'setup:local',
    expectedProjectId: 'quiz-app-local',
    actualProjectId: projectId,
    expectedApiPort: '54321',
    expectedDbPort: '54322',
  });

  console.log('3/5 Ensuring local env files exist (non-destructive)...');
  writeEnvIfMissing(
    path.join(root, '.env.development.local'),
    [
      'VITE_APP_ENV=development',
      `VITE_SUPABASE_URL=${apiUrl}`,
      `VITE_SUPABASE_PUBLISHABLE_KEY=${anonKey}`,
      '',
    ].join('\n')
  );

  writeEnvIfMissing(
    path.join(root, '.env.test.local'),
    [
      'VITE_APP_ENV=test',
      'VITE_SUPABASE_URL=http://127.0.0.1:54331',
      `VITE_SUPABASE_PUBLISHABLE_KEY=${anonKey}`,
      '',
    ].join('\n')
  );

  const fnEnvLocalPath = path.join(root, 'supabase', 'functions', '.env.local');
  const fnEnvPath = path.join(root, 'supabase', 'functions', '.env');
  const existingFnEnv = fs.existsSync(fnEnvLocalPath)
    ? parseEnvContent(fs.readFileSync(fnEnvLocalPath, 'utf8'))
    : fs.existsSync(fnEnvPath)
      ? parseEnvContent(fs.readFileSync(fnEnvPath, 'utf8'))
      : {};
  const devPepper = existingFnEnv.SOURCE_CODE_PEPPER && existingFnEnv.SOURCE_CODE_PEPPER.length >= 16
    ? existingFnEnv.SOURCE_CODE_PEPPER
    : crypto.randomBytes(32).toString('hex');

  const fnEnvContent = [
    'APP_ENV=development',
    `SUPABASE_URL=${apiUrl}`,
    `PUBLIC_SUPABASE_URL=${apiUrl}`,
    `SUPABASE_ANON_KEY=${status.ANON_KEY || anonKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    `SOURCE_CODE_PEPPER=${devPepper}`,
    'MAX_SOURCE_FILE_BYTES=20971520',
    'MEDIA_STORAGE_PROVIDER=supabase',
    'ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5174',
    '',
  ].join('\n');

  writeEnvIfMissing(fnEnvLocalPath, fnEnvContent);
  writeEnvIfMissing(fnEnvPath, fnEnvContent);

  console.log('4/5 Applying pending migrations (non-destructive)...');
  execSync('npx supabase migration up --local', { stdio: 'inherit' });

  console.log('5/5 Ensuring seed data without overwriting existing accounts...');
  execSync('node scripts/seed-local.mjs --preserve-existing', {
    stdio: 'inherit',
    env: {
      ...process.env,
      APP_ENV: 'development',
      SUPABASE_URL: apiUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    },
  });

  console.log('\nLocal environment ready!');
  console.log(`- API URL:    ${apiUrl}`);
  console.log(`- Studio URL: ${status.STUDIO_URL || 'http://127.0.0.1:54323'}`);
  console.log('- Run "npm run dev:local" to start the frontend.');
}

main().catch((err) => {
  console.error('setup:local failed:', err.message || err);
  process.exit(1);
});
