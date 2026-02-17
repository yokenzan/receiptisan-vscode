import * as crypto from 'node:crypto';
import { renderTemplate } from '../../../template/eta-renderer';

/**
 * Wraps CLI-generated preview body with extension template HTML.
 */
export function buildPreviewHtml(cliHtml: string, nonce = crypto.randomUUID()): string {
  return renderTemplate('preview-page.eta', { cliHtml, nonce });
}
