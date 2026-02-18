import * as path from 'node:path';
import * as vscode from 'vscode';
import { type CliError, type CliResult, executeWithProgress } from './cli';
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
  let result: CliResult | undefined;
  try {
    result = await executeWithProgress(filePath, 'json');
    const data: ReceiptisanJsonOutput = JSON.parse(result.stdout);
    const config = vscode.workspace.getConfiguration('receiptisan');
    const normalizeTekiyouAscii = config.get<boolean>('dataView.normalizeTekiyouAscii', false);
    panel.webview.html = renderDataView(data, layoutMode, { normalizeTekiyouAscii });
  } catch (err) {
    const error: CliError =
      err instanceof SyntaxError
        ? {
            type: 'execution_error',
            message: `CLIの出力を解析できませんでした: ${err.message}`,
            stderr: result?.stderr,
          }
        : (err as CliError);
    panel.webview.html = renderErrorHtml(error);
    vscode.window.showErrorMessage(error.message);
  }
}
