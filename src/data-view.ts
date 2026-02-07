import * as path from 'node:path';
import * as vscode from 'vscode';
import { type CliError, executeWithProgress } from './cli';
import type {
  CommentItem,
  DigitalizedReceipt,
  IyakuhinItem,
  Receipt,
  ReceiptisanJsonOutput,
  ShinryouKouiItem,
  ShoubyoumeiGroup,
  TekiyouItem,
  TokuteiKizaiItem,
} from './types';

const activePanels: Map<string, vscode.WebviewPanel> = new Map();

export async function showDataView(document: vscode.TextDocument): Promise<void> {
  const filePath = document.fileName;
  const fileName = path.basename(filePath);

  const existingPanel = activePanels.get(filePath);
  if (existingPanel) {
    existingPanel.reveal(vscode.ViewColumn.Beside);
    await updatePanel(existingPanel, filePath);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'receiptisanDataView',
    `データ: ${fileName}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  activePanels.set(filePath, panel);
  panel.onDidDispose(() => {
    activePanels.delete(filePath);
  });

  await updatePanel(panel, filePath);
}

async function updatePanel(panel: vscode.WebviewPanel, filePath: string): Promise<void> {
  try {
    const result = await executeWithProgress(filePath, 'json');
    const data: ReceiptisanJsonOutput = JSON.parse(result.stdout);
    panel.webview.html = renderDataView(data);
  } catch (err) {
    const error = err as CliError;
    panel.webview.html = renderErrorHtml(error);
    vscode.window.showErrorMessage(error.message);
  }
}

function renderErrorHtml(error: CliError): string {
  const stderrSection = error.stderr ? `<pre class="stderr">${escapeHtml(error.stderr)}</pre>` : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><style>
  body { font-family: sans-serif; padding: 20px; color: #ccc; background: #1e1e1e; }
  h1 { color: #f44; }
  .stderr { background: #2d2d2d; padding: 10px; overflow: auto; max-height: 200px; }
</style></head>
<body>
  <h1>データ取得エラー</h1>
  <p>${escapeHtml(error.message)}</p>
  ${stderrSection}
</body></html>`;
}

function renderDataView(data: ReceiptisanJsonOutput): string {
  let navItems = '';
  let receiptSections = '';
  let index = 0;

  for (const digitalizedReceipt of data) {
    for (const receipt of digitalizedReceipt.receipts) {
      const receiptId = `receipt-${index}`;
      const patient = receipt.patient;
      const label = `${patient.name} (${patient.sex.short_name}・${receipt.shinryou_ym.wareki.text})`;

      navItems += `<li><a href="#${receiptId}" class="nav-item" data-target="${receiptId}">${escapeHtml(label)}</a></li>\n`;
      receiptSections += renderReceipt(receipt, receiptId, digitalizedReceipt);
      index++;
    }
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  :root {
    --bg: #1e1e1e;
    --bg-card: #252526;
    --bg-hover: #2a2d2e;
    --border: #3c3c3c;
    --text: #cccccc;
    --text-dim: #888888;
    --text-bright: #ffffff;
    --accent: #4fc1ff;
    --accent-dim: #2a7ab5;
    --green: #6a9955;
    --orange: #ce9178;
    --yellow: #dcdcaa;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif;
    font-size: 13px;
    background: var(--bg);
    color: var(--text);
    display: flex;
    height: 100vh;
  }
  #nav {
    width: 260px;
    min-width: 260px;
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 8px 0;
  }
  #nav h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-dim);
    padding: 8px 12px 4px;
  }
  #nav ul { list-style: none; }
  #nav li a {
    display: block;
    padding: 6px 12px;
    color: var(--text);
    text-decoration: none;
    font-size: 12px;
    border-left: 2px solid transparent;
  }
  #nav li a:hover { background: var(--bg-hover); }
  #nav li a.active {
    background: var(--bg-hover);
    border-left-color: var(--accent);
    color: var(--text-bright);
  }
  #content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  .receipt-section {
    margin-bottom: 32px;
    scroll-margin-top: 16px;
  }
  .receipt-header {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-bright);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 12px;
  }
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 4px;
    margin-bottom: 12px;
  }
  .card-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }
  .card-body { padding: 8px 12px; }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  table th {
    text-align: left;
    font-size: 11px;
    color: var(--text-dim);
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  table td {
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
  }
  table tr:last-child td { border-bottom: none; }
  .tag {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 11px;
  }
  .tag-main { background: #3a3d41; color: var(--yellow); }
  .tag-tenki { background: #2d3436; color: var(--green); }
  .text-right { text-align: right; }
  .text-dim { color: var(--text-dim); }
  .text-orange { color: var(--orange); }
  .section-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--yellow);
    padding: 6px 0;
  }
  .tekiyou-item {
    display: flex;
    padding: 3px 0;
    gap: 8px;
    font-size: 12px;
  }
  .tekiyou-item .item-name { flex: 1; }
  .tekiyou-item .item-detail { color: var(--text-dim); white-space: nowrap; }
  .tekiyou-item .item-tensuu { color: var(--orange); white-space: nowrap; min-width: 60px; text-align: right; }
  .ichiren-group {
    border-left: 2px solid var(--border);
    padding-left: 8px;
    margin: 4px 0;
  }
</style>
</head>
<body>
  <div id="nav">
    <h2>レセプト一覧</h2>
    <ul>${navItems}</ul>
  </div>
  <div id="content">${receiptSections}</div>
  <script>
    (function() {
      var navLinks = document.querySelectorAll('.nav-item');
      var content = document.getElementById('content');

      navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          navLinks.forEach(function(l) { l.classList.remove('active'); });
          link.classList.add('active');
          var target = document.getElementById(link.getAttribute('data-target'));
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      if (navLinks.length > 0) navLinks[0].classList.add('active');

      var observer = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            var id = entries[i].target.id;
            navLinks.forEach(function(l) {
              l.classList.toggle('active', l.getAttribute('data-target') === id);
            });
            break;
          }
        }
      }, { root: content, threshold: 0.3 });

      document.querySelectorAll('.receipt-section').forEach(function(el) {
        observer.observe(el);
      });
    })();
  </script>
