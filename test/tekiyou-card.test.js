const assert = require('node:assert/strict');
const test = require('node:test');

const { renderTekiyouCard } = require('../out/features/data-view/view/tekiyou.js');

function receipt() {
  return {
    shinryou_ym: { year: 2024, month: 1 },
    hokens: { iryou_hoken: {}, kouhi_futan_iryous: [] },
    tekiyou: {
      shinryou_shikibetsu_sections: [
        {
          shinryou_shikibetsu: { code: '11' },
          ichiren_units: [
            {
              futan_kubun: '1',
              santei_units: [
                {
                  tensuu: 120,
                  kaisuu: 1,
                  daily_kaisuus: [
                    { date: { year: 2024, month: 1, day: 2 }, kaisuu: 1 },
                    { date: { year: 2024, month: 1, day: 15 }, kaisuu: 1 },
                  ],
                  items: [
                    {
                      type: 'comment',
                      master: { code: '820000001', pattern: '', name: '' },
                      text: '処方(内服)',
                      appended_content: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

test('renderTekiyouCard horizontal uses full month calendar table', () => {
  const html = renderTekiyouCard(receipt(), true, { normalizeTekiyouAscii: false });
  assert.ok(html.includes('class="tekiyou-table"'));
  assert.ok(html.includes('コード'));
  assert.ok(html.includes('class="col-futan'));
});

test('renderTekiyouCard vertical uses compact calendar table', () => {
  const html = renderTekiyouCard(receipt(), false, { normalizeTekiyouAscii: false });
  assert.ok(html.includes('class="tekiyou-table tekiyou-compact"'));
  assert.ok(html.includes('算定日'));
  assert.match(html, /<th class="col-cal[^"]*">2<\/th>/);
});
