import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import { getConfig } from './config';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CliError {
  type: 'command_not_found' | 'execution_error' | 'cancelled';
  message: string;
  stderr?: string;
}

export async function executeReceiptisan(
  filePath: string,
  format: 'svg' | 'json' | 'yaml' = 'svg',
  cancellationToken?: vscode.CancellationToken,
): Promise<CliResult> {
  const config = getConfig();
  const command = config.command;
  const args = ['--preview', `--format=${format}`, filePath];

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    // Use shell: true to support commands like "bundle exec receiptisan"
    const child = spawn(command, args, {
      shell: true,
      windowsHide: true,
      cwd: config.cwd,
    });

    if (cancellationToken) {
      cancellationToken.onCancellationRequested(() => {
        child.kill();
        reject({ type: 'cancelled', message: 'キャンセルされました' } as CliError);
      });
    }

    child.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject({
          type: 'command_not_found',
          message: `receiptisanコマンドが見つかりません。設定 "receiptisan.command" を確認してください (現在の設定: "${command}")`,
        } as CliError);
      } else {
        reject({
          type: 'execution_error',
          message: `コマンド実行エラー: ${err.message}`,
        } as CliError);
      }
    });

    child.on('close', (code) => {
      const stdout = Buffer.concat(chunks).toString('utf-8');
      const stderr = Buffer.concat(stderrChunks).toString('utf-8');
      const exitCode = code ?? 1;

      if (exitCode !== 0 && stdout.length === 0) {
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
    async (_progress, token) => {
      return executeReceiptisan(filePath, format, token);
    },
  );
}
