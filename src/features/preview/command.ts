import * as path from 'node:path';
import * as vscode from 'vscode';
import { presentPreviewError } from './presenter';
import { generatePreviewHtml } from './service';

let activePanel: vscode.WebviewPanel | undefined;

/**
 * Opens or updates the preview panel for the given UKE document.
 */
export async function showPreview(document: vscode.TextDocument): Promise<void> {
  const filePath = document.fileName;
  const fileName = path.basename(filePath);

  if (activePanel) {
    activePanel.title = `プレビュー: ${fileName}`;
    activePanel.reveal(vscode.ViewColumn.Beside);
    await updatePanel(activePanel, filePath);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'receiptisanPreview',
    `プレビュー: ${fileName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  activePanel = panel;
  panel.onDidDispose(() => {
    activePanel = undefined;
  });

  await updatePanel(panel, filePath);
}

async function updatePanel(panel: vscode.WebviewPanel, filePath: string): Promise<void> {
  try {
    panel.webview.html = await generatePreviewHtml(filePath);
  } catch (error) {
    const presented = presentPreviewError(error);
    panel.webview.html = presented.html;
    vscode.window.showErrorMessage(presented.message);
  }
}
