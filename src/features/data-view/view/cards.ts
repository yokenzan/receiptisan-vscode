import { formatWarekiShort } from '../../../domain/tekiyou-utils';
import type {
  DigitalizedReceipt,
  Receipt,
  ShoubyoumeiGroup,
} from '../../../shared/receiptisan-json-types';
import { renderTemplate } from '../../../template/eta-renderer';
import { getTenkiColorClass } from './receipt-meta';
import { formatNumber } from './tekiyou-table';

interface HokenRowViewModel {
  kubun: string;
  hokenjaBangou: string;
  shikakuBangou: string;
  jitsunissuu: UnitValue | null;
  tensuu: UnitValue | null;
  kyuufuTaishouIchibuFutankin: UnitValue | null;
  ichibuFutankin: UnitValue | null;
}

interface KyuufuRowViewModel {
  kubun: string;
  kaisuu: UnitValue | null;
  goukeiKingaku: UnitValue | null;
  hyoujunFutangaku: UnitValue | null;
}

interface HokenKyuufuRowViewModel {
  kubun: string;
  hokenjaBangou: string;
  shikakuBangou: string;
  jitsunissuu: UnitValue | null;
  tensuu: UnitValue | null;
  kyuufuTaishouIchibuFutankin: UnitValue | null;
  ichibuFutankin: UnitValue | null;
  kaisuu: UnitValue | null;
  goukeiKingaku: UnitValue | null;
  hyoujunFutangaku: UnitValue | null;
}

interface ShoubyoumeiRowViewModel {
  rowClass: string;
  index: number;
  code: string;
  shuushokugoCodes: string[];
  isMain: boolean;
  isUtagai: boolean;
  isWorpro: boolean;
  fullText: string;
  comment: string;
  startDate: string;
  tenkiClass: string;
  tenkiName: string;
}

interface UnitValue {
  value: string;
  unit: string;
  prefix?: string;
  suffix?: string;
}

function fallbackDash(value: string | null | undefined): string {
  if (value == null) return '-';
  return value.trim().length > 0 ? value : '-';
}

function parseKouhiKubunIndex(kubun: string): number {
  const match = /^公費(\d+)$/.exec(kubun);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]);
}

function getKubunOrder(kubun: string): number {
  if (kubun === '医療保険') return 0;
  if (kubun.startsWith('公費')) return 100 + parseKouhiKubunIndex(kubun);
  return 999;
}

function endOfMonthDate(year: number, month: number): Date {
  return new Date(year, month, 0);
}

function buildReceiptHeaderViewModel(receipt: Receipt) {
  const t = receipt.type;
  const typeBadges = [
    t.tensuu_hyou_type,
    t.main_hoken_type,
    t.hoken_multiple_type,
    t.patient_age_type,
  ].map((tp) => ({ code: String(tp.code), name: tp.name }));
  const tokkiJikous = receipt.tokki_jikous.map((tk) => ({
    code: String(tk.code),
    name: tk.name,
  }));
  const nyuuinDateCell =
    receipt.nyuugai === 'nyuuin' && receipt.nyuuin_date
      ? formatWarekiShort(receipt.nyuuin_date.wareki)
      : '';
  const byoushouCell =
    receipt.nyuugai === 'nyuuin' && receipt.byoushou_types.length > 0
      ? receipt.byoushou_types.map((b) => b.short_name).join('、')
      : '';

  return {
    id: receipt.id,
    shinryouYm: formatWarekiShort(receipt.shinryou_ym.wareki),
    nyuugai: receipt.nyuugai,
    typeBadges,
    tokkiJikous,
    nyuuinDateCell,
    byoushouCell,
  };
}

