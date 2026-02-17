import {
  decodeFutanKubun,
  getDailyKaisuu,
  getDaysInMonth,
  toHalfWidthAscii,
} from '../../../domain/tekiyou-utils';
import type { DailyKaisuu } from '../../../shared/receiptisan-json-types';

export const FUTAN_LABELS = ['保', '公1', '公2', '公3', '公4'];

export interface TableCellViewModel {
  className: string;
  text: string;
}

export interface FutanDataCellViewModel {
  className: string;
  active: boolean;
}

const DAY_OF_WEEK_CLASS_MAP: Partial<Record<number, string>> = {
  0: 'cal-sun',
  2: 'cal-tue-thu',
  4: 'cal-tue-thu',
  6: 'cal-sat',
};

/**
 * Returns day of week where 0=Sunday.
 */
function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

/**
 * Returns CSS class string used by calendar cells.
 */
function getCalendarClassName(
  year: number,
  month: number,
  day: number,
  includeMonthStart: boolean,
): string {
  const classes: string[] = ['col-cal'];
  if (includeMonthStart && day === 1) classes.push('cal-month-start');
  const dow = getDayOfWeek(year, month, day);
  const dayOfWeekClass = DAY_OF_WEEK_CLASS_MAP[dow];
  if (dayOfWeekClass) classes.push(dayOfWeekClass);
  if (includeMonthStart && day % 5 === 1 && day > 1) classes.push('cal-5day-border');
  return classes.join(' ');
}

/**
 * Returns CSS class string used by futan cells.
 */
function getFutanClassName(slotActive: boolean, index: number, total: number): string {
  const classes: string[] = ['col-futan'];
  if (!slotActive) classes.push('futan-inactive');
  if (index === 0) classes.push('futan-outer-left');
  if (index === total - 1) classes.push('futan-outer-right');
  return classes.join(' ');
}

/**
 * Formats number with locale separators. Nullish values become empty string.
 */
export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '';
  return n.toLocaleString();
}

/**
 * Normalizes and re-formats numeric tokens in tokutei kizai unit price text.
 */
export function formatTokuteiKizaiUnitPrice(text: string): string {
  const normalized = toHalfWidthAscii(text);
  return normalized.replace(/-?\d[\d,]*/g, (token) => {
    const raw = token.replace(/,/g, '');
    if (!/^-?\d+$/.test(raw)) return token;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value.toLocaleString() : token;
  });
}

/**
 * Builds horizontal calendar header cells for all days of month.
 */
export function buildCalendarHeaderCells(year: number, month: number): TableCellViewModel[] {
  const daysInMonth = getDaysInMonth(year, month);
  const cells: TableCellViewModel[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      className: getCalendarClassName(year, month, day, true),
      text: String(day),
    });
  }
  return cells;
}

/**
 * Builds horizontal calendar data cells.
 */
export function buildCalendarDataCells(
  dailyKaisuus: DailyKaisuu[] | undefined,
  showDailyKaisuu: boolean,
  year: number,
  month: number,
): TableCellViewModel[] {
  const daysInMonth = getDaysInMonth(year, month);
  const cells: TableCellViewModel[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const count = showDailyKaisuu ? getDailyKaisuu(dailyKaisuus, year, month, day) : 0;
    cells.push({
      className: getCalendarClassName(year, month, day, true),
      text: count > 0 ? String(count) : '',
    });
  }
  return cells;
}

/**
 * Builds compact calendar header cells for active days only.
 */
export function buildCompactCalendarHeaderCells(
  activeDays: number[],
  year: number,
  month: number,
): TableCellViewModel[] {
  return activeDays.map((day) => ({
    className: getCalendarClassName(year, month, day, false),
    text: String(day),
  }));
}

/**
 * Builds compact calendar data cells and pads up to minimum columns.
 */
export function buildCompactCalendarDataCells(
  dailyKaisuus: DailyKaisuu[] | undefined,
  showDailyKaisuu: boolean,
  activeDays: number[],
  minCols: number,
  year: number,
  month: number,
): TableCellViewModel[] {
  const cells = activeDays.map((day) => {
    const count = showDailyKaisuu ? getDailyKaisuu(dailyKaisuus, year, month, day) : 0;
    return {
      className: getCalendarClassName(year, month, day, false),
      text: count > 0 ? String(count) : '',
    };
  });
  for (let i = activeDays.length; i < minCols; i++) {
    cells.push({ className: 'col-cal', text: '' });
  }
  return cells;
}

/**
 * Builds header cells for futan slot columns.
 */
export function buildFutanHeaderCells(futanSlots: boolean[]): TableCellViewModel[] {
  return futanSlots.map((slotActive, index) => ({
    className: getFutanClassName(slotActive, index, futanSlots.length),
    text: FUTAN_LABELS[index],
  }));
}

/**
 * Builds data cells for futan slot marks.
 */
export function buildFutanDataCells(
  futanKubun: string,
  showFutanKubun: boolean,
  futanSlots: boolean[],
): FutanDataCellViewModel[] {
  const decoded = showFutanKubun ? decodeFutanKubun(futanKubun) : [];
  return futanSlots.map((slotActive, index) => ({
    className: getFutanClassName(slotActive, index, futanSlots.length),
    active: showFutanKubun && decoded[index] === true,
  }));
}
