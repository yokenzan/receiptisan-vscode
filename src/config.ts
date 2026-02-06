import * as vscode from 'vscode';

export interface ReceiptisanConfig {
  command: string;
}

export function getConfig(): ReceiptisanConfig {
  const config = vscode.workspace.getConfiguration('receiptisan');
  return {
    command: config.get<string>('command', 'receiptisan'),
  };
}