function buildPatientCardViewModel(receipt: Receipt) {
  const p = receipt.patient;
  const sexKind =
    String(p.sex.code) === '1' ? 'male' : String(p.sex.code) === '2' ? 'female' : 'other';
  const birthDate = p.birth_date?.wareki ? formatWarekiShort(p.birth_date.wareki) : '-';
  const asOf = endOfMonthDate(receipt.shinryou_ym.year, receipt.shinryou_ym.month);
  const ageYearsMonths = p.birth_date
    ? calculateLegalAgeYearsMonthsAt(
        {
          year: p.birth_date.year,
          month: p.birth_date.month,
          day: p.birth_date.day,
        },
        asOf,
      )
    : null;
  const isBirthMonth = p.birth_date ? p.birth_date.month === receipt.shinryou_ym.month : false;

  return {
    patientId: fallbackDash(p.id),
    name: fallbackDash(p.name),
    nameKana: p.name_kana,
    sexName: p.sex.name,
    sexKind,
    birthDate,
    ageYearsMonths,
    isBirthMonth,
  };
}

function buildHokenCardData(receipt: Receipt): {
  rows: HokenRowViewModel[];
  detailParts: string[];
} {
  const h = receipt.hokens;
  const ih = h.iryou_hoken;
  const k = receipt.ryouyou_no_kyuufu;
  const rows: HokenRowViewModel[] = [];
  const detailParts: string[] = [];

  if (ih) {
    const kih = k.iryou_hoken;
    const shikakuParts = [ih.kigou, ih.bangou, ih.edaban].filter((v) => v != null);

    rows.push({
      kubun: '医療保険',
      hokenjaBangou: ih.hokenja_bangou,
      shikakuBangou: shikakuParts.join('・'),
      jitsunissuu: makeUnitValue(kih?.shinryou_jitsunissuu, '日'),
      tensuu: makeUnitValue(kih?.goukei_tensuu, '点'),
      kyuufuTaishouIchibuFutankin: makeUnitValue(kih?.kyuufu_taishou_ichibu_futankin, '円', {
        prefix: '(',
        suffix: ')',
      }),
      ichibuFutankin: makeUnitValue(kih?.ichibu_futankin, '円'),
    });

    if (ih.kyuufu_wariai != null) detailParts.push(`給付割合: ${ih.kyuufu_wariai}%`);
    if (ih.teishotoku_type) detailParts.push(`低所得: ${ih.teishotoku_type}`);
  }

  for (let i = 0; i < h.kouhi_futan_iryous.length; i++) {
    const kouhi = h.kouhi_futan_iryous[i];
    const rk = k.kouhi_futan_iryous[i];
    rows.push({
      kubun: `公費${i + 1}`,
      hokenjaBangou: kouhi.futansha_bangou,
      shikakuBangou: kouhi.jukyuusha_bangou,
      jitsunissuu: makeUnitValue(rk?.shinryou_jitsunissuu, '日'),
      tensuu: makeUnitValue(rk?.goukei_tensuu, '点'),
      kyuufuTaishouIchibuFutankin: makeUnitValue(rk?.kyuufu_taishou_ichibu_futankin, '円', {
        prefix: '(',
        suffix: ')',
      }),
      ichibuFutankin: makeUnitValue(rk?.ichibu_futankin, '円'),
    });
  }

  return {
    rows,
    detailParts,
  };
}

