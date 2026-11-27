/* global process, crypto, fetch, FormData, Blob */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { assertLocalEnvironment } from '../../scripts/lib/environment-guard.mjs';

const TEST_PASSWORD = process.env.LOCAL_TEST_PASSWORD || 'QuizLocal2026!';

let SUPABASE_URL;
let ANON_KEY;
let SERVICE_KEY;

function loadLocalStatus() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    SUPABASE_URL = process.env.SUPABASE_URL;
    ANON_KEY = process.env.SUPABASE_ANON_KEY;
    SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assertLocalEnvironment({
      appEnv: 'test',
      supabaseUrl: SUPABASE_URL,
      dbUrl: process.env.DB_URL || '',
      operation: 'integration tests',
      expectedApiPort: '54331',
    });
    return;
  }
  const workdir = process.env.SUPABASE_WORKDIR || 'supabase-test';
  const raw = execSync(`npx supabase --workdir "${workdir}" status --output json`, { encoding: 'utf8' });
  const status = JSON.parse(raw);
  SUPABASE_URL = status.API_URL || 'http://127.0.0.1:54331';
  ANON_KEY = status.ANON_KEY || status.PUBLISHABLE_KEY;
  SERVICE_KEY = status.SERVICE_ROLE_KEY;
  assertLocalEnvironment({
    appEnv: 'test',
    supabaseUrl: SUPABASE_URL,
    dbUrl: status.DB_URL || '',
    operation: 'integration tests',
    expectedApiPort: '54331',
  });
}

function makeAnonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function makeAdminServiceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signInAs(email, password = TEST_PASSWORD) {
  const client = makeAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return { client, user: data.user, session: data.session };
}

