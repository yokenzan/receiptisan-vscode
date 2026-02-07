import * as vscode from 'vscode';
import { UKE_COLUMNS } from './uke-columns';

export function createUkeInlayHintsProvider(): vscode.InlayHintsProvider {
  return {
    provideInlayHints(
      document: vscode.TextDocument,
      range: vscode.Range,
      _token: vscode.CancellationToken,
    ): vscode.InlayHint[] {
      const hints: vscode.InlayHint[] = [];

      for (let lineIndex = range.start.line; lineIndex <= range.end.line; lineIndex++) {
        const line = document.lineAt(lineIndex);
        if (line.isEmptyOrWhitespace) {
          continue;
        }

        const text = line.text;
        const fields = text.split(',');
        const recordType = fields[0];
        const columns = UKE_COLUMNS[recordType];

        if (!columns) {
          continue;
        }

        let offset = fields[0].length + 1; // skip record type + first comma

        for (let fieldIndex = 1; fieldIndex < fields.length; fieldIndex++) {
          if (fieldIndex < columns.length && columns[fieldIndex]) {
            const position = new vscode.Position(lineIndex, offset);
            const hint = new vscode.InlayHint(
              position,
              `${columns[fieldIndex]}:`,
              vscode.InlayHintKind.Parameter,
            );
            hint.paddingRight = true;
            hints.push(hint);
          }

          offset += fields[fieldIndex].length + 1; // field length + comma
        }
      }

      return hints;
    },
  };
}
