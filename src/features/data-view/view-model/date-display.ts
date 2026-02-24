export interface DateDisplayViewModel {
  year: number;
  month: number;
  day?: number;
  western: string;
  wareki: string;
  westernYear: string;
  westernRest: string;
  warekiYear: string;
}

export function buildDateDisplayViewModel(
  wareki: {
    gengou: { alphabet: string };
    year: number;
    month: number;
    day?: number;
  },
  westernYear: number,
): DateDisplayViewModel {
  const mm = String(wareki.month).padStart(2, '0');
  const dd = wareki.day != null ? `.${String(wareki.day).padStart(2, '0')}` : '';

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
