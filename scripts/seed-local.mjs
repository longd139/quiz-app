/* global process, console */
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { assertLocalEnvironment, readSupabaseProjectId } from './lib/environment-guard.mjs';

const args = process.argv.slice(2);
const resetPasswords = args.includes('--reset-passwords');
const workdirIdx = args.indexOf('--workdir');
const workdir = workdirIdx >= 0 && args[workdirIdx + 1] ? args[workdirIdx + 1] : (process.env.SUPABASE_WORKDIR || '.');
const isTestStack = workdir === 'supabase-test';
const expectedProjectId = isTestStack ? 'quiz-app-test' : 'quiz-app-local';
const expectedApiPort = isTestStack ? '54331' : '54321';
const expectedDbPort = isTestStack ? '54332' : '54322';

function resolveLocalCredentials() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      dbUrl: process.env.DB_URL || '',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  const status = JSON.parse(execSync(`npx supabase --workdir "${workdir}" status --output json`, { encoding: 'utf8' }));
  return {
    url: status.API_URL || `http://127.0.0.1:${expectedApiPort}`,
    dbUrl: status.DB_URL || '',
    serviceKey: status.SERVICE_ROLE_KEY,
  };
}

const LOCAL_TEST_PASSWORD = process.env.LOCAL_TEST_PASSWORD || 'QuizLocal2026!';

const SEED_ACCOUNTS = [
  { email: 'admin@quiz.local', full_name: 'Admin Chính', role: 'ADMIN', status: 'ACTIVE', must_change_password: false, password_change_recommended: false },
  { email: 'admin2@quiz.local', full_name: 'Admin Phụ', role: 'ADMIN', status: 'ACTIVE', must_change_password: false, password_change_recommended: false },
  { email: 'usera@quiz.local', full_name: 'Học viên A', role: 'USER', status: 'ACTIVE', must_change_password: false, password_change_recommended: false },
  { email: 'userb@quiz.local', full_name: 'Học viên B', role: 'USER', status: 'ACTIVE', must_change_password: false, password_change_recommended: false },
  { email: 'disabled@quiz.local', full_name: 'Tài khoản Khóa', role: 'USER', status: 'DISABLED', must_change_password: false, password_change_recommended: false },
  { email: 'firstlogin@quiz.local', full_name: 'Đổi MK Lần Đầu', role: 'USER', status: 'ACTIVE', must_change_password: true, password_change_recommended: true },
];

async function ensureUser(sb, acct) {
  const { data: existing } = await sb.from('profiles').select('id, role, status, must_change_password, password_change_recommended').eq('email', acct.email).maybeSingle();
  let userId = existing?.id;

  if (!userId) {
    const { data: created, error } = await sb.auth.admin.createUser({
      email: acct.email,
      password: LOCAL_TEST_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: acct.full_name,
        must_change_password: acct.must_change_password,
        created_by_admin: true,
        password_changed: false,
      },
    });
    if (error) throw new Error(`Create ${acct.email} failed: ${error.message}`);
    userId = created.user.id;

    const { error: profErr } = await sb.from('profiles').upsert({
      id: userId,
      email: acct.email,
      full_name: acct.full_name,
      role: acct.role,
      status: acct.status,
      must_change_password: acct.must_change_password,
      password_change_recommended: acct.password_change_recommended,
    });
    if (profErr) throw new Error(`Upsert profile ${acct.email} failed: ${profErr.message}`);
  } else if (resetPasswords) {
    await sb.auth.admin.updateUserById(userId, {
      password: LOCAL_TEST_PASSWORD,
      user_metadata: {
        full_name: acct.full_name,
        must_change_password: acct.must_change_password,
        created_by_admin: true,
        password_changed: false,
      },
    });

    const { error: profErr } = await sb.from('profiles').upsert({
      id: userId,
      email: acct.email,
      full_name: acct.full_name,
      role: acct.role,
      status: acct.status,
      must_change_password: acct.must_change_password,
      password_change_recommended: acct.password_change_recommended,
    });
    if (profErr) throw new Error(`Upsert profile ${acct.email} failed: ${profErr.message}`);
  }

  return userId;
}

