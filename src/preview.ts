import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { type CliError, executeWithProgress } from './cli';

// Single shared preview panel
let activePanel: vscode.WebviewPanel | undefined;

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
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  activePanel = panel;

  panel.onDidDispose(() => {
    activePanel = undefined;
  });

  await updatePanel(panel, filePath);
}

async function updatePanel(panel: vscode.WebviewPanel, filePath: string): Promise<void> {
  try {
    const result = await executeWithProgress(filePath, 'svg');
    panel.webview.html = wrapWithZoomControls(result.stdout);
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
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

function wrapWithZoomControls(cliHtml: string): string {
  const nonce = crypto.randomUUID();
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:; font-src *;">
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #1e1e1e; }
    #zoom-toolbar {
      position: fixed;
      top: 8px;
      right: 12px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(30, 30, 30, 0.9);
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 8px;
      user-select: none;
    }
    #zoom-toolbar button {
      background: transparent;
      border: 1px solid #666;
      border-radius: 3px;
      color: #ccc;
      font-size: 14px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #zoom-toolbar button:hover { background: #444; }
    #zoom-toolbar button.active {
      border-color: #4fc1ff;
      color: #4fc1ff;
    }
    #preview-container {
      width: 100%;
      height: 100vh;
      overflow: auto;
    }
    #preview-content {
      transform-origin: top left;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div id="zoom-toolbar">
    <button id="zoom-out" title="縮小">−</button>
    <button id="zoom-in" title="拡大">+</button>
    <button id="zoom-fit" title="タブ幅にフィット" class="active">⤢</button>
  </div>
  <div id="preview-container">
    <div id="preview-content">${cliHtml}</div>
  </div>
  <script nonce="${nonce}">
    (function() {
      const STEP = 0.1;
      const MIN = 0.1;
      const MAX = 3.0;

      let scale = 1.0;
      let fitToWidth = true;

      const content = document.getElementById('preview-content');
      const container = document.getElementById('preview-container');
      const fitBtn = document.getElementById('zoom-fit');

      function getSvgNativeWidth() {
        const svg = content.querySelector('svg');
        if (!svg) return 0;
        const w = svg.getAttribute('width');
        if (w) return parseFloat(w);
        const vb = svg.getAttribute('viewBox');
        if (vb) {
          const parts = vb.split(/[\\s,]+/);
          if (parts.length >= 4) return parseFloat(parts[2]);
        }
        return 0;
      }

      function calcFitScale() {
        const svgWidth = getSvgNativeWidth();
        if (svgWidth <= 0) return 1.0;
        return container.clientWidth / svgWidth;
      }

      function applyZoom() {
        content.style.transform = 'scale(' + scale + ')';
        fitBtn.classList.toggle('active', fitToWidth);
      }

      function applyFitToWidth() {
        scale = calcFitScale();
        applyZoom();
      }

      function enterManualZoom(newScale) {
        fitToWidth = false;
        scale = Math.min(MAX, Math.max(MIN, newScale));
        applyZoom();
      }

      document.getElementById('zoom-in').addEventListener('click', function() {
        enterManualZoom(scale + STEP);
      });

      document.getElementById('zoom-out').addEventListener('click', function() {
        enterManualZoom(scale - STEP);
      });

      fitBtn.addEventListener('click', function() {
        fitToWidth = true;
        applyFitToWidth();
      });

      container.addEventListener('wheel', function(e) {
        if (e.ctrlKey) {
          e.preventDefault();
          var delta = e.deltaY < 0 ? STEP : -STEP;
          enterManualZoom(scale + delta);
        }
      }, { passive: false });

      var ro = new ResizeObserver(function() {
        if (fitToWidth) applyFitToWidth();
      });
      ro.observe(container);

      applyFitToWidth();
    })();
  </script>
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
