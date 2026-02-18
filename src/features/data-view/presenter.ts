import type { CliError } from '../../cli/receiptisan-client';
import type { ReceiptisanJsonOutput } from '../../shared/receiptisan-json-types';
import { renderDataViewErrorHtml, renderDataViewPage } from './view/page';

export type LayoutMode = 'vertical' | 'horizontal';

/**
 * Builds data-view HTML from parsed CLI JSON output.
 */
export function presentDataView(
  data: ReceiptisanJsonOutput,
  layoutMode: LayoutMode,
  normalizeTekiyouAscii: boolean,
): string {
  return renderDataViewPage(data, layoutMode, { normalizeTekiyouAscii });
}

/**
 * Builds data-view error HTML.
 */
export function presentDataViewError(error: CliError): string {
  return renderDataViewErrorHtml(error);
}
