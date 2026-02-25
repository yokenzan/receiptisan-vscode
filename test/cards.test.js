const assert = require('node:assert/strict');
const test = require('node:test');

const {
  renderReceiptHeader,
  renderPatientCard,
  renderPatientReceiptCardHorizontal,
  renderHokenCard,
  renderHokenKyuufuCardHorizontal,
  renderShoubyoumeiCard,
  renderKyuufuCard,
} = require('../out/features/data-view/view/cards.js');

function wareki(alphabet, year, month, day) {
  return {
    gengou: { alphabet },
    year,
    month,
    ...(day != null ? { day } : {}),
  };
}

function createReceipt() {
  return {
    id: 1,
    shinryou_ym: { year: 2024, month: 1, wareki: wareki('R', 6, 1) },
    nyuugai: 'gairai',
    nyuuin_date: null,
    byoushou_types: [],
    tokki_jikous: [],
    type: {
      tensuu_hyou_type: { code: '1', name: '医科' },
      main_hoken_type: { code: '1', name: '社保' },
      hoken_multiple_type: { code: '1', name: '単独' },
      patient_age_type: { code: '1', name: '一般' },
    },
    patient: {
      id: 'P-1',
      name: '患者A',
      name_kana: null,
      sex: { code: '1', name: '男' },
      birth_date: { year: 1985, month: 1, day: 1, wareki: wareki('S', 60, 1, 1) },
    },
    hokens: {
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
        ichibu_futankin: 0,
        kyuufu_taishou_ichibu_futankin: null,
        shokuji_seikatsu_ryouyou_kaisuu: null,
        shokuji_seikatsu_ryouyou_goukei_kingaku: null,
        shokuji_seikatsu_ryouyou_hyoujun_futangaku: 0,
      },
      kouhi_futan_iryous: [],
    },
    shoubyoumeis: [
      {
        shoubyoumeis: [
          {
            is_main: true,
            is_worpro: false,
            master_shuushokugos: [],
            master_shoubyoumei: { code: 'A001' },
            tenki: { code: 1, name: '治癒' },
            full_text: '感冒',
            comment: null,
            start_date: { year: 2024, month: 1, day: 2, wareki: wareki('R', 6, 1, 2) },
          },
        ],
      },
    ],
  };
}

test('card renderers output expected sections', () => {
  const receipt = createReceipt();
  assert.ok(renderReceiptHeader(receipt).includes('診療年月'));
  assert.ok(renderPatientCard(receipt).includes('患者情報'));
  assert.ok(renderHokenCard(receipt).includes('療養の給付'));
  assert.ok(renderShoubyoumeiCard(receipt.shoubyoumeis).includes('傷病名'));
});

test('renderKyuufuCard returns empty when no meal/life data exists', () => {
  const receipt = createReceipt();
  assert.equal(renderKyuufuCard(receipt), '');
});

test('renderKyuufuCard includes shikaku column next to jigyousha and uses stacked layout', () => {
  const receipt = createReceipt();
  receipt.ryouyou_no_kyuufu.iryou_hoken.shokuji_seikatsu_ryouyou_kaisuu = 2;
  receipt.ryouyou_no_kyuufu.iryou_hoken.shokuji_seikatsu_ryouyou_goukei_kingaku = 1234;
  receipt.ryouyou_no_kyuufu.iryou_hoken.shokuji_seikatsu_ryouyou_hyoujun_futangaku = 600;
  receipt.hokens.iryou_hoken.kigou = 'AB';
  receipt.hokens.iryou_hoken.bangou = '1234';
  receipt.hokens.iryou_hoken.edaban = '5';

  const html = renderKyuufuCard(receipt);
  assert.match(html, /<th class="sep-strong">資格番号<\/th>/);
  assert.ok(html.includes('class="shikaku-layout"'));
  assert.ok(html.includes('class="shikaku-kigou">AB</span>'));
  assert.ok(html.includes('class="shikaku-bangou">1234</span>'));
  assert.ok(html.includes('class="shikaku-edaban">(5)</span>'));
});

test('renderPatientCard shows legal age at end of shinryou month', () => {
  const receipt = createReceipt();
  receipt.shinryou_ym = { year: 2025, month: 10, wareki: wareki('R', 7, 10) };
  receipt.patient.birth_date = { year: 2000, month: 10, day: 10, wareki: wareki('H', 12, 10, 10) };

  const html = renderPatientCard(receipt);
  assert.ok(html.includes('生年月日'));
  assert.match(html, /2000.*H12.*10\.10/s);
  assert.match(html, /25.*歳.*0.*ヶ月.*🎂/s);
});

test('renderPatientCard handles Feb 29 birth with legal age rule', () => {
  const receipt = createReceipt();
  receipt.shinryou_ym = { year: 2025, month: 2, wareki: wareki('R', 7, 2) };
  receipt.patient.birth_date = { year: 2000, month: 2, day: 29, wareki: wareki('H', 12, 2, 29) };

  const html = renderPatientCard(receipt);
  assert.match(html, /2000.*H12.*02\.29/s);
  assert.match(html, /25.*歳.*0.*ヶ月.*🎂/s);
});

