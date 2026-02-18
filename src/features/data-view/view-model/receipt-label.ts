import { formatWarekiShort } from '../../../domain/tekiyou-utils';
import type { Receipt } from '../../../shared/receiptisan-json-types';

export interface ReceiptLabelViewModel {
  idPart: string;
  shinryouYm: string;
  shinryouYmWestern: string;
  receiptClassLabel: string;
  receiptClassKind: 'nyuuin' | 'gairai' | 'neutral';
  lawCodesLabel: string;
  patientId: string;
  patientName: string;
}

function toLawCode2(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(8, '0').slice(0, 2);
}

function resolveLawCodes(receipt: Receipt): string {
  const hokens = receipt.hokens;
  const candidates: Array<string | null | undefined> = [
    hokens.iryou_hoken?.hokenja_bangou,
    hokens.kouhi_futan_iryous[0]?.futansha_bangou,
    hokens.kouhi_futan_iryous[1]?.futansha_bangou,
    hokens.kouhi_futan_iryous[2]?.futansha_bangou,
    hokens.kouhi_futan_iryous[3]?.futansha_bangou,
  ];
  const codes: string[] = [];
  for (const candidate of candidates) {
    const code = toLawCode2(candidate);
    codes.push(code || '--');
  }
  return codes.join('');
}

/**
 * Builds sidebar/navigation label data for a receipt.
 */
export function buildReceiptLabelViewModel(receipt: Receipt): ReceiptLabelViewModel {
  const patient = receipt.patient;
  const patientId = patient.id?.trim() ? patient.id : '-';
  const patientName = patient.name?.trim() ? patient.name : '-';
  const ageTypeName = receipt.type?.patient_age_type?.name?.trim();
  const receiptClassLabel = ageTypeName && ageTypeName.length > 0 ? ageTypeName : '';
  const receiptClassKind =
    receipt.classification === 'kouhi'
      ? 'neutral'
      : receipt.nyuugai === 'nyuuin'
        ? 'nyuuin'
        : 'gairai';
  const shinryouYmWestern = `${receipt.shinryou_ym.year}.${String(receipt.shinryou_ym.month).padStart(2, '0')}`;

  return {
    idPart: String(receipt.id).padStart(4, '0'),
    shinryouYm: formatWarekiShort(receipt.shinryou_ym.wareki),
    shinryouYmWestern,
    receiptClassLabel,
    receiptClassKind,
    lawCodesLabel: resolveLawCodes(receipt),
    patientId,
    patientName,
  };
}
