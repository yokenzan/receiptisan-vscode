import * as crypto from 'node:crypto';
import type { ReceiptisanJsonOutput } from '../../../shared/receiptisan-json-types';
import { renderTemplate } from '../../../template/eta-renderer';
import type { DataViewTheme } from '../theme';
import { buildDataViewModel } from '../view-model';
import { renderUkeHeader } from './cards';
import { renderReceiptSection } from './receipt-section';
import type { DataViewRenderOptions } from './tekiyou';
import { buildThemeScript } from './theme-script';

/**
 * Renders standalone data view error document.
 */
export function renderDataViewErrorHtml(error: { message: string; stderr?: string }): string {
  return renderTemplate('data-view/error.eta', {
    message: error.message,
    stderr: error.stderr ?? '',
  });
}

/**
 * Renders full data view HTML document with navigation script.
 */
export function renderDataViewDocument(params: {
  nonce: string;
  layoutMode: string;
  navItems: Array<{
    id: string;
    label: {
      idPart: string;
      shinryouYm: string;
      shinryouYmWestern: string;
      receiptClassLabel: string;
      receiptClassKind: 'nyuuin' | 'gairai' | 'neutral';
      lawCodesLabel: string;
      patientId: string;
      patientName: string;
    };
  }>;
  receiptSectionsHtml: string[];
  themeScript: string;
}): string {
  return renderTemplate('data-view/document.eta', params);
}

/**
 * Renders full data view HTML for all parsed receipts.
 */
export function renderDataViewPage(
  data: ReceiptisanJsonOutput,
  layoutMode: 'vertical' | 'horizontal' = 'vertical',
  options: DataViewRenderOptions = {},
  defaultTheme: DataViewTheme = 'auto',
): string {
  const nonce = crypto.randomUUID();
  const viewModel = buildDataViewModel(data, layoutMode);
  const receiptSectionsHtml: string[] = [];

  for (const group of viewModel.receiptGroups) {
    receiptSectionsHtml.push(renderUkeHeader(group.digitalizedReceipt));
    for (const receipt of group.receipts) {
      receiptSectionsHtml.push(renderReceiptSection(receipt, options));
    }
  }

  return renderDataViewDocument({
    nonce,
    layoutMode,
    navItems: viewModel.navItems,
    receiptSectionsHtml,
    themeScript: buildThemeScript(defaultTheme),
  });
}
