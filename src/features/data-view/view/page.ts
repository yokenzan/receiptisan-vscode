import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ReceiptisanJsonOutput } from '../../../shared/receiptisan-json-types';
import { renderTemplate } from '../../../template/eta-renderer';
import { buildDataViewModel } from '../view-model';
import { renderUkeHeader } from './cards';
import { renderReceiptSection } from './receipt-section';
import type { DataViewRenderOptions } from './tekiyou';

const cssContent = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'views', 'styles', 'data-view.css'),
  'utf-8',
);

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
  cssContent: string;
  layoutMode: string;
  navItems: Array<{
    id: string;
    label: {
      idPart: string;
      shinryouYm: string;
      nyuugaiLabel: string;
      patientId: string;
      patientName: string;
    };
  }>;
  receiptSectionsHtml: string[];
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
    cssContent,
    layoutMode,
    navItems: viewModel.navItems,
    receiptSectionsHtml,
  });
}
