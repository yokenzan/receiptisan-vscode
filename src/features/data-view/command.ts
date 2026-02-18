import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CliError } from '../../cli/receiptisan-client';
import { type LayoutMode, presentDataViewError } from './presenter';
import { generateDataViewHtml } from './service';

export type { LayoutMode } from './presenter';

const activePanels: Map<string, vscode.WebviewPanel> = new Map();

/**
 * Opens or updates a data view panel for the specified document and layout.
 */
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
    panel.webview.html = await generateDataViewHtml(filePath, layoutMode);
  } catch (err) {
    const error = err as CliError;
    panel.webview.html = presentDataViewError(error);
    vscode.window.showErrorMessage(error.message);
  }
}
