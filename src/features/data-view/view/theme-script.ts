import { renderTemplate } from '../../../template/eta-renderer';
import type { DataViewTheme } from '../theme';

const THEMES = ['light', 'dark', 'original', 'classic', 'classic-modern'] as const;

type UiTheme = (typeof THEMES)[number];

const THEME_LABELS: Record<UiTheme, string> = {
  light: 'L',
  dark: 'D',
  original: 'O',
  classic: 'C',
  'classic-modern': 'CM',
};

const THEME_NAMES: Record<UiTheme, string> = {
  light: 'ライト',
  dark: 'ダーク',
  original: 'オリジナル',
  classic: 'クラシック',
  'classic-modern': 'クラシック(モダン)',
};

/**
 * Builds client-side theme controller script for data-view.
 */
export function buildThemeScript(defaultTheme: DataViewTheme): string {
  const configJson = JSON.stringify({
    storageKey: 'receiptisan.dataView.theme',
    configuredTheme: defaultTheme,
    themes: THEMES,
    labels: THEME_LABELS,
    names: THEME_NAMES,
  });

  return renderTemplate('data-view/theme-controller.js.eta', { configJson });
}
