import { renderTemplate } from '../../../template/eta-renderer';
import type { DataViewReceiptViewModel } from '../view-model';
import {
  renderHokenCard,
  renderKyuufuCard,
  renderPatientCard,
  renderReceiptHeader,
  renderShoubyoumeiCard,
} from './cards';
import { type DataViewRenderOptions, renderTekiyouCard } from './tekiyou';

/**
 * Renders one receipt section including summary cards and tekiyou table.
 */
export function renderReceiptSection(
  receiptViewModel: DataViewReceiptViewModel,
  options: DataViewRenderOptions,
): string {
  const receipt = receiptViewModel.receipt;

  return renderTemplate('data-view/receipt-section.eta', {
    id: receiptViewModel.id,
    headerLabel: receiptViewModel.label,
    receiptHeaderHtml: renderReceiptHeader(receipt),
    patientCardHtml: renderPatientCard(receipt),
    hokenCardHtml: renderHokenCard(receipt),
    kyuufuCardHtml: renderKyuufuCard(receipt),
    shoubyoumeiCardHtml: renderShoubyoumeiCard(receipt.shoubyoumeis),
    tekiyouCardHtml: renderTekiyouCard(receipt, receiptViewModel.showCalendar, options),
  });
}
