import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordStrength } from '../src/lib/passwordPolicy.js';
import { calculateStreakStats, getLocalDateStr } from '../src/data/streak.js';
import { arraysEqual, renderMd } from '../src/data/storage.js';

describe('Password Policy Validation', () => {
  it('Từ chối mật khẩu quá ngắn hoặc thiếu độ phức tạp', () => {
    assert.ok(validatePasswordStrength('1234567'));
    assert.ok(validatePasswordStrength('abcdefgh'));
    assert.ok(validatePasswordStrength('Abcdefgh'));
    assert.ok(validatePasswordStrength('abcdefg1'));
  });

  it('Chấp nhận mật khẩu đủ mạnh', () => {
    assert.equal(validatePasswordStrength('StrongPass1'), null);
    assert.equal(validatePasswordStrength('QuizApp@2026'), null);
  });
});

describe('Streak & Learning Regression', () => {
  it('Tính toán streak chính xác khi học hôm nay', () => {
    const today = getLocalDateStr(new Date());
    const stats = calculateStreakStats({
      activityLog: { [today]: 3 },
      history: [],
      vocabStats: {},
    });
    assert.equal(stats.currentStreak, 1);
  });

  it('arraysEqual so sánh chính xác mảng đáp án nhiều lựa chọn', () => {
    assert.equal(arraysEqual([0, 2], [0, 2]), true);
    assert.equal(arraysEqual([0, 2], [0, 1]), false);
    assert.equal(arraysEqual([0], [0, 1]), false);
  });
});

describe('XSS Prevention in Markdown Renderer', () => {
  it('Escape thẻ script thô trong nội dung câu hỏi', () => {
    const out = renderMd('Câu hỏi <script>alert(1)</script>');
    assert.equal(out.includes('<script>'), false);
    assert.equal(out.includes('&lt;script&gt;'), true);
  });
});
