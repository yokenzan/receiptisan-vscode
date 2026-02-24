import type { WarekiDate, WarekiYearMonth } from '../../../shared/receiptisan-json-types';

interface DateDisplayBaseViewModel {
  year: number;
  month: number;
  western: string;
  wareki: string;
  westernYear: string;
  westernRest: string;
  warekiYear: string;
}

/**
 * Display model for year-month values (e.g. 2024.07).
 */
export interface YearMonthDisplayViewModel extends DateDisplayBaseViewModel {}

/**
 * Display model for year-month-day values (e.g. 2024.07.01).
 */
export interface YearMonthDayDisplayViewModel extends DateDisplayBaseViewModel {
  day: number;
}

/**
 * Builds a display model for dates that only have year and month.
 */
export function buildYearMonthDisplayViewModel(
  wareki: WarekiYearMonth,
  westernYear: number,
): YearMonthDisplayViewModel {
  const mm = String(wareki.month).padStart(2, '0');

  return {
    year: westernYear,
    month: wareki.month,
    western: `${westernYear}.${mm}`,
    wareki: `${wareki.gengou.alphabet}${String(wareki.year).padStart(2, '0')}.${mm}`,
    westernYear: String(westernYear),
    westernRest: `.${mm}`,
    warekiYear: `${wareki.gengou.alphabet}${String(wareki.year).padStart(2, '0')}`,
  };
}

/**
 * Builds a display model for dates that include day.
 */
export function buildYearMonthDayDisplayViewModel(
  wareki: WarekiDate,
  westernYear: number,
): YearMonthDayDisplayViewModel {
  const mm = String(wareki.month).padStart(2, '0');
  const dd = `.${String(wareki.day).padStart(2, '0')}`;

  return {
    year: westernYear,
    month: wareki.month,
    day: wareki.day,
    western: `${westernYear}.${mm}${dd}`,
    wareki: `${wareki.gengou.alphabet}${String(wareki.year).padStart(2, '0')}.${mm}${dd}`,
    westernYear: String(westernYear),
    westernRest: `.${mm}${dd}`,
    warekiYear: `${wareki.gengou.alphabet}${String(wareki.year).padStart(2, '0')}`,
  };
}
