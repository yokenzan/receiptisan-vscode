export interface SeparatorPolicyInput {
  isFirstIchirenInSection: boolean;
  isFirstSanteiInIchiren: boolean;
  isFirstItemInSantei: boolean;
  shinkuUpper: string;
  prevShinkuUpper: string;
  hasRenderedRows: boolean;
}

export type SeparatorClass = '' | 'row-upper-shinku' | 'row-next-shinku' | 'row-new-santei';

/**
 * Determines separator class by tekiyou row context.
 */
export function resolveSeparatorClass(input: SeparatorPolicyInput): SeparatorClass {
  if (input.isFirstIchirenInSection) {
    if (input.shinkuUpper !== input.prevShinkuUpper && input.prevShinkuUpper !== '') {
      return 'row-upper-shinku';
    }
    if (input.hasRenderedRows) {
      return 'row-next-shinku';
    }
    return '';
  }

  if (input.isFirstSanteiInIchiren && !input.isFirstIchirenInSection) {
    return 'row-next-shinku';
  }

  if (input.isFirstItemInSantei && !input.isFirstSanteiInIchiren) {
    return 'row-new-santei';
  }

  return '';
}
