/* global process, crypto, fetch, FormData, Blob, TextEncoder, URL */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { assertLocalEnvironment } from '../../scripts/lib/environment-guard.mjs';

const TEST_PASSWORD = process.env.LOCAL_TEST_PASSWORD || 'QuizLocal2026!';

let SUPABASE_URL;
let ANON_KEY;
let SERVICE_KEY;

function loadTestStatus() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    SUPABASE_URL = process.env.SUPABASE_URL;
    ANON_KEY = process.env.SUPABASE_ANON_KEY;
    SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    const workdir = process.env.SUPABASE_WORKDIR || 'supabase-test';
    const raw = execSync(`npx supabase --workdir "${workdir}" status --output json`, { encoding: 'utf8' });
    const status = JSON.parse(raw);
    SUPABASE_URL = status.API_URL || 'http://127.0.0.1:54331';
    ANON_KEY = status.ANON_KEY || status.PUBLISHABLE_KEY;
    SERVICE_KEY = status.SERVICE_ROLE_KEY;
  }
  assertLocalEnvironment({
    appEnv: 'test',
    supabaseUrl: SUPABASE_URL,
    dbUrl: process.env.DB_URL || '',
    operation: 'src security integration tests',
    expectedApiPort: '54331',
  });
}

function makeAnonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

function makeServiceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signInAs(email, password = TEST_PASSWORD) {
  const client = makeAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return { client, user: data.user, session: data.session };
}

async function callAdminSrc(token, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-source`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, data: await res.json() };
}

async function callRedeemSrc(token, body, extraHeaders = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/redeem-source`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extraHeaders },
    body: JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, data: await res.json() };
}

// Minimal valid ZIP file containing PK\x03\x04 local file header + PK\x05\x06 EOCD
function makeSampleZipBytes() {
  const name = new TextEncoder().encode('index.js');
  const content = new TextEncoder().encode('console.log("hello src");');
  // Local file header (30 bytes) + filename + content + Central dir (46 bytes) + filename + EOCD (22 bytes)
  const lfh = new Uint8Array(30 + name.length + content.length);
  const dv1 = new DataView(lfh.buffer);
  dv1.setUint32(0, 0x04034b50, true);
  dv1.setUint16(4, 20, true);
  dv1.setUint32(18, content.length, true);
  dv1.setUint32(22, content.length, true);
  dv1.setUint16(26, name.length, true);
  lfh.set(name, 30);
  lfh.set(content, 30 + name.length);

  const cdOffset = lfh.length;
  const cd = new Uint8Array(46 + name.length);
  const dv2 = new DataView(cd.buffer);
  dv2.setUint32(0, 0x02014b50, true);
  dv2.setUint16(4, 20, true);
  dv2.setUint16(6, 20, true);
  dv2.setUint32(20, content.length, true);
  dv2.setUint32(24, content.length, true);
  dv2.setUint16(28, name.length, true);
  cd.set(name, 46);

  const eocd = new Uint8Array(22);
  const dv3 = new DataView(eocd.buffer);
  dv3.setUint32(0, 0x06054b50, true);
  dv3.setUint16(8, 1, true);
  dv3.setUint16(10, 1, true);
  dv3.setUint32(12, cd.length, true);
  dv3.setUint32(16, cdOffset, true);

  const full = new Uint8Array(lfh.length + cd.length + eocd.length);
  full.set(lfh, 0);
  full.set(cd, lfh.length);
  full.set(eocd, lfh.length + cd.length);
  return full;
}

