import { executeWithProgress } from '../../cli/receiptisan-client';
import { presentPreviewSvg } from './presenter';

/**
 * Generates preview panel HTML for one UKE file.
 */
export async function generatePreviewHtml(filePath: string): Promise<string> {
  const result = await executeWithProgress(filePath, 'svg');
  return presentPreviewSvg(result.stdout);
}
