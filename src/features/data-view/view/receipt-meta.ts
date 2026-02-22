/**
 * Returns CSS class name for tenki tag color by tenki code.
 */
export function getTenkiColorClass(code: number | string): string {
  const c = Number(code);
  if (c >= 1 && c <= 4) return `tag-tenki-${c}`;
  return 'tag-tenki';
}
