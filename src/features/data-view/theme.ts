export const DATA_VIEW_UI_THEMES = [
  'light',
  'dark',
  'original',
  'classic',
  'sakura',
  'gruvbox-dark',
  'gruvbox-light',
  'ayu',
  'solarized-dark',
  'solarized-light',
  'molokai',
  'dracula',
  'material-palenight',
  'highcontrast-light',
  'highcontrast-dark',
] as const;

export type DataViewUiTheme = (typeof DATA_VIEW_UI_THEMES)[number];

export const DATA_VIEW_THEMES = ['auto', ...DATA_VIEW_UI_THEMES] as const;

export type DataViewTheme = (typeof DATA_VIEW_THEMES)[number];

export const DATA_VIEW_THEME_NAMES: Record<DataViewUiTheme, string> = {
  light: 'Light',
  dark: 'Dark',
  original: 'Original',
  classic: 'Classic',
  sakura: 'Sakura',
  'gruvbox-dark': 'Gruvbox Dark',
  'gruvbox-light': 'Gruvbox Light',
  ayu: 'Ayu',
  'solarized-dark': 'Solarized Dark',
  'solarized-light': 'Solarized Light',
  molokai: 'Molokai',
  dracula: 'Dracula',
  'material-palenight': 'Material Palenight',
  'highcontrast-light': 'High Contrast Light',
  'highcontrast-dark': 'High Contrast Dark',
};
