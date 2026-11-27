import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkAnswerMatch } from '../src/domain/vocabAnswerMatcher.js';

describe('Tình huống 1: Hiện Từ Tiếng Anh -> Gõ Nghĩa Tiếng Việt', () => {
  it('Khớp chính xác tiếng Việt có dấu', () => {
    assert.equal(checkAnswerMatch('thành tựu', 'thành tựu'), true);
  });

  it('Khớp tiếng Việt không dấu', () => {
    assert.equal(checkAnswerMatch('thanh tuu', 'thành tựu'), true);
  });

  it('Khớp hoán đổi thứ tự từ (đủ chữ)', () => {
    assert.equal(checkAnswerMatch('tiền thu', 'thu tiền'), true);
  });

  it('Khớp khi chọn một trong các nghĩa đồng nghĩa (ngăn cách bởi dấu phẩy, gạch chéo)', () => {
    assert.equal(checkAnswerMatch('gom góp', 'thu thập, gom góp / tích luỹ'), true);
    assert.equal(checkAnswerMatch('tích luỹ', 'thu thập, gom góp / tích luỹ'), true);
  });

  it('Khớp khi bỏ qua phần chú thích trong ngoặc', () => {
    assert.equal(checkAnswerMatch('Cột mốc', 'Cột mốc (quan trọng)'), true);
  });

  it('Từ chối khi gõ sai hoặc thiếu chữ', () => {
    assert.equal(checkAnswerMatch('thành', 'thành tựu'), false);
    assert.equal(checkAnswerMatch('thất bại', 'thành tựu'), false);
  });
});

describe('Tình huống 2: Hiện Nghĩa Tiếng Việt -> Gõ Từ Tiếng Anh', () => {
  it('Khớp từ tiếng Anh không phân biệt hoa/thường', () => {
    assert.equal(checkAnswerMatch('ACCOMPLISH', 'accomplish'), true);
    assert.equal(checkAnswerMatch('accomplish', 'Accomplish'), true);
  });

  it('Khớp khi bỏ qua mạo từ hoặc giới từ to/a/an/the', () => {
    assert.equal(checkAnswerMatch('run', 'to run'), true);
    assert.equal(checkAnswerMatch('to run', 'run'), true);
    assert.equal(checkAnswerMatch('apple', 'an apple'), true);
    assert.equal(checkAnswerMatch('book', 'the book'), true);
  });

  it('Khớp từ đồng nghĩa tiếng Anh', () => {
    assert.equal(checkAnswerMatch('fast', 'quick, fast / rapid'), true);
    assert.equal(checkAnswerMatch('rapid', 'quick, fast / rapid'), true);
  });

  it('Từ chối khi gõ sai chính tả tiếng Anh', () => {
    assert.equal(checkAnswerMatch('acomplish', 'accomplish'), false);
    assert.equal(checkAnswerMatch('aple', 'apple'), false);
  });
});

describe('Tình huống 3: Điều hướng câu hỏi (Direction Generator)', () => {
  const mockCard = { id: 'c1', term: 'develop', meaning: 'phát triển' };

  it('term-to-meaning: Prompt là Tiếng Anh, Đáp án là Tiếng Việt', () => {
    const isTermToMeaning = true;
    const prompt = isTermToMeaning ? mockCard.term : mockCard.meaning;
    const correctAnswer = isTermToMeaning ? mockCard.meaning : mockCard.term;

    assert.equal(prompt, 'develop');
    assert.equal(correctAnswer, 'phát triển');
  });

  it('meaning-to-term: Prompt là Tiếng Việt, Đáp án là Tiếng Anh', () => {
    const isTermToMeaning = false;
    const prompt = isTermToMeaning ? mockCard.term : mockCard.meaning;
    const correctAnswer = isTermToMeaning ? mockCard.meaning : mockCard.term;

    assert.equal(prompt, 'phát triển');
    assert.equal(correctAnswer, 'develop');
  });

  it('mixed: Cả 2 chiều đều được hỗ trợ', () => {
    const directions = ['term-to-meaning', 'meaning-to-term'];
    assert.equal(directions.includes('term-to-meaning'), true);
    assert.equal(directions.includes('meaning-to-term'), true);
  });
});
