import { toHalfWidthAscii } from '../../../domain/tekiyou-utils';
import type {
  DigitalizedReceipt,
  Receipt,
  ShoubyoumeiGroup,
} from '../../../shared/receiptisan-json-types';
import { renderTemplate } from '../../../template/eta-renderer';
import {
  buildYearMonthDayDisplayViewModel,
  buildYearMonthDisplayViewModel,
  type YearMonthDayDisplayViewModel,
  type YearMonthDisplayViewModel,
} from '../view-model/date-display';
import { getTenkiColorClass } from './receipt-meta';
import type { DataViewRenderOptions } from './tekiyou';
import { formatNumber } from './tekiyou-table';

interface HokenRowViewModel {
  kubun: string;
  hokenjaBangou: string;
  shikakuBangou: string;
  shikakuBangouParts: {
    kigou: string;
    bangou: string;
    edaban: string;
  } | null;
  jitsunissuu: UnitValue | null;
  tensuu: UnitValue | null;
  kyuufuTaishouIchibuFutankin: UnitValue | null;
  ichibuFutankin: UnitValue | null;
}

interface KyuufuRowViewModel {
  kubun: string;
  jigyoushaBangou: string;
  shikakuBangou: string;
  shikakuBangouParts: {
    kigou: string;
    bangou: string;
    edaban: string;
  } | null;
  kaisuu: UnitValue | null;
  goukeiKingaku: UnitValue | null;
  hyoujunFutangaku: UnitValue | null;
}

interface HokenKyuufuRowViewModel {
  kubun: string;
  hokenjaBangou: string;
  shikakuBangou: string;
  shikakuBangouParts: {
    kigou: string;
    bangou: string;
    edaban: string;
  } | null;
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
  startDate: YearMonthDayDisplayViewModel;
  tenkiClass: string;
  tenkiName: string;
}

interface UnitValue {
  value: string;
  unit: string;
  prefix?: string;
  suffix?: string;
}

interface ReceiptHeaderViewModel extends Record<string, unknown> {
  id: number;
  shinryouYm: YearMonthDisplayViewModel;
  nyuugai: string;
  typeBadges: Array<{ code: string; name: string }>;
  tokkiJikous: Array<{ code: string; name: string }>;
  nyuuinDateCell: YearMonthDayDisplayViewModel | null;
  byoushouCell: string;
}

