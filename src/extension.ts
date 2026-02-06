import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  console.log('receiptisan-preview is now active');

  const previewCommand = vscode.commands.registerCommand('receiptisan.preview', () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showErrorMessage('プレビューするUKEファイルを開いてください');
      return;
    }

    if (editor.document.languageId !== 'uke') {
      vscode.window.showErrorMessage('UKEファイルのみプレビューできます');
      return;
    }

    // TODO: Implement preview in subsequent tasks
    vscode.window.showInformationMessage(`Preview: ${editor.document.fileName}`);
  });

  context.subscriptions.push(previewCommand);
}

export function deactivate(): void {
  // Cleanup if needed
}