describe('SRC Security Hardening Suite (BUG-29..BUG-34 & Groups A-G)', () => {
  const createdPkgIds = [];
  const uploadedPaths = [];

  before(() => {
    loadTestStatus();
  });

  after(async () => {
    const sb = makeServiceClient();
    for (const pid of createdPkgIds) {
      await sb.from('source_redemptions').delete().eq('source_package_id', pid);
      await sb.from('source_access_codes').delete().eq('source_package_id', pid);
      await sb.from('source_packages').delete().eq('id', pid);
    }
    if (uploadedPaths.length > 0) {
      await sb.storage.from('source-packages').remove(uploadedPaths);
    }
  });

  // Group A — Authorization & BUG-31 Direct REST Protection
  it('Group A1: Anonymous, Disabled, and First-login users are rejected by redeem-source', async () => {
    const anonRes = await fetch(`${SUPABASE_URL}/functions/v1/redeem-source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: 'SomeCode123', operationId: 'anon-op' }),
    });
    assert.equal(anonRes.status, 401);

    const disabled = await signInAs('disabled@quiz.local');
    const disRes = await callRedeemSrc(disabled.session.access_token, { accessCode: 'SomeCode123', operationId: 'dis-op' });
    assert.equal(disRes.status, 403);

    const first = await signInAs('firstlogin@quiz.local');
    const flRes = await callRedeemSrc(first.session.access_token, { accessCode: 'SomeCode123', operationId: 'fl-op' });
    assert.equal(flRes.status, 403);
  });

  it('Group A2 (BUG-31): Direct REST mutations on source_packages, access_codes, rate_limits & privileged RPCs are blocked even for Admin', async () => {
    const admin = await signInAs('admin@quiz.local');
    const userA = await signInAs('usera@quiz.local');

    // Admin direct INSERT into source_packages via PostgREST must fail (42501 / permission denied)
    const { error: directAdminInsErr } = await admin.client.from('source_packages').insert({
      name: 'Direct REST Bypass',
      delivery_type: 'LINK',
      external_url: 'https://example.com',
      created_by: admin.user.id,
    });
    assert.ok(directAdminInsErr, 'Admin direct REST INSERT on source_packages must be blocked');

    // Regular user cannot read source_access_codes or rate_limits
    const { error: codeReadErr } = await userA.client.from('source_access_codes').select('*');
    assert.ok(codeReadErr);
    const { error: rlReadErr } = await userA.client.from('source_redeem_rate_limits').select('*');
    assert.ok(rlReadErr);

    // Privileged RPCs cannot be called by authenticated clients
    const { error: rpcErr1 } = await admin.client.rpc('reserve_source_redeem_attempt_atomic', { p_user_id: admin.user.id });
    assert.ok(rpcErr1);
    const { error: rpcErr2 } = await admin.client.rpc('redeem_source_package_atomic', {
      p_user_id: admin.user.id,
      p_access_code_id: crypto.randomUUID(),
      p_operation_id: 'bypass',
    });
    assert.ok(rpcErr2);
  });

  // Group B — BUG-30 Atomic Access Code Rotation
  it('Group B1 (BUG-30): Atomic code rotation preserves old code on duplicate failure and prevents concurrent double-rotation', async () => {
    const admin = await signInAs('admin@quiz.local');
    const admin2 = await signInAs('admin2@quiz.local');
    const userA = await signInAs('usera@quiz.local');

    const pkg1Res = await callAdminSrc(admin.session.access_token, {
      action: 'create_package',
      name: 'Rotation Test Pkg 1',
      delivery_type: 'LINK',
      external_url: 'https://github.com/longd139/quiz-app',
      status: 'ACTIVE',
    });
    assert.equal(pkg1Res.status, 200);
    const pkg1Id = pkg1Res.data.package.id;
    createdPkgIds.push(pkg1Id);

    const pkg2Res = await callAdminSrc(admin.session.access_token, {
      action: 'create_package',
      name: 'Rotation Test Pkg 2',
      delivery_type: 'LINK',
      external_url: 'https://github.com/longd139/quiz-app',
      status: 'ACTIVE',
    });
    const pkg2Id = pkg2Res.data.package.id;
    createdPkgIds.push(pkg2Id);

    // Create initial manual code + another existing code to test duplicate collision
    const c1 = await callAdminSrc(admin.session.access_token, {
      action: 'create_code',
      source_package_id: pkg1Id,
      mode: 'manual',
      code: 'RotateInitial01',
    });
    assert.equal(c1.status, 200);
    await callAdminSrc(admin.session.access_token, {
      action: 'create_code',
      source_package_id: pkg2Id,
      mode: 'manual',
      code: 'ExistingCode99',
    });

    // Cross-package rotation rejected
    const crossRot = await callAdminSrc(admin.session.access_token, {
      action: 'rotate_code',
      source_package_id: pkg2Id,
      revoke_code_id: c1.data.code.id,
      mode: 'random',
    });
    assert.equal(crossRot.status, 400);

    // Duplicate new code rolls back entire rotation -> RotateInitial01 stays ACTIVE!
    const dupRot = await callAdminSrc(admin.session.access_token, {
      action: 'rotate_code',
      source_package_id: pkg1Id,
      revoke_code_id: c1.data.code.id,
      mode: 'manual',
      code: 'ExistingCode99',
    });
    assert.equal(dupRot.status, 400);

    // Verify RotateInitial01 still works!
    const redeemOld = await callRedeemSrc(userA.session.access_token, {
      accessCode: 'RotateInitial01',
      operationId: `rot-still-active-${Date.now()}`,
    });
    assert.equal(redeemOld.status, 200);

    // Concurrent rotation of c1 by two admins -> exactly 1 succeeds, 1 fails
    const [rot1, rot2] = await Promise.all([
      callAdminSrc(admin.session.access_token, {
        action: 'rotate_code',
        source_package_id: pkg1Id,
        revoke_code_id: c1.data.code.id,
        mode: 'random',
      }),
      callAdminSrc(admin2.session.access_token, {
        action: 'rotate_code',
        source_package_id: pkg1Id,
        revoke_code_id: c1.data.code.id,
        mode: 'random',
      }),
    ]);
    assert.deepEqual([rot1.status, rot2.status].sort((a, b) => a - b), [200, 400]);
  });

  // Group C — BUG-34 Concurrent Idempotency & Conflict
  it('Group C1 (BUG-34): Concurrent identical retries return canonical redemptionId; same operationId with different code returns 409', async () => {
    const admin = await signInAs('admin@quiz.local');
    const userA = await signInAs('usera@quiz.local');

    const pkgRes = await callAdminSrc(admin.session.access_token, {
      action: 'create_package',
      name: 'Idempotency Pkg',
      delivery_type: 'LINK',
      external_url: 'https://github.com/longd139/quiz-app',
      status: 'ACTIVE',
    });
    const pkgId = pkgRes.data.package.id;
    createdPkgIds.push(pkgId);

    const c1 = await callAdminSrc(admin.session.access_token, {
      action: 'create_code',
      source_package_id: pkgId,
      mode: 'random',
      max_redemptions: 10,
    });
    const c2 = await callAdminSrc(admin.session.access_token, {
      action: 'create_code',
      source_package_id: pkgId,
      mode: 'random',
      max_redemptions: 10,
    });

    const opId = `concurrent-idem-${Date.now()}`;
    const [r1, r2] = await Promise.all([
      callRedeemSrc(userA.session.access_token, { accessCode: c1.data.plaintextCode, operationId: opId }),
      callRedeemSrc(userA.session.access_token, { accessCode: c1.data.plaintextCode, operationId: opId }),
    ]);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r1.data.redemptionId, r2.data.redemptionId);

    // Same operationId with DIFFERENT code -> 409 conflict
    const conflictRes = await callRedeemSrc(userA.session.access_token, {
      accessCode: c2.data.plaintextCode,
      operationId: opId,
    });
    assert.equal(conflictRes.status, 409);

    const sb = makeServiceClient();
    const { data: codeRow } = await sb.from('source_access_codes').select('redemption_count').eq('id', c1.data.code.id).single();
    assert.equal(codeRow.redemption_count, 1);
  });

  // Group D — BUG-29 Atomic Rate Limiting
  it('Group D1 (BUG-29): 20 concurrent invalid requests cannot bypass 5-attempt budget; User B unaffected', async () => {
    const userB = await signInAs('userb@quiz.local');
    const sb = makeServiceClient();
    await sb.from('source_redeem_rate_limits').delete().eq('user_id', userB.user.id);

    const burst = await Promise.all(
      Array.from({ length: 20 }, (_, idx) =>
        callRedeemSrc(userB.session.access_token, {
          accessCode: 'InvalidBurstCode99',
          operationId: `burst-${idx}-${Date.now()}`,
        })
      )
    );
    const count429 = burst.filter((r) => r.status === 429).length;
    const count400 = burst.filter((r) => r.status === 400).length;
    assert.equal(count400, 5, 'Exactly 5 attempts allowed before cooldown');
    assert.equal(count429, 15, 'Remaining 15 concurrent attempts must receive HTTP 429');
    const sample429 = burst.find((r) => r.status === 429);
    assert.ok(Number(sample429.headers.get('retry-after')) >= 1);

    // Cleanup rate limit for userB
    await sb.from('source_redeem_rate_limits').delete().eq('user_id', userB.user.id);
  });

  // Group E — BUG-32 Signed URL Origin & File Security
  it('Group E1 (BUG-32): Spoofed forwarded headers cannot alter signed URL origin; invalid ZIP rejected', async () => {
    const admin = await signInAs('admin@quiz.local');
    const userA = await signInAs('usera@quiz.local');

    const pkgRes = await callAdminSrc(admin.session.access_token, {
      action: 'create_package',
      name: 'Sample Zip With File',
      delivery_type: 'FILE',
      status: 'DRAFT',
    });
    const pkgId = pkgRes.data.package.id;
    createdPkgIds.push(pkgId);

    // Invalid ZIP signature rejected
    const badForm = new FormData();
    badForm.append('packageId', pkgId);
    badForm.append('file', new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'application/zip' }), 'fake.zip');
    const badUp = await fetch(`${SUPABASE_URL}/functions/v1/admin-source`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.session.access_token}` },
      body: badForm,
    });
    assert.equal(badUp.status, 400);

    // Valid ZIP containing index.js
    const zipBytes = makeSampleZipBytes();
    const goodForm = new FormData();
    goodForm.append('packageId', pkgId);
    goodForm.append('file', new Blob([zipBytes], { type: 'application/zip' }), '../evil/sample.zip');
    const goodUp = await fetch(`${SUPABASE_URL}/functions/v1/admin-source`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.session.access_token}` },
      body: goodForm,
    });
    assert.equal(goodUp.status, 200);
    const upJson = await goodUp.json();
    uploadedPaths.push(upJson.package.storage_path);
    assert.ok(upJson.package.storage_path.startsWith(`${pkgId}/`));
    assert.equal(upJson.package.file_name, 'sample.zip');

    await callAdminSrc(admin.session.access_token, {
      action: 'update_package',
      id: pkgId,
      name: 'Sample Zip With File',
      delivery_type: 'FILE',
      status: 'ACTIVE',
    });

    const codeRes = await callAdminSrc(admin.session.access_token, {
      action: 'create_code',
      source_package_id: pkgId,
      mode: 'random',
    });

    // Attempt header spoofing when redeeming
    const redeemRes = await callRedeemSrc(
      userA.session.access_token,
      { accessCode: codeRes.data.plaintextCode, operationId: `spoof-${Date.now()}` },
      {
        'x-forwarded-host': 'evil-attacker.com',
        'x-forwarded-proto': 'https',
      }
    );
    assert.equal(redeemRes.status, 200);
    const signedUrl = new URL(redeemRes.data.signedUrl);
    assert.equal(signedUrl.origin, 'http://127.0.0.1:54331');

    // Download actual ZIP bytes via signed URL
    const dl = await fetch(redeemRes.data.signedUrl);
    assert.equal(dl.status, 200);
    const downloaded = new Uint8Array(await dl.arrayBuffer());
    assert.equal(downloaded.length, zipBytes.length);

    // Disable package -> get_download_url must be blocked
    await callAdminSrc(admin.session.access_token, {
      action: 'update_package',
      id: pkgId,
      name: 'Sample Zip With File',
      delivery_type: 'FILE',
      status: 'INACTIVE',
    });
    const blockedRedownload = await callRedeemSrc(userA.session.access_token, {
      action: 'get_download_url',
      redemptionId: redeemRes.data.redemptionId,
    });
    assert.equal(blockedRedownload.status, 403);
  });

  // Group F — Legacy V1.3.5 Migration Verification (BUG-28)
  it('Group F1 (BUG-28): Legacy analyze_legacy_rooms works for service_role and legacy RPCs remain revoked', async () => {
    const sb = makeServiceClient();
    const userA = await signInAs('usera@quiz.local');
    const { data, error } = await sb.rpc('analyze_legacy_rooms');
    assert.equal(error, null);
    assert.ok(data && typeof data === 'object');

    const { error: userErr } = await userA.client.rpc('create_app_room', { p_secret: 'legacy' });
    assert.ok(userErr);
  });

  // Group G — Server-side Pagination
  it('Group G1: admin-source overview_and_list paginates and filters accurately', async () => {
    const admin = await signInAs('admin@quiz.local');
    const p1 = await callAdminSrc(admin.session.access_token, {
      action: 'overview_and_list',
      page: 1,
      pageSize: 2,
      search: 'Rotation Test Pkg',
    });
    assert.equal(p1.status, 200);
    assert.ok(p1.data.totalFilteredPackages >= 2);
    assert.equal(p1.data.packages.length, 2);
  });
});
