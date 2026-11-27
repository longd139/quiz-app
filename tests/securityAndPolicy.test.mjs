import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordStrength } from '../src/lib/passwordPolicy.js';
import {
  calculateStreakStats,
  getAllActivityMap,
  getLocalDateStr,
  recordStudyActivity,
} from '../src/data/streak.js';
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
  it('Tính toán streak chính xác khi học hôm nay và ngày hôm qua', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = getLocalDateStr(today);
    const yesterdayStr = getLocalDateStr(yesterday);

    const stats = calculateStreakStats({
      activityLog: { [todayStr]: 3, [yesterdayStr]: 2 },
      history: [],
      vocabStats: {},
    });
    assert.equal(stats.currentStreak, 2);
  });

  it('recordStudyActivity tăng đúng số lượng hoạt động trong ngày', () => {
    const todayStr = getLocalDateStr(new Date());
    const updated = recordStudyActivity({ activityLog: { [todayStr]: 2 } }, 3);
    assert.equal(updated.activityLog[todayStr], 5);

    const map = getAllActivityMap(updated);
    assert.equal(map[todayStr], 5);
  });

  it('arraysEqual so sánh chính xác mảng đáp án nhiều lựa chọn', () => {
    assert.equal(arraysEqual([0, 2], [0, 2]), true);
    assert.equal(arraysEqual([0, 2], [0, 1]), false);
    assert.equal(arraysEqual([0], [0, 1]), false);
  });
});

describe('XSS Prevention in Markdown Renderer', () => {
  it('Escape thẻ script và payload HTML thô trong nội dung câu hỏi', () => {
    const out = renderMd('Câu hỏi <script>alert(1)</script> <img src=x onerror=alert(1)>');
    assert.equal(out.includes('<script>'), false);
    assert.equal(out.includes('&lt;script&gt;'), true);
    assert.equal(out.includes('<img'), false);
  });

  it('Bảo toàn định dạng Markdown và ký hiệu toán học LaTeX hợp lệ', () => {
    const out = renderMd('**Định nghĩa**: $x \\in \\mathbb{R}$ và $a \\leq b$');
    assert.equal(out.includes('<strong>Định nghĩa</strong>'), true);
    assert.equal(out.includes('∈'), true);
    assert.equal(out.includes('≤'), true);
  });
});
