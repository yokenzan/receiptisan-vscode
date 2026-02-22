import type { DailyKaisuu, ShinryouShikibetsuSection } from '../shared/receiptisan-json-types';

const FUTAN_KUBUN_MAP: Record<string, number> = {
  // 1者
  '1': 0b10000,
  '5': 0b01000,
  '6': 0b00100,
  B: 0b00010,
  C: 0b00001,
  // 2者
  '2': 0b11000,
  '3': 0b10100,
  E: 0b10010,
  G: 0b10001,
  '7': 0b01100,
  H: 0b01010,
  I: 0b01001,
  J: 0b00110,
  K: 0b00101,
  L: 0b00011,
  // 3者
  '4': 0b11100,
  M: 0b11010,
  N: 0b11001,
  O: 0b10110,
  P: 0b10101,
  Q: 0b10011,
  R: 0b01110,
  S: 0b01101,
  T: 0b01011,
  U: 0b00111,
  // 4者
  V: 0b11110,
  W: 0b11101,
  X: 0b11011,
  Y: 0b10111,
  Z: 0b01111,
  // 5者
  '9': 0b11111,
};

const FUTAN_SLOT_BITS = [0b10000, 0b01000, 0b00100, 0b00010, 0b00001];

/**
 * Decodes futan kubun code into slot activation flags.
 */
export function decodeFutanKubun(code: string): boolean[] {
  const bits = FUTAN_KUBUN_MAP[code] ?? 0;
  return FUTAN_SLOT_BITS.map((mask) => (bits & mask) !== 0);
}

/**
 * Converts full-width ASCII-like characters to half-width.
 */
export function toHalfWidthAscii(text: string): string {
  return text
    .replace(/\u3000/g, ' ')
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

/**
 * Formats wareki object into short compact string.
 */
export function formatWarekiShort(wareki: {
  gengou: { alphabet: string; base_year?: number };
  year: number;
  month: number;
  day?: number;
}): string {
  const westernYear =
    typeof wareki.gengou.base_year === 'number' ? wareki.gengou.base_year + wareki.year - 1 : null;
  const yy = String(wareki.year).padStart(2, '0');
  const mm = String(wareki.month).padStart(2, '0');
  const yearPart =
    westernYear == null
      ? `${wareki.gengou.alphabet}${yy}`
      : `${westernYear}(${wareki.gengou.alphabet}${yy})`;
  const base = `${yearPart}.${mm}`;
  return wareki.day != null ? `${base}.${String(wareki.day).padStart(2, '0')}` : base;
}

/**
 * Returns number of days in given year/month.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Looks up daily kaisuu for specified date.
 */
export function getDailyKaisuu(
  dailyKaisuus: DailyKaisuu[] | undefined,
  year: number,
  month: number,
  day: number,
): number {
  if (!dailyKaisuus) return 0;
  const entry = dailyKaisuus.find(
    (dk) => dk.date.year === year && dk.date.month === month && dk.date.day === day,
  );
  return entry?.kaisuu ?? 0;
}

/**
 * Collects and sorts days that have at least one non-zero daily kaisuu.
 */
export function collectActiveDays(sections: ShinryouShikibetsuSection[]): number[] {
  const days = new Set<number>();
  for (const section of sections) {
    for (const ichiren of section.ichiren_units) {
      for (const santei of ichiren.santei_units) {
        for (const dk of santei.daily_kaisuus ?? []) {
          if (dk.kaisuu > 0) days.add(dk.date.day);
        }
      }
    }
  }
  return Array.from(days).sort((a, b) => a - b);
}
