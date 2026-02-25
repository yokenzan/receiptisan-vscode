import { renderTemplate } from '../../../template/eta-renderer';
import type { DataViewReceiptViewModel } from '../view-model';
import {
  renderHokenCard,
  renderHokenKyuufuCardHorizontal,
  renderKyuufuCard,
  renderPatientCard,
  renderPatientReceiptCardHorizontal,
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
  const isHorizontal = receiptViewModel.showCalendar;

  return renderTemplate('data-view/receipt-section.eta', {
    id: receiptViewModel.id,
    headerLabel: receiptViewModel.label,
    receiptHeaderHtml: isHorizontal ? '' : renderReceiptHeader(receipt),
    patientCardHtml: isHorizontal
      ? renderPatientReceiptCardHorizontal(receipt)
      : renderPatientCard(receipt),
    hokenCardHtml: isHorizontal
      ? renderHokenKyuufuCardHorizontal(receipt, options)
      : renderHokenCard(receipt, options),
    kyuufuCardHtml: isHorizontal ? '' : renderKyuufuCard(receipt, options),
    shoubyoumeiCardHtml: renderShoubyoumeiCard(receipt.shoubyoumeis),
    tekiyouCardHtml: renderTekiyouCard(receipt, receiptViewModel.showCalendar, options),
  });
}
