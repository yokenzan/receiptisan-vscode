const assert = require('node:assert/strict');
const test = require('node:test');

const { splitParentheticalSegments } = require('../out/features/data-view/view/tekiyou-text.js');

test('splitParentheticalSegments splits plain and parenthetical text', () => {
  const segments = splitParentheticalSegments('abc(内服)def', false);
  assert.deepEqual(segments, [
    { text: 'abc', inParen: false },
    { text: '(内服)', inParen: true },
    { text: 'def', inParen: false },
  ]);
});

test('splitParentheticalSegments normalizes ascii when requested', () => {
  const segments = splitParentheticalSegments('ＡＢ（注）', true);
  assert.deepEqual(segments, [
    { text: 'AB', inParen: false },
    { text: '(注)', inParen: true },
  ]);
});
