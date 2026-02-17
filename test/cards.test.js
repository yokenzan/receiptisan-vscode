const assert = require('node:assert/strict');
const test = require('node:test');

const {
  renderReceiptHeader,
  renderPatientCard,
  renderHokenCard,
  renderShoubyoumeiCard,
  renderKyuufuCard,
} = require('../out/features/data-view/view/cards.js');

function wareki(alphabet, year, month, day) {
  return { gengou: { alphabet }, year, month, ...(day != null ? { day } : {}) };
}

function createReceipt() {
  return {
    id: 1,
    shinryou_ym: { wareki: wareki('R', 6, 1) },
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
      birth_date: { wareki: wareki('S', 60, 1, 1) },
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
            start_date: { wareki: wareki('R', 6, 1, 2) },
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
  assert.ok(renderHokenCard(receipt).includes('保険情報'));
  assert.ok(renderShoubyoumeiCard(receipt.shoubyoumeis).includes('傷病名'));
});

test('renderKyuufuCard returns empty when no meal/life data exists', () => {
  const receipt = createReceipt();
  assert.equal(renderKyuufuCard(receipt), '');
});
