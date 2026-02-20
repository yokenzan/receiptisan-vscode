export const DATA_VIEW_THEMES = [
  'auto',
  'light',
  'dark',
  'original',
  'classic',
  'classic-modern',
] as const;

export type DataViewTheme = (typeof DATA_VIEW_THEMES)[number];
