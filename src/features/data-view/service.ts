import * as vscode from 'vscode';
import { type CliError, type CliResult, executeWithProgress } from '../../cli/receiptisan-client';
import type { ReceiptisanJsonOutput } from '../../shared/receiptisan-json-types';
import { type LayoutMode, presentDataView } from './presenter';
import type { DataViewTheme } from './theme';

/**
 * Generates data-view HTML for one UKE file.
 */
export async function generateDataViewHtml(
  filePath: string,
  layoutMode: LayoutMode,
): Promise<string> {
  let result: CliResult | undefined;

  try {
    result = await executeWithProgress(filePath, 'json');
    const data: ReceiptisanJsonOutput = JSON.parse(result.stdout);
    const config = vscode.workspace.getConfiguration('receiptisan');
    const normalizeTekiyouAscii = config.get<boolean>('dataView.normalizeTekiyouAscii', false);
    const theme = config.get<DataViewTheme>('dataView.theme', 'auto');
    return presentDataView(data, layoutMode, normalizeTekiyouAscii, theme);
  } catch (err) {
    const error: CliError =
      err instanceof SyntaxError
        ? {
            type: 'execution_error',
            message: `CLIの出力を解析できませんでした: ${err.message}`,
            stderr: result?.stderr,
          }
        : (err as CliError);
    throw error;
  }
}
