import type { DigitalizedReceipt, Receipt } from '../../../shared/receiptisan-json-types';
import type { ReceiptLabelViewModel } from './receipt-label';

export interface DataViewNavItemViewModel {
  id: string;
  label: ReceiptLabelViewModel;
}

export interface DataViewReceiptViewModel {
  id: string;
  label: ReceiptLabelViewModel;
  showCalendar: boolean;
  receipt: Receipt;
}

export interface DataViewDigitalizedReceiptViewModel {
  digitalizedReceipt: DigitalizedReceipt;
  receipts: DataViewReceiptViewModel[];
}

export interface DataViewModel {
  navItems: DataViewNavItemViewModel[];
  receiptGroups: DataViewDigitalizedReceiptViewModel[];
}