function buildKyuufuRows(receipt: Receipt): KyuufuRowViewModel[] {
  const k = receipt.ryouyou_no_kyuufu;
  const ih = k.iryou_hoken;
  const rows: KyuufuRowViewModel[] = [];
  const hasIh =
    ih &&
    ((ih.shokuji_seikatsu_ryouyou_kaisuu != null && ih.shokuji_seikatsu_ryouyou_kaisuu > 0) ||
      (ih.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
        ih.shokuji_seikatsu_ryouyou_goukei_kingaku > 0) ||
      ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0);

  if (hasIh && ih) {
    rows.push({
      kubun: '医療保険',
      kaisuu: makeUnitValue(ih.shokuji_seikatsu_ryouyou_kaisuu, '回'),
      goukeiKingaku: makeUnitValue(ih.shokuji_seikatsu_ryouyou_goukei_kingaku, '円'),
      hyoujunFutangaku: makeUnitValue(
        ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0
          ? ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku
          : null,
        '円',
      ),
    });
  }

  for (let i = 0; i < k.kouhi_futan_iryous.length; i++) {
    const rk = k.kouhi_futan_iryous[i];
    const hasData =
      (rk.shokuji_seikatsu_ryouyou_kaisuu != null && rk.shokuji_seikatsu_ryouyou_kaisuu > 0) ||
      (rk.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
        rk.shokuji_seikatsu_ryouyou_goukei_kingaku > 0);
    if (!hasData) continue;

    rows.push({
      kubun: `公費${i + 1}`,
      kaisuu: makeUnitValue(rk.shokuji_seikatsu_ryouyou_kaisuu, '回'),
      goukeiKingaku: makeUnitValue(rk.shokuji_seikatsu_ryouyou_goukei_kingaku, '円'),
      hyoujunFutangaku: makeUnitValue(
        rk.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0
          ? rk.shokuji_seikatsu_ryouyou_hyoujun_futangaku
          : null,
        '円',
      ),
    });
  }

  return rows;
}

function makeUnitValue(
  n: number | null | undefined,
  unit: string,
  options?: { prefix?: string; suffix?: string },
): UnitValue | null {
  if (n == null) return null;
  return {
    value: formatNumber(n),
    unit,
    prefix: options?.prefix,
    suffix: options?.suffix,
  };
}

