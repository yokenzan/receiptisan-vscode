const assert = require('node:assert/strict');
const test = require('node:test');

const {
  decodeFutanKubun,
  toHalfWidthAscii,
  collectActiveDays,
} = require('../out/domain/tekiyou-utils.js');

test('decodeFutanKubun decodes representative codes', () => {
  assert.deepEqual(decodeFutanKubun('1'), [true, false, false, false, false]);
  assert.deepEqual(decodeFutanKubun('9'), [true, true, true, true, true]);
  assert.deepEqual(decodeFutanKubun('?'), [false, false, false, false, false]);
});

test('toHalfWidthAscii converts zenkaku ascii and full-width spaces', () => {
  assert.equal(toHalfWidthAscii('ＡＢＣ　１２３！'), 'ABC 123!');
});

test('collectActiveDays picks and sorts only positive days', () => {
  const sections = [
    {
      shinryou_shikibetsu: { code: '11', name: '' },
      ichiren_units: [
        {
          futan_kubun: '1',
          santei_units: [
            {
              tensuu: 0,
              kaisuu: 0,
              daily_kaisuus: [
                { date: { year: 2024, month: 1, day: 8 }, kaisuu: 1 },
                { date: { year: 2024, month: 1, day: 3 }, kaisuu: 2 },
                { date: { year: 2024, month: 1, day: 3 }, kaisuu: 0 },
              ],
              items: [],
            },
          ],
        },
      ],
    },
  ];

  assert.deepEqual(collectActiveDays(sections), [3, 8]);
});
