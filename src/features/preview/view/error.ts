import { renderTemplate } from '../../../template/eta-renderer';

/**
 * Renders a generic error page shown in webview panels.
 */
export function renderErrorPage(title: string, message: string, detail?: string): string {
  try {
    return renderTemplate('error-page.eta', {
      title,
      message,
      detail: detail ?? '',
    });
  } catch {
    const msg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `<!DOCTYPE html><html lang="ja"><body><h1>エラー</h1><p>${msg}</p></body></html>`;
  }
}
