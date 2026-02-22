import { renderTemplate } from '../../../template/eta-renderer';
import {
  DATA_VIEW_THEME_LABELS,
  DATA_VIEW_THEME_NAMES,
  DATA_VIEW_UI_THEMES,
  type DataViewTheme,
} from '../theme';

/**
 * Builds client-side theme controller script for data-view.
 */
export function buildThemeScript(defaultTheme: DataViewTheme): string {
  const configJson = JSON.stringify({
    storageKey: 'receiptisan.dataView.theme',
    configuredTheme: defaultTheme,
    themes: DATA_VIEW_UI_THEMES,
    labels: DATA_VIEW_THEME_LABELS,
    names: DATA_VIEW_THEME_NAMES,
  });

  return renderTemplate('data-view/theme-controller.js.eta', { configJson });
}
