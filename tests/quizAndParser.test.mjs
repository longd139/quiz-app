import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseBulkPaste } from '../src/data/parser.js';
import {
  arraysEqual,
  createQuestion,
  createTest,
  createVocabCard,
  getFilteredTests,
  recordMooskEarned,
  shuffle,
  truncate,
} from '../src/data/storage.js';

describe('Quiz Bulk Parser (src/data/parser.js)', () => {
  it('Phân tích câu hỏi 1 đáp án và giải thích chuẩn', () => {
    const raw = `Câu 1: Thủ đô của Việt Nam là gì?
A. TP. Hồ Chí Minh
B. Hà Nội
C. Đà Nẵng
D. Hải Phòng
Đáp án: B
Giải thích: Hà Nội là thủ đô của Việt Nam.`;

    const { questions, warnings } = parseBulkPaste(raw);
    assert.equal(warnings.length, 0);
    assert.equal(questions.length, 1);
    assert.equal(questions[0].prompt, 'Thủ đô của Việt Nam là gì?');
    assert.equal(questions[0].options.length, 4);
    assert.deepEqual(questions[0].correctIndices, [1]);
    assert.equal(questions[0].explanation, 'Hà Nội là thủ đô của Việt Nam.');
  });

  it('Phân tích câu hỏi nhiều đáp án đúng (A, C)', () => {
    const raw = `1. Chọn các số nguyên tố:
A. 2
B. 4
C. 5
D. 9
Đáp án: A, C`;

    const { questions, warnings } = parseBulkPaste(raw);
    assert.equal(warnings.length, 0);
    assert.equal(questions.length, 1);
    assert.deepEqual(questions[0].correctIndices, [0, 2]);
  });

  it('Cảnh báo khi câu hỏi thiếu đáp án đúng', () => {
    const raw = `Câu 1: Nội dung câu hỏi
A. Đáp án A
B. Đáp án B`;

    const { questions, warnings } = parseBulkPaste(raw);
    assert.equal(questions.length, 1);
    assert.equal(warnings.length, 1);
  });
});

describe('Storage Model Factories & Helpers (src/data/storage.js)', () => {
  it('Tạo question, test và vocab card hợp lệ', () => {
    const q = createQuestion();
    assert.ok(q.id);
    assert.equal(q.options.length, 4);

    const t = createTest('Đề 1', 'col-1');
    assert.equal(t.name, 'Đề 1');
    assert.equal(t.collectionId, 'col-1');

    const card = createVocabCard('  apple  ', ' quả táo ', '', 'noun', 'An apple a day');
    assert.equal(card.term, 'apple');
    assert.equal(card.meaning, 'quả táo');
    assert.deepEqual(card.examples, ['An apple a day']);
  });

  it('shuffle bảo toàn toàn bộ phần tử, truncate cắt chuỗi đúng độ dài', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    assert.equal(out.length, input.length);
    assert.deepEqual(out.slice().sort(), input);
    assert.equal(truncate('abcdef', 3), 'abc...');
    assert.equal(truncate('abc', 5), 'abc');
  });

  it('getFilteredTests lọc đúng theo collectionId và recordMooskEarned cộng điểm an toàn', () => {
    const data = {
      tests: [
        { id: '1', collectionId: 'a' },
        { id: '2', collectionId: 'b' },
      ],
      mooskCount: 2,
    };
    assert.equal(getFilteredTests(data, 'a').length, 1);
    assert.equal(getFilteredTests(data, null).length, 2);
    assert.equal(recordMooskEarned(data, 1).mooskCount, 3);
    assert.equal(recordMooskEarned(data, -10).mooskCount, 0);
    assert.equal(arraysEqual([1, 2], [1, 2]), true);
  });
});