function calculateLegalAgeYearsMonthsAt(
  birth: { year: number; month: number; day: number },
  asOf: Date,
): { years: number; months: number } {
  // 民法143条の前日満了ルールに合わせ、判定日を1日進めて「経過月数」を計算する。
  const reference = new Date(asOf.getTime());
  reference.setDate(reference.getDate() + 1);

  const refYear = reference.getFullYear();
  const refMonth = reference.getMonth() + 1;
  const refDay = reference.getDate();

  let totalMonths = (refYear - birth.year) * 12 + (refMonth - birth.month);
  if (refDay < birth.day) totalMonths -= 1;
  if (totalMonths < 0) totalMonths = 0;

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

/**
 * Renders top-level UKE header card.
 */
export function renderUkeHeader(dr: DigitalizedReceipt): string {
  const detailParts: string[] = [];
  if (dr.hospital.location) detailParts.push(dr.hospital.location);
  if (dr.hospital.tel) detailParts.push(`TEL: ${dr.hospital.tel}`);

  return renderTemplate('data-view/uke-header.eta', {
    hospitalName: dr.hospital.name ?? dr.hospital.code,
    seikyuuYm: formatWarekiShort(dr.seikyuu_ym.wareki),
    auditPayerName: dr.audit_payer.name,
    prefectureName: dr.prefecture.name,
    detailParts,
  });
}

/**
 * Renders receipt summary header card.
 */
export function renderReceiptHeader(receipt: Receipt): string {
  return renderTemplate('data-view/receipt-header-card.eta', buildReceiptHeaderViewModel(receipt));
}

/**
 * Renders patient information card.
 */
export function renderPatientCard(receipt: Receipt): string {
  return renderTemplate('data-view/patient-card.eta', buildPatientCardViewModel(receipt));
}

/**
 * Renders integrated insurance/public-insurance information card.
 */
export function renderHokenCard(receipt: Receipt): string {
  const { rows, detailParts } = buildHokenCardData(receipt);
  if (rows.length === 0) return '';

  return renderTemplate('data-view/hoken-card.eta', {
    rows,
    detailParts,
  });
}

/**
 * Renders disease list card.
 */
export function renderShoubyoumeiCard(groups: ShoubyoumeiGroup[]): string {
  if (groups.length === 0) return '';

  const rows: ShoubyoumeiRowViewModel[] = [];
  let idx = 0;
  for (const group of groups) {
    for (const s of group.shoubyoumeis) {
      idx++;

      const rowClasses: string[] = [];
      if (s.is_main) rowClasses.push('disease-main');
      if (s.is_worpro) rowClasses.push('disease-worpro');

      rows.push({
        rowClass: rowClasses.join(' '),
        index: idx,
        code: s.master_shoubyoumei.code,
        shuushokugoCodes: s.master_shuushokugos.map((m) => m.code),
        isMain: s.is_main,
        isUtagai: s.master_shuushokugos.some((m) => String(m.code) === '8002'),
        isWorpro: s.is_worpro === true,
        fullText: s.full_text,
        comment: s.comment ?? '',
        startDate: formatWarekiShort(s.start_date.wareki),
        tenkiClass: getTenkiColorClass(s.tenki.code),
        tenkiName: s.tenki.name,
      });
    }
  }

  return renderTemplate('data-view/shoubyoumei-card.eta', { rows });
}

/**
 * Renders meal/life therapy benefit card.
 */
export function renderKyuufuCard(receipt: Receipt): string {
  const rows = buildKyuufuRows(receipt);
  if (rows.length === 0) return '';

  return renderTemplate('data-view/kyuufu-card.eta', { rows });
}

/**
 * Renders a single horizontal card combining receipt header and patient info.
 */
export function renderPatientReceiptCardHorizontal(receipt: Receipt): string {
  return renderTemplate('data-view/patient-receipt-card-horizontal.eta', {
    receiptHeader: buildReceiptHeaderViewModel(receipt),
    patient: buildPatientCardViewModel(receipt),
  });
}

/**
 * Renders a single horizontal card combining insurance and meal/life data.
 */
export function renderHokenKyuufuCardHorizontal(receipt: Receipt): string {
  const { rows: hokenRows, detailParts } = buildHokenCardData(receipt);
  const kyuufuRows = buildKyuufuRows(receipt);
  if (hokenRows.length === 0 && kyuufuRows.length === 0) return '';

  const map = new Map<string, HokenKyuufuRowViewModel>();
  for (const row of hokenRows) {
    map.set(row.kubun, {
      kubun: row.kubun,
      hokenjaBangou: row.hokenjaBangou,
      shikakuBangou: row.shikakuBangou,
      jitsunissuu: row.jitsunissuu,
      tensuu: row.tensuu,
      kyuufuTaishouIchibuFutankin: row.kyuufuTaishouIchibuFutankin,
      ichibuFutankin: row.ichibuFutankin,
      kaisuu: null,
      goukeiKingaku: null,
      hyoujunFutangaku: null,
    });
  }

  for (const row of kyuufuRows) {
    const current = map.get(row.kubun);
    if (current) {
      current.kaisuu = row.kaisuu;
      current.goukeiKingaku = row.goukeiKingaku;
      current.hyoujunFutangaku = row.hyoujunFutangaku;
      continue;
    }
    map.set(row.kubun, {
      kubun: row.kubun,
      hokenjaBangou: '',
      shikakuBangou: '',
      jitsunissuu: null,
      tensuu: null,
      kyuufuTaishouIchibuFutankin: null,
      ichibuFutankin: null,
      kaisuu: row.kaisuu,
      goukeiKingaku: row.goukeiKingaku,
      hyoujunFutangaku: row.hyoujunFutangaku,
    });
  }

  const rows = [...map.values()].sort((a, b) => getKubunOrder(a.kubun) - getKubunOrder(b.kubun));
  const shikakuRows = rows.filter((row) => row.shikakuBangou.trim().length > 0);

  return renderTemplate('data-view/hoken-kyuufu-card-horizontal.eta', {
    rows,
    detailParts,
    shikakuRows,
    showMealLifeColumns: receipt.nyuugai === 'nyuuin',
  });
}
