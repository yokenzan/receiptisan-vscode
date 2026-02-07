import * as vscode from 'vscode';
import { showDataView } from './data-view';
import { showPreview } from './preview';

export function activate(context: vscode.ExtensionContext): void {
  console.log('receiptisan-preview is now active');

  const validateUkeEditor = (): vscode.TextEditor | undefined => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showErrorMessage('プレビューするUKEファイルを開いてください');
      return undefined;
    }

    if (editor.document.languageId !== 'uke') {
      vscode.window.showErrorMessage('UKEファイルのみプレビューできます');
      return undefined;
    }

    return editor;
  };

  const previewCommand = vscode.commands.registerCommand('receiptisan.preview', async () => {
    const editor = validateUkeEditor();
    if (editor) await showPreview(editor.document);
  });

  const dataViewCommand = vscode.commands.registerCommand('receiptisan.dataView', async () => {
    const editor = validateUkeEditor();
    if (editor) await showDataView(editor.document);
  });

  context.subscriptions.push(previewCommand, dataViewCommand);
}

export function deactivate(): void {
  // Cleanup if needed
}