async function main() {
  const actualProjectId = readSupabaseProjectId(path.join(process.cwd(), workdir, 'supabase', 'config.toml'));
  const { url, dbUrl, serviceKey } = resolveLocalCredentials();
  assertLocalEnvironment({
    appEnv: process.env.APP_ENV || (isTestStack ? 'test' : 'development'),
    supabaseUrl: url,
    dbUrl,
    operation: `db:seed:${isTestStack ? 'test' : 'local'}`,
    expectedProjectId,
    actualProjectId,
    expectedApiPort,
    expectedDbPort,
  });

  const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const userIds = {};
  for (const acct of SEED_ACCOUNTS) {
    userIds[acct.email] = await ensureUser(sb, acct);
  }
  const adminId = userIds['admin@quiz.local'];
  const userAId = userIds['usera@quiz.local'];

  // Idempotent fixed UUIDs for fixture shared content (only insert if missing when preserving)
  const qColId = '11111111-1111-4111-8111-111111111101';
  const qSetId = '11111111-1111-4111-8111-111111111201';
  const q1Id = '11111111-1111-4111-8111-111111111301';
  const q2Id = '11111111-1111-4111-8111-111111111302';

  const { data: existingCol } = await sb.from('quiz_collections').select('id').eq('id', qColId).maybeSingle();
  if (!existingCol || resetPasswords) {
    await sb.from('quiz_collections').upsert({ id: qColId, name: 'Kiểm thử phần mềm (ISTQB)', term: 'Kỳ 1', created_by: adminId });
    await sb.from('quiz_sets').upsert({ id: qSetId, collection_id: qColId, name: 'Đề mẫu ISTQB Foundation', created_by: adminId });
    await sb.from('questions').upsert([
      { id: q1Id, quiz_set_id: qSetId, prompt: 'Mục tiêu chính của Regression Testing là gì?', explanation: 'Đảm bảo thay đổi mới không làm hỏng tính năng cũ.', sort_order: 0 },
      { id: q2Id, quiz_set_id: qSetId, prompt: 'Chọn 2 kỹ thuật thiết kế test hộp đen (Black-box):', explanation: 'EP và BVA là kỹ thuật hộp đen.', sort_order: 1 },
    ]);
    await sb.from('question_options').delete().in('question_id', [q1Id, q2Id]);
    await sb.from('question_options').insert([
      { question_id: q1Id, label: 'A', text: 'Kiểm tra tính năng mới không ảnh hưởng tính năng cũ', is_correct: true, sort_order: 0 },
      { question_id: q1Id, label: 'B', text: 'Tối ưu hóa tốc độ biên dịch', is_correct: false, sort_order: 1 },
      { question_id: q2Id, label: 'A', text: 'Equivalence Partitioning', is_correct: true, sort_order: 0 },
      { question_id: q2Id, label: 'B', text: 'Boundary Value Analysis', is_correct: true, sort_order: 1 },
      { question_id: q2Id, label: 'C', text: 'Statement Coverage', is_correct: false, sort_order: 2 },
    ]);
  }

  const vColId = '22222222-2222-4222-8222-222222222101';
  const vDeckId = '22222222-2222-4222-8222-222222222201';
  const c1Id = '22222222-2222-4222-8222-222222222301';
  const c2Id = '22222222-2222-4222-8222-222222222302';

  const { data: existingVCol } = await sb.from('vocab_collections').select('id').eq('id', vColId).maybeSingle();
  if (!existingVCol || resetPasswords) {
    await sb.from('vocab_collections').upsert({ id: vColId, name: 'Tiếng Anh Chuyên Ngành IT', created_by: adminId });
    await sb.from('vocab_decks').upsert({ id: vDeckId, collection_id: vColId, name: 'Thuật ngữ Testing Cơ bản', target_language: 'en-US', created_by: adminId });
    await sb.from('flashcards').upsert([
      { id: c1Id, deck_id: vDeckId, term: 'Regression', meaning: 'Hồi quy', phonetic: '/rɪˈɡreʃ.ən/', part_of_speech: 'noun', example: 'Run regression suite.', sort_order: 0 },
      { id: c2Id, deck_id: vDeckId, term: 'Verification', meaning: 'Xác minh', phonetic: '/ˌver.ɪ.fɪˈkeɪ.ʃən/', part_of_speech: 'noun', example: 'Verification checks specs.', sort_order: 1 },
    ]);
  }

  // Seed personal progress for USER_A only if not already present (or when resetting)
  const today = new Date().toISOString().slice(0, 10);
  const { data: existingActivity } = await sb.from('daily_learning_activity').select('activity_count').eq('user_id', userAId).eq('activity_date', today).maybeSingle();
  if (!existingActivity || resetPasswords) {
    await sb.from('daily_learning_activity').upsert({ user_id: userAId, activity_date: today, activity_count: 5 });
  }
  const { data: existingRewards } = await sb.from('learning_rewards').select('moosk_count').eq('user_id', userAId).maybeSingle();
  if (!existingRewards || resetPasswords) {
    await sb.from('learning_rewards').upsert({ user_id: userAId, moosk_count: 3 });
  }

  console.log(`Seeded 6 ${expectedProjectId} accounts and fixture data (mode: ${resetPasswords ? 'reset' : 'preserve-existing'}).`);
}

main().catch((err) => {
  console.error('db:seed failed:', err.message);
  process.exit(1);
});
