import * as vscode from 'vscode';

/**
 * Extension settings related to CLI invocation.
 */
export interface ReceiptisanConfig {
  executable: string;
  args: string[];
  cwd: string | undefined;
}

/**
 * Reads receiptisan extension settings from workspace configuration.
 */
export function getConfig(): ReceiptisanConfig {
  const config = vscode.workspace.getConfiguration('receiptisan');
  const cwd = config.get<string>('cwd', '');
  const args = config.get<string[]>('args', []);
  return {
    executable: config.get<string>('executable', 'receiptisan'),
    args: Array.isArray(args) ? args : [],
    cwd: cwd || undefined,
  };
}
