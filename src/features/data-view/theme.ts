export const DATA_VIEW_UI_THEMES = [
  'light',
  'dark',
  'original',
  'classic',
  'classic-modern',
] as const;

export type DataViewUiTheme = (typeof DATA_VIEW_UI_THEMES)[number];

export const DATA_VIEW_THEMES = ['auto', ...DATA_VIEW_UI_THEMES] as const;

export type DataViewTheme = (typeof DATA_VIEW_THEMES)[number];

export const DATA_VIEW_THEME_LABELS: Record<DataViewUiTheme, string> = {
  light: 'L',
  dark: 'D',
  original: 'O',
  classic: 'C',
  'classic-modern': 'CM',
};

export const DATA_VIEW_THEME_NAMES: Record<DataViewUiTheme, string> = {
  light: 'ライト',
  dark: 'ダーク',
  original: 'オリジナル',
  classic: 'クラシック',
  'classic-modern': 'クラシック(モダン)',
};
