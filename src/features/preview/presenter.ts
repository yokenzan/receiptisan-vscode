import { renderErrorPage } from './view/error';
import { buildPreviewHtml } from './view/page';

/**
 * Builds preview panel HTML from CLI SVG output.
 */
export function presentPreviewSvg(svgHtml: string): string {
  return buildPreviewHtml(svgHtml);
}

/**
 * Builds generic preview error HTML and message text.
 */
export function presentPreviewError(error: unknown): { html: string; message: string } {
  const message =
    error instanceof Error
      ? error.message
      : ((error as { message?: string }).message ?? String(error));
  return {
    html: renderErrorPage('プレビューエラー', message),
    message,
  };
}
