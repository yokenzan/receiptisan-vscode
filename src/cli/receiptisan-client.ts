import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import { buildCliArgs, shouldTreatAsExecutionError } from './args';
import { getConfig } from './config';

export { buildCliArgs, shouldTreatAsExecutionError };

/**
 * CLI process result.
 */
export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Structured error for CLI execution.
 */
export interface CliError {
  type: 'command_not_found' | 'execution_error' | 'cancelled';
  message: string;
  stderr?: string;
}

/**
 * Executes the configured receiptisan command and captures output.
 */
export async function executeReceiptisan(
  filePath: string,
  format: 'svg' | 'json' | 'yaml' = 'svg',
  cancellationToken?: vscode.CancellationToken,
): Promise<CliResult> {
  const config = getConfig();
  const args = [...config.args, ...buildCliArgs(filePath, format)];

  return new Promise((resolve, reject) => {
    let settled = false;
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const child = spawn(config.executable, args, {
      windowsHide: true,
      cwd: config.cwd,
    });

    const cancelDisposable = cancellationToken?.onCancellationRequested(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject({ type: 'cancelled', message: 'キャンセルされました' } as CliError);
    });

    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      cancelDisposable?.dispose();
      if (err.code === 'ENOENT') {
        reject({
          type: 'command_not_found',
          message: `receiptisanコマンドが見つかりません。設定 "receiptisan.executable" / "receiptisan.args" を確認してください (現在の設定: "${config.executable}" ${JSON.stringify(config.args)})`,
        } as CliError);
        return;
      }
      reject({
        type: 'execution_error',
        message: `コマンド実行エラー: ${err.message}`,
      } as CliError);
    });

    child.on('close', (code) => {
      cancelDisposable?.dispose();
      if (settled) return;
      settled = true;
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
      const stderr = Buffer.concat(stderrChunks).toString('utf-8');
      const exitCode = code ?? 1;

      if (shouldTreatAsExecutionError(exitCode)) {
        reject({
          type: 'execution_error',
          message: `プレビューの生成に失敗しました (終了コード: ${exitCode})`,
          stderr: stderr.slice(0, 500),
        } as CliError);
        return;
      }

      resolve({ stdout, stderr, exitCode });
    });
  });
}

/**
 * Executes receiptisan command with VS Code progress UI.
 */
export async function executeWithProgress(
  filePath: string,
  format: 'svg' | 'json' | 'yaml' = 'svg',
): Promise<CliResult> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'レセプトプレビューを生成中...',
      cancellable: true,
    },
    async (_progress, token) => executeReceiptisan(filePath, format, token),
  );
}
