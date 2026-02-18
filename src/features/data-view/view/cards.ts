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
  jitsunissuu: string;
  tensuu: string;
  kyuufuTaishouIchibuFutankin: string;
  ichibuFutankin: string;
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

function fallbackDash(value: string | null | undefined): string {
  if (value == null) return '-';
  return value.trim().length > 0 ? value : '-';
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

  return renderTemplate('data-view/receipt-header-card.eta', {
    id: receipt.id,
    shinryouYm: formatWarekiShort(receipt.shinryou_ym.wareki),
    nyuugai: receipt.nyuugai,
    typeBadges,
    tokkiJikous,
    nyuuinDateCell,
    byoushouCell,
  });
}

/**
 * Renders patient information card.
 */
export function renderPatientCard(receipt: Receipt): string {
  const p = receipt.patient;
  const sexKind =
    String(p.sex.code) === '1' ? 'male' : String(p.sex.code) === '2' ? 'female' : 'other';

  return renderTemplate('data-view/patient-card.eta', {
    patientId: fallbackDash(p.id),
    name: fallbackDash(p.name),
    nameKana: p.name_kana,
    sexName: p.sex.name,
    sexKind,
    birthDate: p.birth_date?.wareki ? formatWarekiShort(p.birth_date.wareki) : '-',
  });
}

/**
 * Renders integrated insurance/public-insurance information card.
 */
export function renderHokenCard(receipt: Receipt): string {
  const h = receipt.hokens;
  const ih = h.iryou_hoken;
  const k = receipt.ryouyou_no_kyuufu;

  if (!ih && h.kouhi_futan_iryous.length === 0) return '';

  const rows: HokenRowViewModel[] = [];
  const detailParts: string[] = [];

  if (ih) {
    const kih = k.iryou_hoken;
    const shikakuParts = [ih.kigou, ih.bangou, ih.edaban].filter((v) => v != null);

    rows.push({
      kubun: '医療保険',
      hokenjaBangou: ih.hokenja_bangou,
      shikakuBangou: shikakuParts.join('・'),
      jitsunissuu: kih ? `${kih.shinryou_jitsunissuu}日` : '',
      tensuu: kih ? `${formatNumber(kih.goukei_tensuu)}点` : '',
      kyuufuTaishouIchibuFutankin:
        kih?.kyuufu_taishou_ichibu_futankin != null
          ? `(${formatNumber(kih.kyuufu_taishou_ichibu_futankin)}円)`
          : '-',
      ichibuFutankin: kih?.ichibu_futankin != null ? `${formatNumber(kih.ichibu_futankin)}円` : '-',
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
      jitsunissuu: rk ? `${rk.shinryou_jitsunissuu}日` : '',
      tensuu: rk ? `${formatNumber(rk.goukei_tensuu)}点` : '',
      kyuufuTaishouIchibuFutankin:
        rk?.kyuufu_taishou_ichibu_futankin != null
          ? `(${formatNumber(rk.kyuufu_taishou_ichibu_futankin)}円)`
          : '-',
      ichibuFutankin: rk?.ichibu_futankin != null ? `${formatNumber(rk.ichibu_futankin)}円` : '-',
    });
  }

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
  const k = receipt.ryouyou_no_kyuufu;
  const ih = k.iryou_hoken;

  const hasIh =
    ih &&
    ((ih.shokuji_seikatsu_ryouyou_kaisuu != null && ih.shokuji_seikatsu_ryouyou_kaisuu > 0) ||
      (ih.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
        ih.shokuji_seikatsu_ryouyou_goukei_kingaku > 0) ||
      ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0);
  const hasKouhi = k.kouhi_futan_iryous.some(
    (rk) =>
      (rk.shokuji_seikatsu_ryouyou_kaisuu != null && rk.shokuji_seikatsu_ryouyou_kaisuu > 0) ||
      (rk.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
        rk.shokuji_seikatsu_ryouyou_goukei_kingaku > 0),
  );

  if (!hasIh && !hasKouhi) return '';

  const rows: Array<{
    kubun: string;
    kaisuu: string;
    goukeiKingaku: string;
    hyoujunFutangaku: string;
  }> = [];

  if (hasIh && ih) {
    rows.push({
      kubun: '医療保険',
      kaisuu:
        ih.shokuji_seikatsu_ryouyou_kaisuu != null
          ? `${formatNumber(ih.shokuji_seikatsu_ryouyou_kaisuu)}回`
          : '',
      goukeiKingaku:
        ih.shokuji_seikatsu_ryouyou_goukei_kingaku != null
          ? `${formatNumber(ih.shokuji_seikatsu_ryouyou_goukei_kingaku)}円`
          : '',
      hyoujunFutangaku:
        ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0
          ? `${formatNumber(ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku)}円`
          : '',
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
      kaisuu:
        rk.shokuji_seikatsu_ryouyou_kaisuu != null
          ? `${formatNumber(rk.shokuji_seikatsu_ryouyou_kaisuu)}回`
          : '',
      goukeiKingaku:
        rk.shokuji_seikatsu_ryouyou_goukei_kingaku != null
          ? `${formatNumber(rk.shokuji_seikatsu_ryouyou_goukei_kingaku)}円`
          : '',
      hyoujunFutangaku:
        rk.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0
          ? `${formatNumber(rk.shokuji_seikatsu_ryouyou_hyoujun_futangaku)}円`
          : '',
    });
  }

  return renderTemplate('data-view/kyuufu-card.eta', { rows });
}
