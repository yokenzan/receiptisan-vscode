import type { ReceiptisanJsonOutput } from '../../../shared/receiptisan-json-types';
import { buildReceiptLabelViewModel } from './receipt-label';
import type {
  DataViewDigitalizedReceiptViewModel,
  DataViewModel,
  DataViewNavItemViewModel,
  DataViewReceiptViewModel,
} from './types';

export function buildDataViewModel(
  data: ReceiptisanJsonOutput,
  layoutMode: 'vertical' | 'horizontal',
): DataViewModel {
  const navItems: DataViewNavItemViewModel[] = [];
  const receiptGroups: DataViewDigitalizedReceiptViewModel[] = [];
  const showCalendar = layoutMode === 'horizontal';
  let index = 0;

  for (const digitalizedReceipt of data) {
    const receipts: DataViewReceiptViewModel[] = [];

    for (const receipt of digitalizedReceipt.receipts) {
      const id = `receipt-${index}`;
      const label = buildReceiptLabelViewModel(receipt);
      navItems.push({ id, label });
      receipts.push({
        id,
        label,
        showCalendar,
        receipt,
      });
      index++;
    }

    receiptGroups.push({ digitalizedReceipt, receipts });
  }

  return { navItems, receiptGroups };
}
