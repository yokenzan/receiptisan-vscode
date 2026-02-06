import * as vscode from 'vscode';

export interface ReceiptisanConfig {
  command: string;
  cwd: string | undefined;
}

export function getConfig(): ReceiptisanConfig {
  const config = vscode.workspace.getConfiguration('receiptisan');
  const cwd = config.get<string>('cwd', '');
  return {
    command: config.get<string>('command', 'receiptisan'),
    cwd: cwd || undefined,
  };
}
