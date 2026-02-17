import { toHalfWidthAscii } from '../../../domain/tekiyou-utils';

export interface StyledTextSegment {
  text: string;
  inParen: boolean;
}

/**
 * Splits text into normal/parenthetical segments.
 * Escaping is delegated to templates.
 */
export function splitParentheticalSegments(
  text: string,
  normalizeAscii: boolean,
): StyledTextSegment[] {
  const source = normalizeAscii ? toHalfWidthAscii(text) : text;
  const chunks: StyledTextSegment[] = [];
  let normal = '';
  let paren = '';
  let depth = 0;

  const flushNormal = (): void => {
    if (normal.length > 0) {
      chunks.push({ text: normal, inParen: false });
      normal = '';
    }
  };

  const flushParen = (inParen: boolean): void => {
    if (paren.length > 0) {
      chunks.push({ text: paren, inParen });
      paren = '';
    }
  };

  for (const ch of source) {
    const isOpen = ch === '(' || ch === '（';
    const isClose = ch === ')' || ch === '）';

    if (depth === 0) {
      if (isOpen) {
        flushNormal();
        paren += ch;
        depth = 1;
      } else {
        normal += ch;
      }
      continue;
    }

    paren += ch;
    if (isOpen) depth++;
    if (isClose) depth--;

    if (depth === 0) flushParen(true);
  }

  if (depth > 0) {
    normal += paren;
  }
  flushNormal();

  return chunks;
}
