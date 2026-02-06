import * as vscode from 'vscode';
import { showPreview } from './preview';

export function activate(context: vscode.ExtensionContext): void {
  console.log('receiptisan-preview is now active');

  const previewCommand = vscode.commands.registerCommand('receiptisan.preview', async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showErrorMessage('プレビューするUKEファイルを開いてください');
      return;
    }

    if (editor.document.languageId !== 'uke') {
      vscode.window.showErrorMessage('UKEファイルのみプレビューできます');
      return;
    }

    await showPreview(editor.document);
  });

  context.subscriptions.push(previewCommand);
}

export function deactivate(): void {
  // Cleanup if needed
}
