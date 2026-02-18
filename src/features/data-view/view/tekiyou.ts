import { getDaysInMonth } from '../../../domain/tekiyou-utils';
import { resolveSeparatorClass } from '../../../domain/tekiyou/row-policy';
import { findLastNonCommentIndex } from '../../../domain/tekiyou/row-utils';
import type {
  CommentItem,
  DailyKaisuu,
  IyakuhinItem,
  Receipt,
  ShinryouKouiItem,
  TekiyouItem,
  TokuteiKizaiItem,
} from '../../../shared/receiptisan-json-types';
import { renderTemplate } from '../../../template/eta-renderer';
import {
  buildCalendarDataCells,
  buildCalendarHeaderCells,
  buildFutanDataCells,
  buildFutanHeaderCells,
  formatNumber,
  formatSanteiDays,
  formatTokuteiKizaiUnitPrice,
} from './tekiyou-table';
import { splitParentheticalSegments } from './tekiyou-text';

interface TekiyouLayout {
  mode: 'horizontal' | 'compact';
  year: number;
  month: number;
  futanSlots: boolean[];
  normalizeAscii: boolean;
}

/**
 * Rendering options for tekiyou card.
 */
export interface DataViewRenderOptions {
  normalizeTekiyouAscii?: boolean;
}

/**
 * Returns CSS class by item category.
 */
function getCategoryColorClass(type: TekiyouItem['type']): string {
  switch (type) {
    case 'shinryou_koui':
      return 'item-si';
    case 'iyakuhin':
      return 'item-iy';
    case 'tokutei_kizai':
      return 'item-to';
    case 'comment':
      return 'item-co';
    default:
      return '';
  }
}

/**
 * Renders full tekiyou card table for one receipt.
 */
export function renderTekiyouCard(
  receipt: Receipt,
  showCalendar: boolean,
  options: DataViewRenderOptions,
): string {
  const sections = receipt.tekiyou.shinryou_shikibetsu_sections;
  if (sections.length === 0) return '';

  const year = receipt.shinryou_ym.year;
  const month = receipt.shinryou_ym.month;
  const futanSlots: boolean[] = [
    receipt.hokens.iryou_hoken != null,
    receipt.hokens.kouhi_futan_iryous.length >= 1,
    receipt.hokens.kouhi_futan_iryous.length >= 2,
    receipt.hokens.kouhi_futan_iryous.length >= 3,
    receipt.hokens.kouhi_futan_iryous.length >= 4,
  ];

  const layout: TekiyouLayout = showCalendar
    ? {
        mode: 'horizontal',
        year,
        month,
        futanSlots,
        normalizeAscii: options.normalizeTekiyouAscii ?? false,
      }
    : {
        mode: 'compact',
        year,
        month,
        futanSlots,
        normalizeAscii: options.normalizeTekiyouAscii ?? false,
      };

  const rows: string[] = [];
  let prevShinkuUpper = '';

  for (const section of sections) {
    const shinkuCode = String(section.shinryou_shikibetsu.code);
    const shinkuUpper = shinkuCode.length > 0 ? shinkuCode[0] : '';
    let isFirstIchirenInSection = true;

    for (const ichiren of section.ichiren_units) {
      let isFirstSanteiInIchiren = true;
      let isFirstItemInIchiren = true;

      for (const santei of ichiren.santei_units) {
        let isFirstItemInSantei = true;
        const lastNonCommentIdx = findLastNonCommentIndex(santei.items);

        for (let itemIdx = 0; itemIdx < santei.items.length; itemIdx++) {
          const item = santei.items[itemIdx];
          const separatorClass = resolveSeparatorClass({
            isFirstIchirenInSection,
            isFirstSanteiInIchiren,
            isFirstItemInSantei,
            shinkuUpper,
            prevShinkuUpper,
            hasRenderedRows: rows.length > 0,
          });

          const showShinku = isFirstIchirenInSection && isFirstItemInSantei;
          const isLastNonComment = itemIdx === lastNonCommentIdx;
          const lastDailyIndex =
            lastNonCommentIdx >= 0 ? lastNonCommentIdx : santei.items.length - 1;
          const showSanteiDaily = itemIdx === lastDailyIndex;

          rows.push(
            renderTekiyouRow(
              item,
              separatorClass,
              showShinku ? shinkuCode : '',
              isFirstItemInSantei,
              isLastNonComment,
              showSanteiDaily,
              santei.tensuu,
              santei.kaisuu,
              santei.daily_kaisuus,
              layout,
              ichiren.futan_kubun,
              isFirstItemInIchiren,
            ),
          );

          if (isFirstItemInSantei) isFirstItemInSantei = false;
          if (isFirstSanteiInIchiren) isFirstSanteiInIchiren = false;
          if (isFirstIchirenInSection) isFirstIchirenInSection = false;
          if (isFirstItemInIchiren) isFirstItemInIchiren = false;
        }
      }
    }

    prevShinkuUpper = shinkuUpper;
  }

  const COL_W_H = {
    code: 66,
    shinku: 29,
    futan: 20,
    mark: 18,
    name: 290,
    tensuu: 68,
    timesSign: 14,
    kaisuu: 36,
    cal: 20,
  };
  const COL_W_C = {
    shinku: 29,
    futanCode: 24,
    mark: 18,
    name: 290,
    tensuu: 68,
    timesSign: 14,
    kaisuu: 36,
    santeiDays: 180,
  };

  if (layout.mode === 'horizontal') {
    const daysInMonth = getDaysInMonth(year, month);
    const futanWidth = 5 * COL_W_H.futan;
    const baseWidth =
      COL_W_H.code +
      COL_W_H.shinku +
      futanWidth +
      COL_W_H.mark +
      COL_W_H.name +
      COL_W_H.tensuu +
      COL_W_H.timesSign +
      COL_W_H.kaisuu;
    const tableWidth = baseWidth + daysInMonth * COL_W_H.cal;

    return renderTemplate('data-view/tekiyou-card-horizontal.eta', {
      tableWidth,
      futanColCount: 5,
      calendarColCount: daysInMonth,
      futanHeaderCells: buildFutanHeaderCells(futanSlots),
      calendarHeaderCells: buildCalendarHeaderCells(year, month),
      rowsHtml: rows,
    });
  }

  const baseWidth =
    COL_W_C.shinku +
    COL_W_C.futanCode +
    COL_W_C.mark +
    COL_W_C.name +
    COL_W_C.tensuu +
    COL_W_C.timesSign +
    COL_W_C.kaisuu +
    COL_W_C.santeiDays;
  const tableWidth = baseWidth;

  return renderTemplate('data-view/tekiyou-card-compact.eta', {
    tableWidth,
    rowsHtml: rows,
  });
}

