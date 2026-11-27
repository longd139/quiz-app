import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatFileSize,
  isAccessCodeExhausted,
  isAccessCodeExpired,
  MAX_SOURCE_FILE_BYTES,
  normalizeAccessCodeInput,
  validateAccessCodeInput,
  validateExternalHttpsUrl,
  validateSourceZipFile,
} from '../src/lib/sourceValidation.js';

describe('SRC Unit Validation (Phase 12.1)', () => {
  it('Normalizes and validates access code strength', () => {
    assert.equal(normalizeAccessCodeInput('  Abc12345  '), 'Abc12345');
    assert.ok(validateAccessCodeInput(''));
    assert.ok(validateAccessCodeInput('short'));
    assert.ok(validateAccessCodeInput('has space123'));
    assert.equal(validateAccessCodeInput('ValidCode2026!'), null);
  });

  it('Validates HTTPS external URLs and rejects unsafe protocols', () => {
    assert.equal(validateExternalHttpsUrl('https://github.com/longd139/quiz-app').ok, true);
    assert.equal(validateExternalHttpsUrl('http://github.com/longd139/quiz-app').ok, false);
    assert.equal(validateExternalHttpsUrl('javascript:alert(1)').ok, false);
    assert.equal(validateExternalHttpsUrl('data:text/html,hi').ok, false);
    assert.equal(validateExternalHttpsUrl('file:///etc/passwd').ok, false);
    assert.equal(validateExternalHttpsUrl('https://user:pass@example.com').ok, false);
  });

  it('Validates ZIP file extension and size limits', () => {
    assert.equal(validateSourceZipFile({ name: 'app.zip', size: 1024 }), null);
    assert.ok(validateSourceZipFile({ name: 'malware.exe', size: 1024 }));
    assert.ok(validateSourceZipFile({ name: 'empty.zip', size: 0 }));
    assert.ok(validateSourceZipFile({ name: 'huge.zip', size: MAX_SOURCE_FILE_BYTES + 1 }));
    assert.equal(formatFileSize(1536), '1.5 KB');
  });

  it('Checks expiration and redemption exhaustion accurately', () => {
    const now = new Date('2026-11-27T12:00:00Z').getTime();
    assert.equal(isAccessCodeExpired(null, now), false);
    assert.equal(isAccessCodeExpired('2026-11-27T11:59:59Z', now), true);
    assert.equal(isAccessCodeExpired('2026-11-27T12:00:01Z', now), false);

    assert.equal(isAccessCodeExhausted(5, null), false);
    assert.equal(isAccessCodeExhausted(4, 5), false);
    assert.equal(isAccessCodeExhausted(5, 5), true);
  });
});