</body>
</html>`;
}

function renderReceipt(receipt: Receipt, id: string, parent: DigitalizedReceipt): string {
  const p = receipt.patient;
  const headerText = `${p.name}（${p.name_kana}）${p.sex.short_name} ${p.birth_date.wareki.text}`;

  return `
<div id="${id}" class="receipt-section">
  <div class="receipt-header">${escapeHtml(headerText)}</div>
  ${renderPatientCard(receipt, parent)}
  ${renderHokenCard(receipt)}
  ${renderShoubyoumeiCard(receipt.shoubyoumeis)}
  ${renderTekiyouCard(receipt)}
  ${renderKyuufuCard(receipt)}
</div>`;
}

function renderPatientCard(receipt: Receipt, parent: DigitalizedReceipt): string {
  const p = receipt.patient;
  const t = receipt.type;
  return `
<div class="card">
  <div class="card-title">患者情報</div>
  <div class="card-body">
    <table>
      <tr><th>患者番号</th><td>${escapeHtml(p.id)}</td></tr>
      <tr><th>氏名</th><td>${escapeHtml(p.name)}（${escapeHtml(p.name_kana)}）</td></tr>
      <tr><th>性別</th><td>${escapeHtml(p.sex.name)}</td></tr>
      <tr><th>生年月日</th><td>${escapeHtml(p.birth_date.wareki.text)}</td></tr>
      <tr><th>診療年月</th><td>${escapeHtml(receipt.shinryou_ym.wareki.text)}</td></tr>
      <tr><th>入外</th><td>${receipt.nyuugai === 'nyuuin' ? '入院' : '外来'}</td></tr>
      <tr><th>種別</th><td>${escapeHtml(t.tensuu_hyou_type.name)}・${escapeHtml(t.main_hoken_type.name)}・${escapeHtml(t.hoken_multiple_type.name)}・${escapeHtml(t.patient_age_type.name)}</td></tr>
      <tr><th>医療機関</th><td>${escapeHtml(parent.hospital.name ?? parent.hospital.code)} (${escapeHtml(parent.prefecture.name)})</td></tr>
    </table>
  </div>
</div>`;
}

function renderHokenCard(receipt: Receipt): string {
  const h = receipt.hokens;
  const ih = h.iryou_hoken;
  let kouhiRows = '';
  for (let i = 0; i < h.kouhi_futan_iryous.length; i++) {
    const k = h.kouhi_futan_iryous[i];
    kouhiRows += `
      <tr><th>公費${i + 1} 負担者番号</th><td>${escapeHtml(k.futansha_bangou)}</td></tr>
      <tr><th>公費${i + 1} 受給者番号</th><td>${escapeHtml(k.jukyuusha_bangou)}</td></tr>`;
  }

  const iryouHokenRows = ih
    ? `<tr><th>保険者番号</th><td>${escapeHtml(ih.hokenja_bangou)}</td></tr>
      <tr><th>記号・番号</th><td>${escapeHtml(ih.kigou)} ・ ${escapeHtml(ih.bangou)}</td></tr>
      <tr><th>枝番</th><td>${escapeHtml(ih.edaban)}</td></tr>
      <tr><th>給付割合</th><td>${ih.kyuufu_wariai != null ? `${ih.kyuufu_wariai}%` : ''}</td></tr>`
    : '';

  return `