/**
 * Renders one table row for a tekiyou item.
 */
function renderTekiyouRow(
  item: TekiyouItem,
  separatorClass: string,
  shinkuCode: string,
  isFirstInSantei: boolean,
  isLastNonComment: boolean,
  showSanteiDaily: boolean,
  santeiTensuu: number,
  santeiKaisuu: number,
  dailyKaisuus: DailyKaisuu[] | undefined,
  layout: TekiyouLayout,
  futanKubun: string,
  showFutanKubun: boolean,
): string {
  const rowClass = separatorClass;
  const categoryClass = getCategoryColorClass(item.type);

  if (item.type === 'comment') {
    return renderCommentRow(
      item,
      rowClass,
      shinkuCode,
      isFirstInSantei,
      categoryClass,
      dailyKaisuus,
      isLastNonComment,
      showSanteiDaily,
      layout,
      futanKubun,
      showFutanKubun,
    );
  }

  return renderMedicalRow(
    item,
    rowClass,
    shinkuCode,
    isFirstInSantei,
    categoryClass,
    santeiTensuu,
    santeiKaisuu,
    isLastNonComment,
    showSanteiDaily,
    dailyKaisuus,
    layout,
    futanKubun,
    showFutanKubun,
  );
}

/**
 * Renders a medical (non-comment) row.
 */