interface PatientCardViewModel extends Record<string, unknown> {
  patientId: string;
  name: string;
  nameKana: string | null;
  sexName: string;
  sexKind: 'male' | 'female' | 'other';
  birthDate: YearMonthDayDisplayViewModel | null;
  ageYearsMonths: { years: number; months: number } | null;
  isBirthMonth: boolean;
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

function buildReceiptHeaderViewModel(receipt: Receipt): ReceiptHeaderViewModel {
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
      ? buildYearMonthDayDisplayViewModel(receipt.nyuuin_date.wareki, receipt.nyuuin_date.year)
      : null;
  const byoushouCell =
    receipt.nyuugai === 'nyuuin' && receipt.byoushou_types.length > 0
      ? receipt.byoushou_types.map((b) => b.short_name).join('、')
      : '';

  return {
    id: receipt.id,
    shinryouYm: buildYearMonthDisplayViewModel(
      receipt.shinryou_ym.wareki,
      receipt.shinryou_ym.year,
    ),
    nyuugai: receipt.nyuugai,
    typeBadges,
    tokkiJikous,
    nyuuinDateCell,
    byoushouCell,
  };
}

function buildPatientCardViewModel(receipt: Receipt): PatientCardViewModel {
  const p = receipt.patient;
  const sexKind =
    String(p.sex.code) === '1' ? 'male' : String(p.sex.code) === '2' ? 'female' : 'other';
  const birthDate = p.birth_date?.wareki
    ? buildYearMonthDayDisplayViewModel(p.birth_date.wareki, p.birth_date.year)
    : null;
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

function normalizeShikakuBangou(value: string | null | undefined, normalizeAscii: boolean): string {
  if (!value) return '';
  return normalizeAscii ? toHalfWidthAscii(value) : value;
}

function buildHokenCardData(
  receipt: Receipt,
  options?: DataViewRenderOptions,
): {
  rows: HokenRowViewModel[];
  detailParts: string[];
} {
  const normalizeAscii = options?.normalizeHokenShikakuAscii ?? false;
  const h = receipt.hokens;
  const ih = h.iryou_hoken;
  const k = receipt.ryouyou_no_kyuufu;
  const rows: HokenRowViewModel[] = [];
  const detailParts: string[] = [];

  if (ih) {
    const kih = k.iryou_hoken;
    const kigou = normalizeShikakuBangou(ih.kigou, normalizeAscii);
    const bangou = normalizeShikakuBangou(ih.bangou, normalizeAscii);
    const edaban = normalizeShikakuBangou(ih.edaban, normalizeAscii);
    const hasStructuredShikaku = [kigou, bangou, edaban].some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
    const shikakuParts = [kigou, bangou, edaban].filter((v) => v.length > 0);

    rows.push({
      kubun: '医療保険',
      hokenjaBangou: ih.hokenja_bangou,
      shikakuBangou: shikakuParts.join('・'),
      shikakuBangouParts: hasStructuredShikaku
        ? {
            kigou,
            bangou,
            edaban,
          }
        : null,
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
      shikakuBangou: normalizeShikakuBangou(kouhi.jukyuusha_bangou, normalizeAscii),
      shikakuBangouParts: null,
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

function buildKyuufuRows(receipt: Receipt, options?: DataViewRenderOptions): KyuufuRowViewModel[] {
  const normalizeAscii = options?.normalizeHokenShikakuAscii ?? false;
  const k = receipt.ryouyou_no_kyuufu;
  const h = receipt.hokens;
  const ih = k.iryou_hoken;
  const rows: KyuufuRowViewModel[] = [];
  const hasIh =
    ih &&
    ((ih.shokuji_seikatsu_ryouyou_kaisuu != null && ih.shokuji_seikatsu_ryouyou_kaisuu > 0) ||
      (ih.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
        ih.shokuji_seikatsu_ryouyou_goukei_kingaku > 0) ||
      ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0);

  if (hasIh && ih) {
    const kigou = normalizeShikakuBangou(h.iryou_hoken?.kigou, normalizeAscii);
    const bangou = normalizeShikakuBangou(h.iryou_hoken?.bangou, normalizeAscii);
    const edaban = normalizeShikakuBangou(h.iryou_hoken?.edaban, normalizeAscii);
    const hasStructuredShikaku = [kigou, bangou, edaban].some((v) => v.trim().length > 0);
    const shikakuParts = [kigou, bangou, edaban].filter((v) => v.length > 0);

    rows.push({
      kubun: '医療保険',
      jigyoushaBangou: h.iryou_hoken?.hokenja_bangou ?? '',
      shikakuBangou: shikakuParts.join('・'),
      shikakuBangouParts: hasStructuredShikaku
        ? {
            kigou,
            bangou,
            edaban,
          }
        : null,
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
      jigyoushaBangou: h.kouhi_futan_iryous[i]?.futansha_bangou ?? '',
      shikakuBangou: normalizeShikakuBangou(
        h.kouhi_futan_iryous[i]?.jukyuusha_bangou,
        normalizeAscii,
      ),
      shikakuBangouParts: null,
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

function formatHospitalCode(code: string): string {
  const digits = code.replace(/\D/g, '').padStart(7, '0');
  return `${digits.slice(0, 2)}.${digits.slice(2, 6)}.${digits.slice(6, 7)}`;
}

/**
 * Renders top-level UKE header card.
 */
export function renderUkeHeader(digitalizedReceipt: DigitalizedReceipt): string {
  const hospital = digitalizedReceipt.hospital;

  const auditPayer = digitalizedReceipt.audit_payer;
  const seikyuuYm = buildYearMonthDisplayViewModel(
    digitalizedReceipt.seikyuu_ym.wareki,
    digitalizedReceipt.seikyuu_ym.year,
  );
  const auditPayerLabel = auditPayer.short_name ? `${auditPayer.short_name}保` : '';

  return renderTemplate('data-view/uke-header.eta', {
    auditPayerLabel,
    hospitalDisplayName: hospital.name ?? hospital.code,
    hospitalCode: formatHospitalCode(hospital.code),
    prefectureName: digitalizedReceipt.prefecture.name,
    location: hospital.location ?? '',
    tel: hospital.tel ?? '',
    seikyuuYm,
    auditPayerName: auditPayer.name,
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
export function renderHokenCard(receipt: Receipt, options?: DataViewRenderOptions): string {
  const { rows, detailParts } = buildHokenCardData(receipt, options);
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
        startDate: buildYearMonthDayDisplayViewModel(s.start_date.wareki, s.start_date.year),
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
export function renderKyuufuCard(receipt: Receipt, options?: DataViewRenderOptions): string {
  const rows = buildKyuufuRows(receipt, options);
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
export function renderHokenKyuufuCardHorizontal(
  receipt: Receipt,
  options?: DataViewRenderOptions,
): string {
  const { rows: hokenRows, detailParts } = buildHokenCardData(receipt, options);
  const kyuufuRows = buildKyuufuRows(receipt, options);
  if (hokenRows.length === 0 && kyuufuRows.length === 0) return '';

  const map = new Map<string, HokenKyuufuRowViewModel>();
  for (const row of hokenRows) {
    map.set(row.kubun, {
      kubun: row.kubun,
      hokenjaBangou: row.hokenjaBangou,
      shikakuBangou: row.shikakuBangou,
      shikakuBangouParts: row.shikakuBangouParts,
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
      shikakuBangouParts: null,
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

  return renderTemplate('data-view/hoken-kyuufu-card-horizontal.eta', {
    rows,
    detailParts,
    showMealLifeColumns: receipt.nyuugai === 'nyuuin',
  });
}