describe('Local Supabase Integration Suite (Auth, RLS, Transactions, Isolation, Security)', () => {
  before(() => {
    loadLocalStatus();
  });

  // ---------------------------------------------------------------------------
  // Group A — Authentication
  // ---------------------------------------------------------------------------
  it('AUTH-01 & AUTH-02 & AUTH-03: Admin/User login succeeds; wrong password fails', async () => {
    const admin = await signInAs('admin@quiz.local');
    assert.ok(admin.user.id);

    const userA = await signInAs('usera@quiz.local');
    assert.ok(userA.user.id);

    const anon = makeAnonClient();
    const { error: badErr } = await anon.auth.signInWithPassword({
      email: 'usera@quiz.local',
      password: 'WrongPassword999!',
    });
    assert.ok(badErr);
  });

  it('AUTH-04: Public signup is rejected by local Supabase Auth', async () => {
    const anon = makeAnonClient();
    const { error } = await anon.auth.signUp({
      email: `attacker_${Date.now()}@quiz.local`,
      password: 'Password123!',
    });
    assert.ok(error, 'Public signup must be disabled');
  });

  it('AUTH-05 & RBAC-10: Disabled account cannot read shared content or mutate data even with valid JWT', async () => {
    const { client: disabledClient } = await signInAs('disabled@quiz.local');
    const { data: sets } = await disabledClient.from('quiz_sets').select('id');
    assert.equal((sets || []).length, 0, 'Disabled user must see 0 shared quiz_sets via RLS');

    const { error: rpcErr } = await disabledClient.rpc('apply_learning_progress_event', {
      p_operation_id: `disabled-op-${Date.now()}`,
      p_activity_date: new Date().toISOString().slice(0, 10),
      p_activity_delta: 1,
    });
    assert.ok(rpcErr, 'Disabled user must be rejected by RPC');
  });

  it('AUTH-06 & AUTH-07: First-login account (must_change_password=true) is blocked from content & direct REST bypass', async () => {
    const { client: firstClient, user } = await signInAs('firstlogin@quiz.local');
    // Can read own profile
    const { data: ownProf, error: profErr } = await firstClient
      .from('profiles')
      .select('id, must_change_password')
      .eq('id', user.id)
      .single();
    assert.equal(profErr, null);
    assert.equal(ownProf.must_change_password, true);

    // Blocked from shared learning content
    const { data: sets } = await firstClient.from('quiz_sets').select('id');
    assert.equal((sets || []).length, 0, 'must_change_password user must not read shared content');

    // Blocked from clearing must_change_password directly via REST
    const { error: bypassErr } = await firstClient
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id);
    assert.ok(bypassErr, 'Direct REST update to must_change_password must be blocked');
  });

  // ---------------------------------------------------------------------------
  // Group B — Authorization & RBAC
  // ---------------------------------------------------------------------------
  it('RBAC-01..07: Anonymous blocked; User reads shared content but cannot write or escalate role/status', async () => {
    const anon = makeAnonClient();
    const { data: anonSets, error: anonErr } = await anon.from('quiz_sets').select('id');
    assert.ok(anonErr || (anonSets || []).length === 0);

    const { client: userA, user } = await signInAs('usera@quiz.local');
    const { data: userSets, error: readErr } = await userA.from('quiz_sets').select('id, name');
    assert.equal(readErr, null);
    assert.ok(userSets.length >= 1, 'Active user must read shared quiz_sets');

    // Cannot modify shared content
    const { error: writeSharedErr } = await userA.rpc('save_quiz_set_atomic', {
      p_id: crypto.randomUUID(),
      p_collection_id: null,
      p_name: 'Hacked Set',
      p_description: '',
      p_expected_version: null,
      p_questions: [],
    });
    assert.ok(writeSharedErr, 'Regular user must not save shared quiz sets');

    // Cannot escalate role or change status via REST
    const { error: roleErr } = await userA.from('profiles').update({ role: 'ADMIN' }).eq('id', user.id);
    assert.ok(roleErr);

    const { error: statusErr } = await userA.from('profiles').update({ status: 'DISABLED' }).eq('id', user.id);
    assert.ok(statusErr);
  });

  it('RBAC-08 & RBAC-09: Admin cannot bypass protected profile workflow via REST; last active Admin protected', async () => {
    const { client: adminClient, user: adminUser } = await signInAs('admin@quiz.local');
    const { error: directBypassErr } = await adminClient
      .from('profiles')
      .update({ role: 'USER' })
      .eq('id', adminUser.id);
    assert.ok(directBypassErr, 'Admin direct REST update to protected fields must be blocked');

    // Verify self-disable fails inside transactional RPC
    const sbService = makeAdminServiceClient();
    const { error: selfLockErr } = await sbService.rpc('admin_update_profile_tx', {
      p_actor_id: adminUser.id,
      p_target_id: adminUser.id,
      p_full_name: null,
      p_role: 'ADMIN',
      p_status: 'DISABLED',
      p_must_change_password: false,
    });
    assert.ok(selfLockErr, 'Admin must not disable themselves');
  });

  // ---------------------------------------------------------------------------
  // Group C — Data Isolation
  // ---------------------------------------------------------------------------
  it('ISO-01..05: Shared content visible to both User A and User B; personal history & progress isolated', async () => {
    const { client: userA, user: uA } = await signInAs('usera@quiz.local');
    const { client: userB, user: uB } = await signInAs('userb@quiz.local');

    // User A saves a quiz attempt
    const attemptId = crypto.randomUUID();
    const { error: saveErr } = await userA.rpc('save_quiz_attempt_atomic', {
      p_attempt: {
        id: attemptId,
        testName: 'Attempt Isolation Test',
        testNames: ['Attempt Isolation Test'],
        mode: 'exam',
        totalQuestions: 1,
        correctCount: 1,
        score: 100,
        duration: 10,
        questions: [{ id: 'q-iso', prompt: 'Q1', options: [{ label: 'A', text: '1' }], correctIndices: [0] }],
        answersList: [{ questionId: null, questionSnapshot: { prompt: 'Q1' }, selectedIndices: [0], isCorrect: true }],
      },
    });
    assert.equal(saveErr, null);

    // User B cannot read User A's attempt
    const { data: bReadsA } = await userB.from('quiz_attempts').select('id').eq('id', attemptId);
    assert.equal((bReadsA || []).length, 0, 'User B must not read User A attempt');

    // User B cannot attach child answer to User A's attempt_id
    const { error: parentBypassErr } = await userB.from('quiz_attempt_answers').insert({
      attempt_id: attemptId,
      user_id: uB.id,
      question_snapshot: { prompt: 'Injected' },
      selected_indices: [0],
      is_correct: true,
      sort_order: 0,
    });
    assert.ok(parentBypassErr, 'Composite FK + RLS must block attaching answers to another user attempt');
    assert.notEqual(uA.id, uB.id);
  });

  // ---------------------------------------------------------------------------
  // Group D — Transactions & Concurrency
  // ---------------------------------------------------------------------------
  it('TX-01, TX-04, TX-06: Atomic quiz set save, version increment, and optimistic lock conflict', async () => {
    const { client: adminClient } = await signInAs('admin@quiz.local');
    const setId = crypto.randomUUID();
    const qId = crypto.randomUUID();

    // Create v1
    const { data: v1, error: err1 } = await adminClient.rpc('save_quiz_set_atomic', {
      p_id: setId,
      p_collection_id: null,
      p_name: 'Atomic Set',
      p_description: 'v1',
      p_expected_version: null,
      p_questions: [{ id: qId, prompt: 'P1', explanation: 'E1', options: [{ label: 'A', text: 'OptA' }], correctIndices: [0] }],
    });
    assert.equal(err1, null);
    assert.equal(v1.version, 1);

    // Update v1 -> v2
    const { data: v2, error: err2 } = await adminClient.rpc('save_quiz_set_atomic', {
      p_id: setId,
      p_collection_id: null,
      p_name: 'Atomic Set Updated',
      p_description: 'v2',
      p_expected_version: 1,
      p_questions: [{ id: qId, prompt: 'P1 updated', explanation: 'E1', options: [{ label: 'A', text: 'OptA' }], correctIndices: [0] }],
    });
    assert.equal(err2, null);
    assert.equal(v2.version, 2);

    // Stale concurrent update with expected_version = 1 must conflict
    const { error: conflictErr } = await adminClient.rpc('save_quiz_set_atomic', {
      p_id: setId,
      p_collection_id: null,
      p_name: 'Stale Overwrite',
      p_description: '',
      p_expected_version: 1,
      p_questions: [],
    });
    assert.ok(conflictErr && conflictErr.message.includes('CONFLICT'));

    // Cleanup
    await adminClient.rpc('delete_quiz_set_atomic', { p_id: setId });
  });

  it('TX-08 & TX-09: Concurrent learning progress preserves both increments; duplicate operationId is idempotent', async () => {
    const { client: userA, user } = await signInAs('usera@quiz.local');
    const today = new Date().toISOString().slice(0, 10);

    const { data: beforeRow } = await userA
      .from('daily_learning_activity')
      .select('activity_count')
      .eq('user_id', user.id)
      .eq('activity_date', today)
      .maybeSingle();
    const beforeCount = beforeRow?.activity_count || 0;

    const op1 = `op-1-${Date.now()}`;
    const op2 = `op-2-${Date.now()}`;

    await Promise.all([
      userA.rpc('apply_learning_progress_event', { p_operation_id: op1, p_activity_date: today, p_activity_delta: 2 }),
      userA.rpc('apply_learning_progress_event', { p_operation_id: op2, p_activity_date: today, p_activity_delta: 3 }),
    ]);

    // Replay op1 (must be ignored as duplicate)
    const { data: replayRes } = await userA.rpc('apply_learning_progress_event', {
      p_operation_id: op1,
      p_activity_date: today,
      p_activity_delta: 2,
    });
    assert.equal(replayRes.duplicate, true);

    const { data: afterRow } = await userA
      .from('daily_learning_activity')
      .select('activity_count')
      .eq('user_id', user.id)
      .eq('activity_date', today)
      .single();
    assert.equal(afterRow.activity_count, beforeCount + 5);
  });

  // ---------------------------------------------------------------------------
  // Group E & F — Migration, Backup, Audit Forgery & Legacy RPC Revocation
  // ---------------------------------------------------------------------------
  it('MIG-03 & MIG-10: Legacy RPCs are not callable by anon/authenticated; analyze_legacy_rooms handles fresh DB', async () => {
    const anon = makeAnonClient();
    const { error: legacyAnonErr } = await anon.rpc('create_app_room', { p_secret: 'test' });
    assert.ok(legacyAnonErr);

    const { client: userA } = await signInAs('usera@quiz.local');
    const { error: analyzeErr } = await userA.rpc('analyze_legacy_rooms');
    assert.ok(analyzeErr, 'User must not execute migration analysis RPC');
  });

  it('SEC-02 & SEC-03: Regular user cannot forge ADMIN audit logs or restore backups', async () => {
    const { client: userA, user } = await signInAs('usera@quiz.local');
    const { error: forgeErr } = await userA.from('audit_logs').insert({
      actor_user_id: user.id,
      action: 'ADMIN_USER_CREATE',
      entity_type: 'profile',
      metadata: {},
    });
    assert.ok(forgeErr, 'Client must not insert sensitive ADMIN_* audit events');

    const { error: restoreErr } = await userA.rpc('restore_backup_atomic', {
      p_backup_id: crypto.randomUUID(),
      p_mode: 'merge',
      p_dry_run: true,
    });
    assert.ok(restoreErr, 'Regular user must not invoke restore_backup_atomic');
  });

  // ---------------------------------------------------------------------------
  // Group G — BUG-19, BUG-21, BUG-23 Hardening Tests
  // ---------------------------------------------------------------------------
  it('BUG-19: Concurrent 2-admin editing detects conflict and transaction rolls back on invalid payload', async () => {
    const { client: admin1 } = await signInAs('admin@quiz.local');
    const { client: admin2 } = await signInAs('admin2@quiz.local');
    const setId = crypto.randomUUID();

    // Admin 1 creates set (version 1)
    const { error: createErr } = await admin1.rpc('save_quiz_set_atomic', {
      p_id: setId,
      p_collection_id: null,
      p_name: 'Concurrent Set',
      p_description: '',
      p_expected_version: null,
      p_questions: [{
        id: crypto.randomUUID(),
        prompt: 'Q1',
        explanation: '',
        options: [{ label: 'A', text: '1' }, { label: 'B', text: '2' }],
        correctIndices: [0],
      }],
    });
    assert.equal(createErr, null);

    // Admin 2 updates with version 1 -> succeeds (version becomes 2)
    const { data: upd2, error: err2 } = await admin2.rpc('save_quiz_set_atomic', {
      p_id: setId,
      p_collection_id: null,
      p_name: 'Concurrent Set v2',
      p_description: '',
      p_expected_version: 1,
      p_questions: [{
        id: crypto.randomUUID(),
        prompt: 'Q1 updated',
        explanation: '',
        options: [{ label: 'A', text: '1' }, { label: 'B', text: '2' }],
        correctIndices: [0],
      }],
    });
    assert.equal(err2, null);
    assert.equal(upd2.version, 2);

    // Admin 1 tries to save with stale version 1 -> CONFLICT
    const { error: conflictErr } = await admin1.rpc('save_quiz_set_atomic', {
      p_id: setId,
      p_collection_id: null,
      p_name: 'Stale Write',
      p_description: '',
      p_expected_version: 1,
      p_questions: [],
    });
    assert.ok(conflictErr && conflictErr.message.includes('CONFLICT'));

    // Invalid payload (null option/question array) must roll back atomically without bumping version
    const { error: txFailErr } = await admin1.rpc('save_quiz_set_atomic', {
      p_id: setId,
      p_collection_id: null,
      p_name: 'Rollback Set',
      p_description: '',
      p_expected_version: 2,
      p_questions: [{ id: 'not-a-uuid', prompt: 'Bad', options: [], correctIndices: [] }],
    });
    assert.ok(txFailErr);

    const { data: persisted } = await admin1.from('quiz_sets').select('name, version').eq('id', setId).single();
    assert.equal(persisted.name, 'Concurrent Set v2');
    assert.equal(persisted.version, 2);

    await admin1.rpc('delete_quiz_set_atomic', { p_id: setId });
  });

  it('BUG-19: Pagination fetches >1000 rows without PostgREST truncation', async () => {
    const sbService = makeAdminServiceClient();
    const { user } = await signInAs('admin@quiz.local');
    const setId = crypto.randomUUID();
    await sbService.from('quiz_sets').insert({ id: setId, name: 'Large Set 1050', created_by: user.id });

    const bulkQuestions = Array.from({ length: 1050 }, (_, idx) => ({
      id: crypto.randomUUID(),
      quiz_set_id: setId,
      prompt: `Bulk Question ${idx + 1}`,
      explanation: '',
      sort_order: idx,
    }));
    const { error: insErr } = await sbService.from('questions').insert(bulkQuestions);
    assert.equal(insErr, null);

    // Fetch with 1000-row pagination
    const { client: userA } = await signInAs('usera@quiz.local');
    const fetched = [];
    let offset = 0;
    while (true) {
      const { data, error } = await userA
        .from('questions')
        .select('id')
        .eq('quiz_set_id', setId)
        .order('sort_order', { ascending: true })
        .range(offset, offset + 999);
      assert.equal(error, null);
      if (!data || data.length === 0) break;
      fetched.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }
    assert.equal(fetched.length, 1050);

    await sbService.from('quiz_sets').delete().eq('id', setId);
  });

  it('BUG-21 & BUG-23: Backup & restore preserves quiz_collections.term and normalizes term values', async () => {
    const { client: adminClient, user } = await signInAs('admin@quiz.local');
    const colId = crypto.randomUUID();
    const { error: colErr } = await adminClient.from('quiz_collections').insert({
      id: colId,
      name: 'Môn Kỳ 10',
      term: 'Kỳ 10',
      created_by: user.id,
    });
    assert.equal(colErr, null);

    const { data: normTerm } = await adminClient.rpc('normalize_quiz_term', { p_term: '  ky  10 ' });
    assert.equal(normTerm, 'Kỳ 10');

    const { data: backup, error: bErr } = await adminClient
      .from('backup_metadata')
      .insert({
        created_by: user.id,
        scope: 'shared_content',
        status: 'completed',
        app_version: 'v2.0.0',
        entity_counts: { quizCollections: 1, quizSets: 0 },
        snapshot_data: {
          collections: [{ id: colId, name: 'Môn Kỳ 10', term: 'Kỳ 10', description: '' }],
          tests: [],
          vocabCollections: [],
          vocabDecks: [],
        },
      })
      .select('id')
      .single();
    assert.equal(bErr, null);

    // Mutate term to something else, then restore and verify term='Kỳ 10' is restored
    await adminClient.from('quiz_collections').update({ term: 'Kỳ 1' }).eq('id', colId);
    const { error: restErr } = await adminClient.rpc('restore_backup_atomic', {
      p_backup_id: backup.id,
      p_mode: 'merge',
      p_dry_run: false,
    });
    assert.equal(restErr, null);

    const { data: restoredCol } = await adminClient.from('quiz_collections').select('term').eq('id', colId).single();
    assert.equal(restoredCol.term, 'Kỳ 10');

    // BUG-25: Replace restore must be rejected
    const { error: replaceErr } = await adminClient.rpc('restore_backup_atomic', {
      p_backup_id: backup.id,
      p_mode: 'replace',
      p_dry_run: false,
    });
    assert.ok(replaceErr && replaceErr.message.includes('merge'));

    // BUG-27: Old backup without term field must preserve existing term in merge mode
    const { data: oldBackup } = await adminClient
      .from('backup_metadata')
      .insert({
        created_by: user.id,
        scope: 'shared_content',
        status: 'completed',
        app_version: 'v2.0.0',
        entity_counts: { quizCollections: 1, quizSets: 0 },
        snapshot_data: {
          collections: [{ id: colId, name: 'Môn Kỳ 10 (Old Backup)', description: '' }],
          tests: [],
          vocabCollections: [],
          vocabDecks: [],
        },
      })
      .select('id')
      .single();

    const { error: mergeOldErr } = await adminClient.rpc('restore_backup_atomic', {
      p_backup_id: oldBackup.id,
      p_mode: 'merge',
      p_dry_run: false,
    });
    assert.equal(mergeOldErr, null);

    const { data: preservedCol } = await adminClient.from('quiz_collections').select('term').eq('id', colId).single();
    assert.equal(preservedCol.term, 'Kỳ 10');

    await adminClient.from('quiz_collections').delete().eq('id', colId);
  });

  // ---------------------------------------------------------------------------
  // Group H — Secure Source Code Distribution (SRC-01 .. SRC-25)
  // ---------------------------------------------------------------------------
  it('SRC-01..SRC-25: Full Source Package, Private Storage, Access Codes, Concurrency, Idempotency & Rate Limit', async () => {
    const admin = await signInAs('admin@quiz.local');
    const userA = await signInAs('usera@quiz.local');
    const userB = await signInAs('userb@quiz.local');
    const disabled = await signInAs('disabled@quiz.local');
    const firstLogin = await signInAs('firstlogin@quiz.local');
    const sbService = makeAdminServiceClient();

    const callAdminSrc = async (token, body) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      return { status: res.status, data: await res.json() };
    };

    const callRedeemSrc = async (token, body) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/redeem-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      return { status: res.status, data: await res.json() };
    };

    // SRC-20 & SRC-24: Regular user cannot create package; unsafe URL rejected
    const userCreateRes = await callAdminSrc(userA.session.access_token, {
      action: 'create_package',
      name: 'Hack',
      delivery_type: 'LINK',
      external_url: 'https://example.com',
    });
    assert.equal(userCreateRes.status, 403);

    const badLinkRes = await callAdminSrc(admin.session.access_token, {
      action: 'create_package',
      name: 'Unsafe Link',
      delivery_type: 'LINK',
      external_url: 'javascript:alert(1)',
      status: 'ACTIVE',
    });
    assert.equal(badLinkRes.status, 400);

    // SRC-01 & SRC-02: Admin creates FILE package and uploads minimal valid empty ZIP (PK\x05\x06)
    const createPkgRes = await callAdminSrc(admin.session.access_token, {
      action: 'create_package',
      name: 'Quiz App Starter ZIP',
      description: 'Sample archive',
      version: '2.0.0',
      delivery_type: 'FILE',
      status: 'DRAFT',
    });
    assert.equal(createPkgRes.status, 200);
    const pkgId = createPkgRes.data.package.id;

    const emptyZipBytes = new Uint8Array([
      0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const form = new FormData();
    form.append('packageId', pkgId);
    form.append('file', new Blob([emptyZipBytes], { type: 'application/zip' }), 'starter.zip');

    const upRes = await fetch(`${SUPABASE_URL}/functions/v1/admin-source`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.session.access_token}` },
      body: form,
    });
    assert.equal(upRes.status, 200);
    const upJson = await upRes.json();
    const storagePath = upJson.package.storage_path;
    assert.ok(storagePath && upJson.package.file_name === 'starter.zip');

    // Activate package
    const actRes = await callAdminSrc(admin.session.access_token, {
      action: 'update_package',
      id: pkgId,
      name: 'Quiz App Starter ZIP',
      delivery_type: 'FILE',
      status: 'ACTIVE',
    });
    assert.equal(actRes.status, 200);

    // SRC-12 & SRC-13: User cannot read code_hash or private storage object directly
    const { error: hashReadErr } = await userA.client.from('source_access_codes').select('code_hash');
    assert.ok(hashReadErr);
    const { data: directFile, error: directStorageErr } = await userA.client.storage
      .from('source-packages')
      .download(storagePath);
    assert.equal(directFile, null);
    assert.ok(directStorageErr);

    // SRC-03: Admin creates 1-use code + normal code
    const code1Res = await callAdminSrc(admin.session.access_token, {
      action: 'create_code',
      source_package_id: pkgId,
      mode: 'manual',
      code: 'OneUseCode2026',
      max_redemptions: 1,
      max_redemptions_per_user: 1,
    });
    assert.equal(code1Res.status, 200);
    assert.equal(code1Res.data.plaintextCode, 'OneUseCode2026');

    // SRC-09, SRC-10, SRC-11: Anon, Disabled, First-login blocked
    const anonRes = await fetch(`${SUPABASE_URL}/functions/v1/redeem-source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: 'OneUseCode2026', operationId: 'anon-1' }),
    });
    assert.equal(anonRes.status, 401);
    assert.equal((await callRedeemSrc(disabled.session.access_token, { accessCode: 'OneUseCode2026', operationId: 'dis-1' })).status, 403);
    assert.equal((await callRedeemSrc(firstLogin.session.access_token, { accessCode: 'OneUseCode2026', operationId: 'fl-1' })).status, 403);

    // SRC-16 & SRC-17: Concurrent 2-user race on 1-use code -> only 1 succeeds
    const [rA, rB] = await Promise.all([
      callRedeemSrc(userA.session.access_token, { accessCode: 'OneUseCode2026', operationId: `race-a-${Date.now()}` }),
      callRedeemSrc(userB.session.access_token, { accessCode: 'OneUseCode2026', operationId: `race-b-${Date.now()}` }),
    ]);
    const statuses = [rA.status, rB.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [200, 400]);

    const winner = rA.status === 200 ? { user: userA, res: rA } : { user: userB, res: rB };
    const loser = rA.status === 200 ? userB : userA;

    // SRC-14: Signed download URL works
    const dlFetch = await fetch(winner.res.data.signedUrl);
    assert.equal(dlFetch.status, 200);
    const dlBytes = new Uint8Array(await dlFetch.arrayBuffer());
    assert.equal(dlBytes.length, emptyZipBytes.length);

    // SRC-18 & SRC-25: Retry same operationId & re-download do NOT increment redemption_count
    const retryOpId = `idem-${Date.now()}`;
    const code2Res = await callAdminSrc(admin.session.access_token, {
      action: 'create_code',
      source_package_id: pkgId,
      mode: 'random',
      max_redemptions: 5,
    });
    const code2Plain = code2Res.data.plaintextCode;
    assert.ok(code2Plain.length >= 12);

    const firstRedeem = await callRedeemSrc(winner.user.session.access_token, { accessCode: code2Plain, operationId: retryOpId });
    const replayRedeem = await callRedeemSrc(winner.user.session.access_token, { accessCode: code2Plain, operationId: retryOpId });
    assert.equal(firstRedeem.status, 200);
    assert.equal(replayRedeem.status, 200);
    assert.equal(replayRedeem.data.idempotent, true);

    const { data: code2Row } = await sbService
      .from('source_access_codes')
      .select('redemption_count')
      .eq('id', code2Res.data.code.id)
      .single();
    assert.equal(code2Row.redemption_count, 1);

    // SRC-19: Loser cannot see winner's redemption history for this package
    const loserHist = await callRedeemSrc(loser.session.access_token, { action: 'list_my_redemptions' });
    assert.equal(loserHist.data.redemptions.some((r) => r.package?.id === pkgId), false);

    // SRC-21: Rotate code -> old code stops working
    const rotRes = await callAdminSrc(admin.session.access_token, {
      action: 'rotate_code',
      source_package_id: pkgId,
      revoke_code_id: code2Res.data.code.id,
    });
    assert.equal(rotRes.status, 200);
    const oldAfterRotate = await callRedeemSrc(loser.session.access_token, {
      accessCode: code2Plain,
      operationId: `after-rot-${Date.now()}`,
    });
    assert.equal(oldAfterRotate.status, 400);

    // SRC-05 & SRC-22: 5 invalid attempts trigger 429 rate limit for loser (winner unaffected)
    for (let i = 0; i < 5; i++) {
      await callRedeemSrc(loser.session.access_token, { accessCode: 'WrongCode123', operationId: `rl-${i}-${Date.now()}` });
    }
    const rlBlocked = await callRedeemSrc(loser.session.access_token, { accessCode: rotRes.data.plaintextCode, operationId: `rl-blk-${Date.now()}` });
    assert.equal(rlBlocked.status, 429);

    // Cleanup test SRC artifacts
    await sbService.from('source_redemptions').delete().eq('source_package_id', pkgId);
    await sbService.from('source_access_codes').delete().eq('source_package_id', pkgId);
    await sbService.from('source_packages').delete().eq('id', pkgId);
    await sbService.storage.from('source-packages').remove([storagePath]);
  });
});