test('renderPatientCard includes month-age when not anniversary month-end yet', () => {
  const receipt = createReceipt();
  receipt.shinryou_ym = { year: 2025, month: 9, wareki: wareki('R', 7, 9) };
  receipt.patient.birth_date = { year: 2000, month: 10, day: 10, wareki: wareki('H', 12, 10, 10) };

  const html = renderPatientCard(receipt);
  assert.match(html, /2000.*H12.*10\.10/s);
  assert.match(html, /24.*歳.*11.*ヶ月/s);
});

test('renderPatientReceiptCardHorizontal combines patient and receipt header', () => {
  const receipt = createReceipt();
  const html = renderPatientReceiptCardHorizontal(receipt);
  assert.ok(!html.includes('患者情報・レセプトヘッダー'));
  assert.ok(html.includes('No.'));
  assert.ok(html.includes('診療年月'));
  assert.ok(html.includes('患者番号'));
});

test('renderHokenKyuufuCardHorizontal combines hoken and kyuufu by kubun', () => {
  const receipt = createReceipt();
  receipt.nyuugai = 'nyuuin';
  receipt.ryouyou_no_kyuufu.iryou_hoken.shokuji_seikatsu_ryouyou_kaisuu = 2;
  receipt.ryouyou_no_kyuufu.iryou_hoken.shokuji_seikatsu_ryouyou_goukei_kingaku = 1234;
  receipt.ryouyou_no_kyuufu.iryou_hoken.shokuji_seikatsu_ryouyou_hyoujun_futangaku = 600;

  const html = renderHokenKyuufuCardHorizontal(receipt);
  assert.ok(html.includes('療養の給付'));
  assert.ok(html.includes('医療保険'));
  assert.ok(html.includes('請求点数'));
  assert.ok(html.includes('標準負担金額'));
  assert.ok(html.includes('請求金額'));
  assert.match(html, /<th class="sep-strong">資格番号<\/th>/);
  assert.ok(html.includes('class="shikaku-layout"'));
  assert.ok(html.includes('class="shikaku-kigou">AB</span>'));
  assert.ok(html.includes('class="shikaku-bangou">1234</span>'));
});

test('renderHokenKyuufuCardHorizontal hides meal/life columns for gairai', () => {
  const receipt = createReceipt();
  receipt.nyuugai = 'gairai';
  receipt.ryouyou_no_kyuufu.iryou_hoken.shokuji_seikatsu_ryouyou_kaisuu = 2;
  receipt.ryouyou_no_kyuufu.iryou_hoken.shokuji_seikatsu_ryouyou_goukei_kingaku = 1234;
  receipt.ryouyou_no_kyuufu.iryou_hoken.shokuji_seikatsu_ryouyou_hyoujun_futangaku = 600;

  const html = renderHokenKyuufuCardHorizontal(receipt);
  assert.ok(!html.includes('回数'));
  assert.ok(!html.includes('請求金額'));
  assert.ok(!html.includes('標準負担金額'));
});

test('renderHokenCard lays out shikaku bangou with stacked symbol/number and right-aligned edaban', () => {
  const receipt = createReceipt();
  receipt.hokens.iryou_hoken.kigou = 'AB';
  receipt.hokens.iryou_hoken.bangou = '1234';
  receipt.hokens.iryou_hoken.edaban = '5';

  const html = renderHokenCard(receipt);
  assert.ok(html.includes('class="shikaku-layout"'));
  assert.ok(html.includes('class="shikaku-main-stack"'));
  assert.ok(html.includes('class="shikaku-kigou">AB</span>'));
  assert.ok(html.includes('class="shikaku-bangou">1234</span>'));
  assert.ok(html.includes('class="shikaku-edaban">(5)</span>'));
});

test('renderHokenCard normalizes full-width shikaku fields when option is enabled', () => {
  const receipt = createReceipt();
  receipt.hokens.iryou_hoken.kigou = 'ＡＢ';
  receipt.hokens.iryou_hoken.bangou = '１２３４';
  receipt.hokens.iryou_hoken.edaban = '５';

  const html = renderHokenCard(receipt, { normalizeHokenShikakuAscii: true });
  assert.ok(html.includes('class="shikaku-kigou">AB</span>'));
  assert.ok(html.includes('class="shikaku-bangou">1234</span>'));
  assert.ok(html.includes('class="shikaku-edaban">(5)</span>'));
});

test('renderHokenKyuufuCardHorizontal keeps full-width shikaku by default and normalizes with option', () => {
  const receipt = createReceipt();
  receipt.hokens.iryou_hoken.kigou = 'ＡＢ';
  receipt.hokens.iryou_hoken.bangou = '１２３４';

  const htmlDefault = renderHokenKyuufuCardHorizontal(receipt);
  assert.ok(htmlDefault.includes('class="shikaku-kigou">ＡＢ</span>'));
  assert.ok(htmlDefault.includes('class="shikaku-bangou">１２３４</span>'));

  const htmlNormalized = renderHokenKyuufuCardHorizontal(receipt, {
    normalizeHokenShikakuAscii: true,
  });
  assert.ok(htmlNormalized.includes('class="shikaku-kigou">AB</span>'));
  assert.ok(htmlNormalized.includes('class="shikaku-bangou">1234</span>'));
});
