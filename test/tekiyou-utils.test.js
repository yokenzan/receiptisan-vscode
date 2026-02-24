const assert = require('node:assert/strict');
const test = require('node:test');

const { decodeFutanKubun, toHalfWidthAscii } = require('../out/domain/tekiyou-utils.js');

test('decodeFutanKubun decodes representative codes', () => {
  assert.deepEqual(decodeFutanKubun('1'), [true, false, false, false, false]);
  assert.deepEqual(decodeFutanKubun('9'), [true, true, true, true, true]);
  assert.deepEqual(decodeFutanKubun('?'), [false, false, false, false, false]);
});

test('toHalfWidthAscii converts zenkaku ascii and full-width spaces', () => {
  assert.equal(toHalfWidthAscii('ＡＢＣ　１２３！'), 'ABC 123!');
});
