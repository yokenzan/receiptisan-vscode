import * as path from 'node:path';
import * as vscode from 'vscode';
import { type CliError, executeWithProgress } from './cli';
import { renderDataView, renderErrorHtml } from './data-view-renderers';
import type { ReceiptisanJsonOutput } from './types';

const activePanels: Map<string, vscode.WebviewPanel> = new Map();

export async function showDataView(document: vscode.TextDocument): Promise<void> {
  const filePath = document.fileName;
  const fileName = path.basename(filePath);

  const existingPanel = activePanels.get(filePath);
  if (existingPanel) {
    existingPanel.reveal(vscode.ViewColumn.Beside);
    await updatePanel(existingPanel, filePath);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'receiptisanDataView',
    `データ: ${fileName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  activePanels.set(filePath, panel);
  panel.onDidDispose(() => {
    activePanels.delete(filePath);
  });

  await updatePanel(panel, filePath);
}

async function updatePanel(panel: vscode.WebviewPanel, filePath: string): Promise<void> {
  try {
    const result = await executeWithProgress(filePath, 'json');
    const data: ReceiptisanJsonOutput = JSON.parse(result.stdout);
    panel.webview.html = renderDataView(data);
  } catch (err) {
    const error = err as CliError;
    panel.webview.html = renderErrorHtml(error);
    vscode.window.showErrorMessage(error.message);
  }
}