function renderMedicalRow(
  item: ShinryouKouiItem | IyakuhinItem | TokuteiKizaiItem,
  rowClass: string,
  shinkuCode: string,
  isFirstInSantei: boolean,
  categoryClass: string,
  santeiTensuu: number,
  santeiKaisuu: number,
  isLastNonComment: boolean,
  showSanteiDaily: boolean,
  dailyKaisuus: DailyKaisuu[] | undefined,
  layout: TekiyouLayout,
  futanKubun: string,
  showFutanKubun: boolean,
): string {
  const code = item.master.code;
  const name =
    item.text.product_name && item.text.product_name !== item.text.master_name
      ? item.text.product_name
      : item.text.master_name;
  const nameSegments = splitParentheticalSegments(name, layout.normalizeAscii);

  const isUnknown = item.text.master_name.startsWith('【不明な');
  const unknownClass = isUnknown ? ' item-unknown' : '';

  const detailParts: string[] = [];
  if (item.text.shiyouryou) detailParts.push(item.text.shiyouryou);
  if (item.text.unit_price) {
    detailParts.push(
      item.type === 'tokutei_kizai'
        ? formatTokuteiKizaiUnitPrice(item.text.unit_price)
        : item.text.unit_price,
    );
  }
  const detailSegments = detailParts.map((part) =>
    splitParentheticalSegments(part, layout.normalizeAscii),
  );

  const tensuuDisplay = isLastNonComment && santeiTensuu > 0 ? formatNumber(santeiTensuu) : '';
  const timesSignDisplay = isLastNonComment && santeiTensuu > 0 ? 'x' : '';
  const kaisuuDisplay = isLastNonComment && santeiTensuu > 0 ? String(santeiKaisuu) : '';

  const calendarCells =
    layout.mode === 'horizontal'
      ? buildCalendarDataCells(dailyKaisuus, showSanteiDaily, layout.year, layout.month)
      : [];
  const santeiDaysDisplay =
    layout.mode === 'compact' && showSanteiDaily
      ? formatSanteiDays(dailyKaisuus, layout.year, layout.month)
      : '';

  if (layout.mode === 'compact') {
    return renderTemplate('data-view/tekiyou-row-compact.eta', {
      rowClass,
      shinkuCode,
      futanCodeDisplay: showFutanKubun ? futanKubun : '',
      isFirstInSantei,
      categoryClass,
      unknownClass,
      nameSegments,
      detailSegments,
      tensuuDisplay,
      timesSignDisplay,
      kaisuuDisplay,
      santeiDaysDisplay,
    });
  }

  return renderTemplate('data-view/tekiyou-row-horizontal.eta', {
    rowClass,
    code,
    shinkuCode,
    futanCells: buildFutanDataCells(futanKubun, showFutanKubun, layout.futanSlots),
    isFirstInSantei,
    categoryClass,
    unknownClass,
    nameSegments,
    detailSegments,
    tensuuDisplay,
    timesSignDisplay,
    kaisuuDisplay,
    calendarCells,
  });
}

/**
 * Renders a comment row.
 */
function renderCommentRow(
  item: CommentItem,
  rowClass: string,
  shinkuCode: string,
  isFirstInSantei: boolean,
  categoryClass: string,
  dailyKaisuus: DailyKaisuu[] | undefined,
  isLastNonComment: boolean,
  showSanteiDaily: boolean,
  layout: TekiyouLayout,
  futanKubun: string,
  showFutanKubun: boolean,
): string {
  const code = item.master.code;
  const text =
    typeof item.text === 'string'
      ? item.text
      : ((item.text as { master_name?: string }).master_name ?? '');
  const textSegments = splitParentheticalSegments(text, layout.normalizeAscii);

  const calendarCells =
    layout.mode === 'horizontal'
      ? buildCalendarDataCells(dailyKaisuus, showSanteiDaily, layout.year, layout.month)
      : [];
  const santeiDaysDisplay =
    layout.mode === 'compact' && showSanteiDaily
      ? formatSanteiDays(dailyKaisuus, layout.year, layout.month)
      : '';

  if (layout.mode === 'compact') {
    return renderTemplate('data-view/tekiyou-row-compact.eta', {
      rowClass,
      shinkuCode,
      futanCodeDisplay: showFutanKubun ? futanKubun : '',
      isFirstInSantei,
      categoryClass,
      unknownClass: '',
      nameSegments: textSegments,
      detailSegments: [],
      tensuuDisplay: '',
      timesSignDisplay: '',
      kaisuuDisplay: '',
      santeiDaysDisplay,
    });
  }

  return renderTemplate('data-view/tekiyou-row-horizontal.eta', {
    rowClass,
    code,
    shinkuCode,
    futanCells: buildFutanDataCells(futanKubun, showFutanKubun, layout.futanSlots),
    isFirstInSantei,
    categoryClass,
    unknownClass: '',
    nameSegments: textSegments,
    detailSegments: [],
    tensuuDisplay: '',
    timesSignDisplay: '',
    kaisuuDisplay: '',
    calendarCells,
  });
}
