import { formatWarekiShort } from '../../../domain/tekiyou-utils';
import type { Receipt } from '../../../shared/receiptisan-json-types';

export interface ReceiptLabelViewModel {
  idPart: string;
  shinryouYm: string;
  nyuugaiLabel: string;
  patientId: string;
  patientName: string;
}

/**
 * Builds sidebar/navigation label data for a receipt.
 */
export function buildReceiptLabelViewModel(receipt: Receipt): ReceiptLabelViewModel {
  const patient = receipt.patient;
  const patientId = patient.id?.trim() ? patient.id : '-';
  const patientName = patient.name?.trim() ? patient.name : '-';
  return {
    idPart: String(receipt.id).padStart(4, '0'),
    shinryouYm: formatWarekiShort(receipt.shinryou_ym.wareki),
    nyuugaiLabel: receipt.nyuugai === 'nyuuin' ? '入院' : '外来',
    patientId,
    patientName,
  };
}
