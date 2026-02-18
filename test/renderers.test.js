const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildCalendarHeaderCells,
  buildCompactCalendarHeaderCells,
  buildFutanDataCells,
  formatSanteiDays,
} = require('../out/features/data-view/view/tekiyou-table.js');
const { getTenkiColorClass } = require('../out/features/data-view/view/receipt-meta.js');
const {
  buildReceiptLabelViewModel,
} = require('../out/features/data-view/view-model/receipt-label.js');

test('buildCalendarHeaderCells returns month day header cells', () => {
  const cells = buildCalendarHeaderCells(2024, 2);
  assert.equal(cells.length, 29);
  assert.equal(cells[0].className.includes('col-cal'), true);
  assert.equal(cells[0].text, '1');
});

test('buildCompactCalendarHeaderCells renders only active days', () => {
  const cells = buildCompactCalendarHeaderCells([2, 15], 2024, 1);
  assert.deepEqual(
    cells.map((cell) => cell.text),
    ['2', '15'],
  );
});

test('buildFutanDataCells maps marks by code', () => {
  const cells = buildFutanDataCells('1', true, [true, true, true, true, true]);
  assert.equal(cells.filter((cell) => cell.active).length, 1);
});

test('formatSanteiDays groups consecutive dates as ranges', () => {
  const text = formatSanteiDays(
    [
      { date: { year: 2024, month: 1, day: 1 }, kaisuu: 1 },
      { date: { year: 2024, month: 1, day: 2 }, kaisuu: 1 },
      { date: { year: 2024, month: 1, day: 3 }, kaisuu: 1 },
      { date: { year: 2024, month: 1, day: 5 }, kaisuu: 1 },
      { date: { year: 2024, month: 1, day: 6 }, kaisuu: 1 },
      { date: { year: 2024, month: 1, day: 6 }, kaisuu: 1 },
      { date: { year: 2024, month: 1, day: 9 }, kaisuu: 0 },
    ],
    2024,
    1,
  );
  assert.equal(text, '1~3, 5~6');
});

test('receipt meta helpers render expected labels', () => {
  assert.equal(getTenkiColorClass(2), 'tag-tenki-2');
  assert.equal(getTenkiColorClass(7), 'tag-tenki');

  const label = buildReceiptLabelViewModel({
    id: 12,
    nyuugai: 'gairai',
    shinryou_ym: { wareki: { gengou: { alphabet: 'R', base_year: 2019 }, year: 6, month: 2 } },
    patient: { id: 'P-9', name: '山田太郎' },
  });
  assert.equal(label.idPart, '0012');
  assert.equal(label.nyuugaiLabel, '外');
  assert.equal(label.shinryouYm, '2024(R06).02');
  assert.equal(label.patientName, '山田太郎');
});
