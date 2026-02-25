import type { CliError } from '../../cli/receiptisan-client';
import type { ReceiptisanJsonOutput } from '../../shared/receiptisan-json-types';
import type { DataViewTheme } from './theme';
import type { DataViewRenderOptions } from './view/tekiyou';
import { renderDataViewErrorHtml, renderDataViewPage } from './view/page';

export type LayoutMode = 'vertical' | 'horizontal';

/**
 * Builds data-view HTML from parsed CLI JSON output.
 */
export function presentDataView(
  data: ReceiptisanJsonOutput,
  layoutMode: LayoutMode,
  options: DataViewRenderOptions,
  defaultTheme: DataViewTheme,
): string {
  return renderDataViewPage(data, layoutMode, options, defaultTheme);
}

/**
 * Builds data-view error HTML.
 */
export function presentDataViewError(error: CliError): string {
  return renderDataViewErrorHtml(error);
}
