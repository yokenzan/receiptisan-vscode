import * as path from 'node:path';
import * as vscode from 'vscode';
import { type CliError, executeWithProgress } from './cli';

// Track active preview panels by file path
const activePanels: Map<string, vscode.WebviewPanel> = new Map();

export async function showPreview(document: vscode.TextDocument): Promise<void> {
  const filePath = document.fileName;
  const fileName = path.basename(filePath);

  // Check if panel already exists for this file
  const existingPanel = activePanels.get(filePath);
  if (existingPanel) {
    existingPanel.reveal(vscode.ViewColumn.Beside);
    await updatePanel(existingPanel, filePath);
    return;
  }

  // Create new panel
  const panel = vscode.window.createWebviewPanel(
    'receiptisanPreview',
    `プレビュー: ${fileName}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
    },
  );

  // Track panel
  activePanels.set(filePath, panel);

  // Clean up when panel is closed
  panel.onDidDispose(() => {
    activePanels.delete(filePath);
  });

  await updatePanel(panel, filePath);
}

async function updatePanel(panel: vscode.WebviewPanel, filePath: string): Promise<void> {
  try {
    const result = await executeWithProgress(filePath, 'svg');
    panel.webview.html = result.stdout;
  } catch (err) {
    const error = err as CliError;
    panel.webview.html = generateErrorHtml(error);
    vscode.window.showErrorMessage(error.message);
  }
}

function generateErrorHtml(error: CliError): string {
  const stderrSection = error.stderr
    ? `<pre style="background:#2d2d2d;padding:10px;overflow:auto;max-height:200px;">${escapeHtml(error.stderr)}</pre>`
    : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: sans-serif;
      padding: 20px;
      color: #ccc;
      background: #1e1e1e;
    }
    h1 { color: #f44; }
    p { line-height: 1.6; }
    code {
      background: #2d2d2d;
      padding: 2px 6px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <h1>プレビューエラー</h1>
  <p>${escapeHtml(error.message)}</p>
  ${stderrSection}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
