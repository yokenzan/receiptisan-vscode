import type { TekiyouItem } from '../../shared/receiptisan-json-types';

/**
 * Returns the index of the last non-comment item.
 */
export function findLastNonCommentIndex(items: TekiyouItem[]): number {
  return items.reduce((lastIdx, item, idx) => (item.type !== 'comment' ? idx : lastIdx), -1);
}