<div class="card">
  <div class="card-title">保険情報</div>
  <div class="card-body">
    <table>
      ${iryouHokenRows}
      ${kouhiRows}
    </table>
  </div>
</div>`;
}

function renderShoubyoumeiCard(groups: ShoubyoumeiGroup[]): string {
  if (groups.length === 0) return '';

  let rows = '';
  for (const group of groups) {
    for (const s of group.shoubyoumeis) {
      const mainTag = s.is_main ? '<span class="tag tag-main">主</span> ' : '';
      const tenkiTag = `<span class="tag tag-tenki">${escapeHtml(s.tenki.name)}</span>`;
      rows += `
      <tr>
        <td>${mainTag}${escapeHtml(s.full_text)}</td>
        <td>${escapeHtml(s.start_date.wareki.text)}</td>
        <td>${tenkiTag}</td>
      </tr>`;
    }
  }

  return `
<div class="card">
  <div class="card-title">傷病名</div>
  <div class="card-body">
    <table>
      <tr><th>傷病名</th><th>開始日</th><th>転帰</th></tr>
      ${rows}
    </table>
  </div>
</div>`;
}

function renderTekiyouCard(receipt: Receipt): string {
  const sections = receipt.tekiyou.shinryou_shikibetsu_sections;
  if (sections.length === 0) return '';

  let content = '';
  for (const section of sections) {
    content += `<div class="section-label">${escapeHtml(String(section.shinryou_shikibetsu.code))} ${escapeHtml(section.shinryou_shikibetsu.name)}</div>`;

    for (const ichiren of section.ichiren_units) {
      content += '<div class="ichiren-group">';
      for (const santei of ichiren.santei_units) {
        for (const item of santei.items) {
          content += renderTekiyouItem(item);
        }
        if (santei.tensuu > 0) {
          content += `<div class="tekiyou-item"><span class="item-name"></span><span class="item-tensuu">${santei.tensuu}点 ×${santei.kaisuu}</span></div>`;
        }
      }
      content += '</div>';
    }
  }

  return `
<div class="card">
  <div class="card-title">摘要欄</div>
  <div class="card-body">${content}</div>
</div>`;
}

function renderTekiyouItem(item: TekiyouItem): string {
  switch (item.type) {
    case 'shinryou_koui':
      return renderMedicalItem(item);
    case 'iyakuhin':
      return renderMedicalItem(item);
    case 'tokutei_kizai':
      return renderMedicalItem(item);
    case 'comment':
      return renderCommentItem(item);
    default:
      return '';
  }
}

function renderMedicalItem(item: ShinryouKouiItem | IyakuhinItem | TokuteiKizaiItem): string {
  const name = item.text.master_name;
  const details: string[] = [];
  if (item.text.shiyouryou) details.push(item.text.shiyouryou);
  if (item.text.unit_price) details.push(item.text.unit_price);

  return `<div class="tekiyou-item">
    <span class="item-name">${escapeHtml(name)}</span>
    <span class="item-detail">${escapeHtml(details.join(' '))}</span>
  </div>`;
}

function renderCommentItem(item: CommentItem): string {
  return `<div class="tekiyou-item">
    <span class="item-name text-dim">${escapeHtml(item.text)}</span>
  </div>`;
}

function renderKyuufuCard(receipt: Receipt): string {
  const k = receipt.ryouyou_no_kyuufu;
  const ih = k.iryou_hoken;

  if (!ih) return '';

  return `
<div class="card">
  <div class="card-title">療養の給付</div>
  <div class="card-body">
    <table>
      <tr><th>合計点数</th><td class="text-right">${ih.goukei_tensuu.toLocaleString()}点</td></tr>
      <tr><th>診療実日数</th><td class="text-right">${ih.shinryou_jitsunissuu}日</td></tr>
      ${ih.ichibu_futankin != null ? `<tr><th>一部負担金</th><td class="text-right">${ih.ichibu_futankin.toLocaleString()}円</td></tr>` : ''}
    </table>
  </div>
</div>`;
}

function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
