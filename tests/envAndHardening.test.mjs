import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateSupabaseClientConfig } from '../src/lib/supabaseEnv.js';
import {
  parseEnvContent,
  loadViteEffectiveEnv,
  assertEnvFileIsLocal,
  assertLocalEnvironment,
} from '../scripts/lib/environment-guard.mjs';
import { normalizeQuizTerm, compareQuizTerms } from '../src/data/storage.js';

describe('ENV-01: Fail-closed Supabase Client Config Validation', () => {
  const localUrl = 'http://127.0.0.1:54321';
  const testUrl = 'http://127.0.0.1:54331';
  const prodUrl = 'https://abcdefghijklmno.supabase.co';
  const demoKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
  const prodKey = 'sb_publishable_real_production_key_123456';

  it('Development + valid local URL passes', () => {
    const res = validateSupabaseClientConfig({
      mode: 'development',
      dev: true,
      prod: false,
      appEnv: 'development',
      supabaseUrl: localUrl,
      publishableKey: demoKey,
    });
    assert.equal(res.ok, true);
  });

  it('Development + remote/production URL is blocked', () => {
    const res = validateSupabaseClientConfig({
      mode: 'development',
      dev: true,
      prod: false,
      appEnv: 'development',
      supabaseUrl: prodUrl,
      publishableKey: prodKey,
    });
    assert.equal(res.ok, false);
    assert.match(res.error, /local/i);
  });

  it('Development + VITE_APP_ENV=production is blocked even on localhost', () => {
    const res = validateSupabaseClientConfig({
      mode: 'development',
      dev: true,
      prod: false,
      appEnv: 'production',
      supabaseUrl: localUrl,
      publishableKey: demoKey,
    });
    assert.equal(res.ok, false);
  });

  it('Test mode blocks development DB port 54321 and allows isolated test port 54331', () => {
    const blocked = validateSupabaseClientConfig({
      mode: 'test',
      dev: true,
      prod: false,
      appEnv: 'test',
      supabaseUrl: localUrl,
      publishableKey: demoKey,
    });
    assert.equal(blocked.ok, false);

    const allowed = validateSupabaseClientConfig({
      mode: 'test',
      dev: true,
      prod: false,
      appEnv: 'test',
      supabaseUrl: testUrl,
      publishableKey: demoKey,
    });
    assert.equal(allowed.ok, true);
  });

  it('Missing or invalid URL is blocked', () => {
    assert.equal(
      validateSupabaseClientConfig({ mode: 'development', dev: true, supabaseUrl: '', publishableKey: demoKey }).ok,
      false
    );
    assert.equal(
      validateSupabaseClientConfig({ mode: 'development', dev: true, supabaseUrl: 'not-a-url', publishableKey: demoKey }).ok,
      false
    );
  });

  it('Production build blocks localhost fallback and local demo key, allows valid remote config', () => {
    assert.equal(
      validateSupabaseClientConfig({
        mode: 'production',
        dev: false,
        prod: true,
        appEnv: 'production',
        supabaseUrl: localUrl,
        publishableKey: prodKey,
      }).ok,
      false
    );

    assert.equal(
      validateSupabaseClientConfig({
        mode: 'production',
        dev: false,
        prod: true,
        appEnv: 'production',
        supabaseUrl: prodUrl,
        publishableKey: demoKey,
      }).ok,
      false
    );

    assert.equal(
      validateSupabaseClientConfig({
        mode: 'production',
        dev: false,
        prod: true,
        appEnv: 'production',
        supabaseUrl: prodUrl,
        publishableKey: prodKey,
      }).ok,
      true
    );
  });
});

describe('ENV-02 & ENV-03: Env Parsing, Vite Precedence & Project Guard', () => {
  it('parseEnvContent parses quoted values, exports, and ignores comments', () => {
    const parsed = parseEnvContent(`
      # comment
      VITE_APP_ENV="development"
      export VITE_SUPABASE_URL='http://127.0.0.1:54321'
      PLAIN=abc # inline comment
    `);
    assert.equal(parsed.VITE_APP_ENV, 'development');
    assert.equal(parsed.VITE_SUPABASE_URL, 'http://127.0.0.1:54321');
    assert.equal(parsed.PLAIN, 'abc');
  });

  it('loadViteEffectiveEnv respects .env < .env.local < .env.mode < .env.mode.local < process.env', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-env-'));
    try {
      fs.writeFileSync(path.join(tmp, '.env'), 'VITE_SUPABASE_URL=https://prod.supabase.co\nA=1\n');
      fs.writeFileSync(path.join(tmp, '.env.development.local'), 'VITE_SUPABASE_URL=http://127.0.0.1:54321\n');
      const eff = loadViteEffectiveEnv(tmp, 'development', {});
      assert.equal(eff.VITE_SUPABASE_URL, 'http://127.0.0.1:54321');
      assert.equal(eff.A, '1');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('assertEnvFileIsLocal rejects remote URL and production APP_ENV', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-env-file-'));
    try {
      const f1 = path.join(tmp, '.env.local');
      fs.writeFileSync(f1, 'VITE_SUPABASE_URL=https://remote.supabase.co\n');
      assert.throws(() => assertEnvFileIsLocal(f1, tmp), /non-local host/);

      const f2 = path.join(tmp, '.env.test.local');
      fs.writeFileSync(f2, 'VITE_APP_ENV=production\nVITE_SUPABASE_URL=http://127.0.0.1:54331\n');
      assert.throws(() => assertEnvFileIsLocal(f2, tmp), /production/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('assertLocalEnvironment rejects wrong local project_id or wrong port', () => {
    assert.throws(
      () =>
        assertLocalEnvironment({
          appEnv: 'development',
          supabaseUrl: 'http://127.0.0.1:54331',
          expectedApiPort: '54321',
          operation: 'test-port-check',
        }),
      /expected local API port 54321/
    );

    assert.throws(
      () =>
        assertLocalEnvironment({
          appEnv: 'development',
          supabaseUrl: 'http://127.0.0.1:54321',
          expectedProjectId: 'quiz-app-local',
          actualProjectId: 'other-project',
          operation: 'test-project-check',
        }),
      /expected Supabase project_id/
    );
  });
});

describe('BUG-23: Semester Term Normalization & Numeric Sorting', () => {
  it('Normalizes ky 1 / Kỳ  02 / Chung consistently', () => {
    assert.equal(normalizeQuizTerm('ky 1'), 'Kỳ 1');
    assert.equal(normalizeQuizTerm('  Kỳ   02 '), 'Kỳ 2');
    assert.equal(normalizeQuizTerm('Chung'), '');
    assert.equal(normalizeQuizTerm(''), '');
  });

  it('Sorts Kỳ 1, Kỳ 2, ..., Kỳ 10 numerically before Chung', () => {
    const terms = ['Chung', 'Kỳ 10', 'Kỳ 2', 'Kỳ 1'];
    terms.sort(compareQuizTerms);
    assert.deepEqual(terms, ['Kỳ 1', 'Kỳ 2', 'Kỳ 10', 'Chung']);
  });
});
