import { renderTemplate } from '../../../template/eta-renderer';

/**
 * Renders a generic error page shown in webview panels.
 */
export function renderErrorPage(title: string, message: string, detail?: string): string {
  return renderTemplate('error-page.eta', {
    title,
    message,
    detail: detail ?? '',
  });
}
