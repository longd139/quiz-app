/* global process, console */
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { assertLocalEnvironment } from './lib/environment-guard.mjs';

function resolveLocalCredentials() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  const status = JSON.parse(execSync('npx supabase status --output json', { encoding: 'utf8' }));
  return {
    url: status.API_URL || 'http://127.0.0.1:54321',
    serviceKey: status.SERVICE_ROLE_KEY,
  };
}

const LOCAL_TEST_PASSWORD = process.env.LOCAL_TEST_PASSWORD || 'QuizLocal2026!';

const SEED_ACCOUNTS = [
  { email: 'admin@quiz.local', full_name: 'Admin Chính', role: 'ADMIN', status: 'ACTIVE', must_change_password: false },
  { email: 'admin2@quiz.local', full_name: 'Admin Phụ', role: 'ADMIN', status: 'ACTIVE', must_change_password: false },
  { email: 'usera@quiz.local', full_name: 'Học viên A', role: 'USER', status: 'ACTIVE', must_change_password: false },
  { email: 'userb@quiz.local', full_name: 'Học viên B', role: 'USER', status: 'ACTIVE', must_change_password: false },
  { email: 'disabled@quiz.local', full_name: 'Tài khoản Khóa', role: 'USER', status: 'DISABLED', must_change_password: false },
  { email: 'firstlogin@quiz.local', full_name: 'Đổi MK Lần Đầu', role: 'USER', status: 'ACTIVE', must_change_password: true },
];

async function ensureUser(sb, acct) {
  const { data: existing } = await sb.from('profiles').select('id').eq('email', acct.email).maybeSingle();
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
  } else {
    await sb.auth.admin.updateUserById(userId, {
      password: LOCAL_TEST_PASSWORD,
      user_metadata: {
        full_name: acct.full_name,
        must_change_password: acct.must_change_password,
        created_by_admin: true,
        password_changed: false,
      },
    });
  }

  const { error: profErr } = await sb.from('profiles').upsert({
    id: userId,
    email: acct.email,
    full_name: acct.full_name,
    role: acct.role,
    status: acct.status,
    must_change_password: acct.must_change_password,
  });
  if (profErr) throw new Error(`Upsert profile ${acct.email} failed: ${profErr.message}`);
  return userId;
}

async function main() {
  const { url, serviceKey } = resolveLocalCredentials();
  assertLocalEnvironment({
    appEnv: process.env.APP_ENV || 'development',
    supabaseUrl: url,
    operation: 'db:seed:local',
  });

  const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const userIds = {};
  for (const acct of SEED_ACCOUNTS) {
    userIds[acct.email] = await ensureUser(sb, acct);
  }
  const adminId = userIds['admin@quiz.local'];
  const userAId = userIds['usera@quiz.local'];

  // Idempotent fixed UUIDs for fixture shared content
  const qColId = '11111111-1111-4111-8111-111111111101';
  const qSetId = '11111111-1111-4111-8111-111111111201';
  const q1Id = '11111111-1111-4111-8111-111111111301';
  const q2Id = '11111111-1111-4111-8111-111111111302';

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

  const vColId = '22222222-2222-4222-8222-222222222101';
  const vDeckId = '22222222-2222-4222-8222-222222222201';
  const c1Id = '22222222-2222-4222-8222-222222222301';
  const c2Id = '22222222-2222-4222-8222-222222222302';

  await sb.from('vocab_collections').upsert({ id: vColId, name: 'Tiếng Anh Chuyên Ngành IT', created_by: adminId });
  await sb.from('vocab_decks').upsert({ id: vDeckId, collection_id: vColId, name: 'Thuật ngữ Testing Cơ bản', target_language: 'en-US', created_by: adminId });
  await sb.from('flashcards').upsert([
    { id: c1Id, deck_id: vDeckId, term: 'Regression', meaning: 'Hồi quy', phonetic: '/rɪˈɡreʃ.ən/', part_of_speech: 'noun', example: 'Run regression suite.', sort_order: 0 },
    { id: c2Id, deck_id: vDeckId, term: 'Verification', meaning: 'Xác minh', phonetic: '/ˌver.ɪ.fɪˈkeɪ.ʃən/', part_of_speech: 'noun', example: 'Verification checks specs.', sort_order: 1 },
  ]);

  // Seed personal progress for USER_A only (USER_B remains clean for isolation testing)
  const today = new Date().toISOString().slice(0, 10);
  await sb.from('daily_learning_activity').upsert({ user_id: userAId, activity_date: today, activity_count: 5 });
  await sb.from('learning_rewards').upsert({ user_id: userAId, moosk_count: 3 });

  console.log('Seeded 6 local test accounts and fixture data successfully.');
}

main().catch((err) => {
  console.error('db:seed:local failed:', err.message);
  process.exit(1);
});
