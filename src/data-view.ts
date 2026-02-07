import * as path from 'node:path';
import * as vscode from 'vscode';
import { type CliError, executeWithProgress } from './cli';
import { renderDataView, renderErrorHtml } from './data-view-renderers';
import type { ReceiptisanJsonOutput } from './types';

export type LayoutMode = 'vertical' | 'horizontal';

const activePanels: Map<string, vscode.WebviewPanel> = new Map();

export async function showDataView(
  document: vscode.TextDocument,
  layoutMode: LayoutMode,
): Promise<void> {
  const filePath = document.fileName;
  const fileName = path.basename(filePath);
  const panelKey = `${filePath}:${layoutMode}`;

  const existingPanel = activePanels.get(panelKey);
  if (existingPanel) {
    existingPanel.reveal(vscode.ViewColumn.Beside);
    await updatePanel(existingPanel, filePath, layoutMode);
    return;
  }

  const layoutLabel = layoutMode === 'horizontal' ? '横' : '縦';
  const panel = vscode.window.createWebviewPanel(
    'receiptisanDataView',
    `データ(${layoutLabel}): ${fileName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  activePanels.set(panelKey, panel);
  panel.onDidDispose(() => {
    activePanels.delete(panelKey);
  });

  await updatePanel(panel, filePath, layoutMode);

  if (layoutMode === 'horizontal') {
    await vscode.commands.executeCommand('workbench.action.moveActiveEditorGroupDown');
  }
}

async function updatePanel(
  panel: vscode.WebviewPanel,
  filePath: string,
  layoutMode: LayoutMode,
): Promise<void> {
  try {
    const result = await executeWithProgress(filePath, 'json');
    const data: ReceiptisanJsonOutput = JSON.parse(result.stdout);
    panel.webview.html = renderDataView(data, layoutMode);
  } catch (err) {
    const error = err as CliError;
    panel.webview.html = renderErrorHtml(error);
    vscode.window.showErrorMessage(error.message);
  }
}
