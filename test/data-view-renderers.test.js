const assert = require('node:assert/strict');
const test = require('node:test');

const {
  renderDataViewPage,
  renderDataViewErrorHtml,
} = require('../out/features/data-view/view/page.js');

function wareki(alphabet, year, month, day) {
  return {
    gengou: { alphabet },
    year,
    month,
    ...(day != null ? { day } : {}),
  };
}

function createSampleData() {
  return [
    {
      seikyuu_ym: { year: 2024, month: 1, wareki: wareki('R', 6, 1) },
      audit_payer: { name: '支払基金' },
      prefecture: { name: '東京都' },
      hospital: { name: 'サンプル病院', code: '0001', location: '東京', tel: '00-0000-0000' },
      receipts: [
        {
          id: 1,
          shinryou_ym: { year: 2024, month: 1, wareki: wareki('R', 6, 1) },
          nyuugai: 'gairai',
          type: {
            tensuu_hyou_type: { code: '1', name: '医科' },
            main_hoken_type: { code: '1', name: '社保' },
            hoken_multiple_type: { code: '1', name: '単独' },
            patient_age_type: { code: '1', name: '一般' },
          },
          tokki_jikous: [],
          nyuuin_date: null,
          byoushou_types: [],
          patient: {
            id: 'P-1',
            name: '患者A',
            name_kana: null,
            sex: { code: '1', name: '男' },
            birth_date: { year: 1985, month: 4, day: 1, wareki: wareki('S', 60, 4, 1) },
          },
          hokens: {
            main: '協会けんぽ',
            iryou_hoken: {
              hokenja_bangou: '123456',
              kigou: 'AB',
              bangou: '1234',
              edaban: null,
              kyuufu_wariai: 70,
              teishotoku_type: null,
            },
            kouhi_futan_iryous: [],
          },
          ryouyou_no_kyuufu: {
            iryou_hoken: {
              goukei_tensuu: 120,
              shinryou_jitsunissuu: 1,
              ichibu_futankin: null,
              kyuufu_taishou_ichibu_futankin: null,
              shokuji_seikatsu_ryouyou_kaisuu: null,
              shokuji_seikatsu_ryouyou_goukei_kingaku: null,
              shokuji_seikatsu_ryouyou_hyoujun_futangaku: 0,
            },
            kouhi_futan_iryous: [],
          },
          shoubyoumeis: [],
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
        },
      ],
    },
  ];
}

test('renderDataViewPage horizontal renders full month calendar columns', () => {
  const html = renderDataViewPage(createSampleData(), 'horizontal', {
    normalizeTekiyouAscii: false,
  });

  const headers = html.match(/<th class="col-cal[^"]*">/g) ?? [];
  assert.equal(headers.length, 31);
  assert.ok(html.includes('class="tekiyou-table"'));
  assert.ok(html.includes('class="col-futan'));
});

test('renderDataViewPage vertical renders compact layout with active day header', () => {
  const html = renderDataViewPage(createSampleData(), 'vertical', { normalizeTekiyouAscii: false });

  assert.ok(html.includes('class="tekiyou-table tekiyou-compact"'));
  assert.ok(html.includes('算定日'));
  assert.match(html, /\b2, 15\b/);
});

test('renderDataViewPage does not leak ruby object inspection strings in output', () => {
  const data = createSampleData();
  data[0].receipts[0].hokens.main = '#<Receiptisan::Model::...>';

  const html = renderDataViewPage(data, 'vertical', { normalizeTekiyouAscii: false });
  assert.equal(html.includes('#<Receiptisan::Model::...>'), false);
});

test('renderDataViewErrorHtml escapes stderr', () => {
  const html = renderDataViewErrorHtml({
    type: 'execution_error',
    message: '失敗',
    stderr: '<script>alert(1)</script>',
  });

  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.equal(html.includes('<script>alert(1)</script>'), false);
});
