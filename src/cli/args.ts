/**
 * Builds common preview arguments for the receiptisan CLI.
 */
export function buildCliArgs(filePath: string, format: 'svg' | 'json' | 'yaml'): string[] {
  return ['--preview', `--format=${format}`, filePath];
}

/**
 * Determines whether an exit code should be treated as an error.
 */
export function shouldTreatAsExecutionError(exitCode: number): boolean {
  return exitCode !== 0;
}
