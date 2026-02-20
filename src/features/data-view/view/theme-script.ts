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
  const config = JSON.stringify({
    storageKey: 'receiptisan.dataView.theme',
    configuredTheme: defaultTheme,
    themes: THEMES,
    labels: THEME_LABELS,
    names: THEME_NAMES,
  });

  return `(() => {
  var button = document.getElementById('theme-toggle-button');
  if (!button) return;
  var body = document.body;
  var config = ${config};
  var themeClasses = config.themes.map(function(theme) { return 'theme-' + theme; });

  function isKnownTheme(theme) {
    return config.themes.indexOf(theme) >= 0;
  }

  function getNextTheme(theme) {
    var idx = config.themes.indexOf(theme);
    if (idx < 0) return config.themes[0];
    return config.themes[(idx + 1) % config.themes.length];
  }

  function getCurrentThemeFromBody() {
    for (var i = 0; i < config.themes.length; i++) {
      var theme = config.themes[i];
      if (body.classList.contains('theme-' + theme)) return theme;
    }
    return config.themes[0];
  }

  function applyTheme(theme) {
    var normalizedTheme = isKnownTheme(theme) ? theme : config.themes[0];
    body.classList.remove.apply(body.classList, themeClasses);
    body.classList.add('theme-' + normalizedTheme);
    var nextTheme = getNextTheme(normalizedTheme);
    button.textContent = config.labels[normalizedTheme];
    button.setAttribute(
      'aria-label',
      'テーマ切替（現在: ' + config.names[normalizedTheme] + ' / 次: ' + config.names[nextTheme] + '）',
    );
  }

  function getInitialTheme() {
    if (config.configuredTheme !== 'auto' && isKnownTheme(config.configuredTheme)) {
      return config.configuredTheme;
    }

    try {
      var storedTheme = localStorage.getItem(config.storageKey);
      if (isKnownTheme(storedTheme)) return storedTheme;
    } catch (_e) {}

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  applyTheme(getInitialTheme());

  if (config.configuredTheme === 'auto') {
    button.addEventListener('click', function() {
      var nextTheme = getNextTheme(getCurrentThemeFromBody());
      applyTheme(nextTheme);
      try {
        localStorage.setItem(config.storageKey, nextTheme);
      } catch (_e) {}
    });
  } else {
    button.style.display = 'none';
  }
})();`;
}
