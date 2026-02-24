import * as vscode from 'vscode';
import { showDataView } from './features/data-view/command';
import { showPreview } from './features/preview/command';

/**
 * Returns the active editor when it is a UKE document.
 * @throws {Error} If there is no active editor or the language is not UKE.
 */
function currentUkeEditor(): vscode.TextEditor {
  const editor = vscode.window.activeTextEditor;
  if (!editor) throw new Error('No active editor');
  if (editor.document.languageId !== 'uke') throw new Error('Active editor is not a UKE file');
  return editor;
}

/**
 * Activates the extension and registers preview/data view commands.
 */
export function activate(context: vscode.ExtensionContext): void {
  const previewCommand = vscode.commands.registerCommand('receiptisan.preview', async () => {
    try {
      await showPreview(currentUkeEditor().document);
    } catch (err) {
      vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
    }
  });

  const dataViewVerticalCommand = vscode.commands.registerCommand(
    'receiptisan.dataViewVertical',
    async () => {
      try {
        await showDataView(currentUkeEditor().document, 'vertical');
      } catch (err) {
        vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
      }
    },
  );

  const dataViewHorizontalCommand = vscode.commands.registerCommand(
    'receiptisan.dataViewHorizontal',
    async () => {
      try {
        await showDataView(currentUkeEditor().document, 'horizontal');
      } catch (err) {
        vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
      }
    },
  );

  context.subscriptions.push(previewCommand, dataViewVerticalCommand, dataViewHorizontalCommand);
}

/**
 * VS Code extension deactivation hook.
 */
export function deactivate(): void {}
