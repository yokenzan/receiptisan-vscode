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
  body { font-family: sans-serif; padding: 20px; color: #333; background: #f5f5f5; }
  h1 { color: #c62828; }
  .stderr { background: #e8e8e8; padding: 10px; overflow: auto; max-height: 200px; color: #333; }
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
    --bg: #f5f5f5;
    --bg-card: #ffffff;
    --bg-hover: #e8eaed;
    --border: #d0d4d8;
    --text: #333333;
    --text-dim: #777777;
    --text-bright: #111111;
    --accent: #0066cc;
    --accent-dim: #004d99;
    --green: #2e7d32;
    --orange: #c75000;
    --yellow: #7a6b00;

    --color-si: #333333;
    --color-iy: #1a5fb4;
    --color-to: #1b7742;
    --color-co: #8a6d00;

    --tenki-1-bg: #d32f2f;
    --tenki-1-fg: #ffffff;
    --tenki-2-bg: #388e3c;
    --tenki-2-fg: #ffffff;
    --tenki-3-bg: #0097a7;
    --tenki-3-fg: #ffffff;
    --tenki-4-bg: #1565c0;
    --tenki-4-fg: #ffffff;

    --badge-type-bg: #9c27b0;
    --badge-type-fg: #ffffff;
    --badge-tokki-bg: #1976d2;
    --badge-tokki-fg: #ffffff;
    --badge-main-bg: #c62828;
    --badge-main-fg: #ffffff;

    --font-mono: 'SF Mono', 'Cascadia Code', 'Consolas', 'Courier New', monospace;
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
    width: 220px;
    min-width: 220px;
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 4px 0;
  }
  #nav h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-dim);
    padding: 6px 8px 2px;
  }
  #nav ul { list-style: none; }
  #nav li a {
    display: block;
    padding: 3px 8px;
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
    padding: 8px 12px;
  }
  .receipt-section {
    margin-bottom: 20px;
    scroll-margin-top: 8px;
  }
  .receipt-header {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-bright);
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 6px;
  }
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 3px;
    margin-bottom: 6px;
  }
  .card-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
  }
  .card-body { padding: 4px 8px; }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  table th {
    text-align: left;
    font-size: 11px;
    color: var(--text-dim);
    padding: 2px 6px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  table td {
    padding: 2px 6px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
  }
  table tr:last-child td { border-bottom: none; }
  .tag {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 11px;
    white-space: nowrap;
  }
  .tag-main { background: var(--badge-main-bg); color: var(--badge-main-fg); font-weight: 600; }
  .tag-tenki { background: #e0e0e0; color: var(--green); }
  .tag-tenki-1 { background: var(--tenki-1-bg); color: var(--tenki-1-fg); }
  .tag-tenki-2 { background: var(--tenki-2-bg); color: var(--tenki-2-fg); }
  .tag-tenki-3 { background: var(--tenki-3-bg); color: var(--tenki-3-fg); }
  .tag-tenki-4 { background: var(--tenki-4-bg); color: var(--tenki-4-fg); }
  .tag-type { background: var(--badge-type-bg); color: var(--badge-type-fg); font-family: var(--font-mono); }
  .tag-tokki { background: var(--badge-tokki-bg); color: var(--badge-tokki-fg); font-family: var(--font-mono); }
  .text-right { text-align: right; }
  .text-dim { color: var(--text-dim); }
  .text-orange { color: var(--orange); }
  .code { font-family: var(--font-mono); font-size: 11px; }
  .num { text-align: right; font-family: var(--font-mono); font-size: 12px; }
  .item-si { color: var(--color-si); }
  .item-iy { color: var(--color-iy); }
  .item-to { color: var(--color-to); }
  .item-co { color: var(--color-co); font-style: italic; }
  .disease-main td { font-weight: 600; }
  .disease-worpro td { font-style: italic; color: var(--text-dim); text-decoration: underline wavy #bbb; }
  .sub-code { font-family: var(--font-mono); font-size: 10px; color: var(--text-dim); }
  .section-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--yellow);
    padding: 3px 0;
  }

  /* Receipt header info table */
  .receipt-info-table th { white-space: nowrap; width: 1%; padding-right: 8px; }
  .receipt-info-table td { padding: 2px 6px; }
  .receipt-info-table .tag { margin-right: 3px; }

  /* Tekiyou table */
  .tekiyou-table { width: 100%; border-collapse: collapse; }
  .tekiyou-table th {
    text-align: left; font-size: 11px; color: var(--text-dim);
    padding: 2px 4px; border-bottom: 1px solid var(--border); white-space: nowrap;
  }
  .tekiyou-table td { padding: 1px 4px; font-size: 12px; border-bottom: none; }
  .tekiyou-table .col-code { font-family: var(--font-mono); font-size: 11px; white-space: nowrap; color: var(--text-dim); }
  .tekiyou-table .col-shinku { font-family: var(--font-mono); font-size: 11px; text-align: center; white-space: nowrap; }
  .tekiyou-table .col-mark { text-align: center; color: #9c27b0; font-weight: bold; width: 20px; }
  .tekiyou-table .col-name { }
  .tekiyou-table .col-tensuu { text-align: right; font-family: var(--font-mono); font-size: 12px; white-space: nowrap; }
  .tekiyou-table .col-kaisuu { text-align: right; font-family: var(--font-mono); font-size: 12px; white-space: nowrap; }
  .tekiyou-table .appended { font-style: italic; color: var(--text-dim); margin-left: 4px; }

  /* Tekiyou separator styles */
  .tekiyou-table .row-upper-shinku td { border-top: 2px solid #9090b0; padding-top: 3px; }
  .tekiyou-table .row-next-shinku td { border-top: 1px solid var(--border); padding-top: 2px; }
  .tekiyou-table .row-new-santei td { border-top: 1px dotted #c0c0c0; padding-top: 2px; }

  /* Hoken integrated table */
  .hoken-integrated-table th { text-align: left; }
  .hoken-integrated-table .num { padding-right: 4px; }
  .hoken-detail { font-size: 11px; color: var(--text-dim); padding: 3px 6px; }
  .hoken-detail span { margin-right: 10px; }

  /* Shuukei table */
  .shuukei-table th, .shuukei-table td { text-align: right; padding: 2px 6px; font-size: 12px; }
  .shuukei-table th:first-child, .shuukei-table td:first-child { text-align: left; }
  .shuukei-table td { font-family: var(--font-mono); }
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

// --- Helpers ---

function escapeHtml(text: unknown): string {
  if (text == null) return '';
  const s = typeof text === 'string' ? text : String(text);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '';
  return n.toLocaleString();
}

function getTenkiColorClass(code: number | string): string {
  const c = Number(code);
  if (c >= 1 && c <= 4) return `tag-tenki-${c}`;
  return 'tag-tenki';
}

function getCategoryColorClass(type: string): string {
  switch (type) {
    case 'shinryou_koui':
      return 'item-si';
    case 'iyakuhin':
      return 'item-iy';
    case 'tokutei_kizai':
      return 'item-to';
    case 'comment':
      return 'item-co';
    default:
      return '';
  }
}

// --- Render functions ---

function renderReceipt(receipt: Receipt, id: string, parent: DigitalizedReceipt): string {
  const p = receipt.patient;
  const headerText = `${p.name}（${p.name_kana ?? ''}）${p.sex.short_name} ${p.birth_date.wareki.text}`;

  return `
<div id="${id}" class="receipt-section">
  <div class="receipt-header">${escapeHtml(headerText)}</div>
  ${renderReceiptHeader(receipt)}
  ${renderPatientCard(receipt, parent)}
  ${renderHokenCard(receipt)}
  ${renderShoubyoumeiCard(receipt.shoubyoumeis)}
  ${renderTekiyouCard(receipt)}
  ${renderKyuufuCard(receipt)}
</div>`;
}

function renderReceiptHeader(receipt: Receipt): string {
  const t = receipt.type;

  const typeBadges = [
    t.tensuu_hyou_type,
    t.main_hoken_type,
    t.hoken_multiple_type,
    t.patient_age_type,
  ]
    .map(
      (tp) =>
        `<span class="tag tag-type">${escapeHtml(String(tp.code))} ${escapeHtml(tp.name)}</span>`,
    )
    .join(' ');

  const tokkiBadges =
    receipt.tokki_jikous.length > 0
      ? receipt.tokki_jikous
          .map(
            (tk) =>
              `<span class="tag tag-tokki">${escapeHtml(String(tk.code))} ${escapeHtml(tk.name)}</span>`,
          )
          .join(' ')
      : '<span class="text-dim">なし</span>';

  return `
<div class="card">
  <div class="card-body">
    <table class="receipt-info-table">
      <tr>
        <th>No.</th>
        <td><strong>${receipt.id}</strong> &emsp; ${escapeHtml(receipt.shinryou_ym.wareki.text)}診療</td>
      </tr>
      <tr>
        <th>種別</th>
        <td>${typeBadges}</td>
      </tr>
      <tr>
        <th>特記</th>
        <td>${tokkiBadges}</td>
      </tr>
    </table>
  </div>
</div>`;
}

function renderPatientCard(receipt: Receipt, parent: DigitalizedReceipt): string {
  const p = receipt.patient;

  let nyuuinRows = '';
  if (receipt.nyuugai === 'nyuuin') {
    if (receipt.nyuuin_date) {
      nyuuinRows += `<tr><th>入院日</th><td>${escapeHtml(receipt.nyuuin_date.wareki.text)}</td></tr>`;
    }
    if (receipt.byoushou_types.length > 0) {
      nyuuinRows += `<tr><th>病床</th><td>${receipt.byoushou_types.map((b) => escapeHtml(b)).join('、')}</td></tr>`;
    }
  }

  return `
<div class="card">
  <div class="card-title">患者情報</div>
  <div class="card-body">
    <table>
      <tr><th>患者番号</th><td>${escapeHtml(p.id)}</td></tr>
      <tr><th>氏名</th><td>${escapeHtml(p.name)}${p.name_kana ? `（${escapeHtml(p.name_kana)}）` : ''}</td></tr>
      <tr><th>性別</th><td>${escapeHtml(p.sex.name)}</td></tr>
      <tr><th>生年月日</th><td>${escapeHtml(p.birth_date.wareki.text)}</td></tr>
      <tr><th>診療年月</th><td>${escapeHtml(receipt.shinryou_ym.wareki.text)}</td></tr>
      <tr><th>入外</th><td>${receipt.nyuugai === 'nyuuin' ? '入院' : '外来'}</td></tr>
      ${nyuuinRows}
      <tr><th>医療機関</th><td>${escapeHtml(parent.hospital.name ?? parent.hospital.code)} (${escapeHtml(parent.prefecture.name)})</td></tr>
    </table>
  </div>
</div>`;
}

function renderHokenCard(receipt: Receipt): string {
  const h = receipt.hokens;
  const ih = h.iryou_hoken;
  const k = receipt.ryouyou_no_kyuufu;

  // Build integrated table rows
  let tableRows = '';

  // Medical insurance row
  if (ih) {
    const kih = k.iryou_hoken;
    tableRows += `<tr>
      <td>医療保険</td>
      <td class="code">${escapeHtml(ih.hokenja_bangou)}</td>
      <td class="num">${kih ? `${kih.shinryou_jitsunissuu}日` : ''}</td>
      <td class="num">${kih ? `${formatNumber(kih.goukei_tensuu)}点` : ''}</td>
      <td class="num">${kih?.ichibu_futankin != null ? `${formatNumber(kih.ichibu_futankin)}円` : ''}</td>
    </tr>`;
  }

  // Public insurance rows
  for (let i = 0; i < h.kouhi_futan_iryous.length; i++) {
    const kouhi = h.kouhi_futan_iryous[i];
    const rk = k.kouhi_futan_iryous[i];
    tableRows += `<tr>
      <td>公費${i + 1}</td>
      <td class="code">${escapeHtml(kouhi.futansha_bangou)}</td>
      <td class="num">${rk ? `${rk.shinryou_jitsunissuu}日` : ''}</td>
      <td class="num">${rk ? `${formatNumber(rk.goukei_tensuu)}点` : ''}</td>
      <td class="num">${rk?.ichibu_futankin != null ? `${formatNumber(rk.ichibu_futankin)}円` : ''}</td>
    </tr>`;
  }

  if (!tableRows) return '';

  // Detail section below table
  let details = '';
  if (ih) {
    const parts: string[] = [];
    if (ih.kigou != null || ih.bangou) {
      parts.push(`記号・番号: ${escapeHtml(ih.kigou)} ・ ${escapeHtml(ih.bangou)}`);
    }
    if (ih.edaban != null) {
      parts.push(`枝番: ${escapeHtml(ih.edaban)}`);
    }
    if (ih.kyuufu_wariai != null) {
      parts.push(`給付割合: ${ih.kyuufu_wariai}%`);
    }
    if (ih.teishotoku_type) {
      parts.push(`低所得: ${escapeHtml(ih.teishotoku_type)}`);
    }
    if (parts.length > 0) {
      details += `<div class="hoken-detail">${parts.map((p) => `<span>${p}</span>`).join('')}</div>`;
    }
  }

  for (let i = 0; i < h.kouhi_futan_iryous.length; i++) {
    const kouhi = h.kouhi_futan_iryous[i];
    details += `<div class="hoken-detail"><span>公費${i + 1} 受給者番号: ${escapeHtml(kouhi.jukyuusha_bangou)}</span></div>`;
  }

  return `
<div class="card">
  <div class="card-title">保険情報</div>
  <div class="card-body">
    <table class="hoken-integrated-table">
      <tr>
        <th>保険</th>
        <th>事業者番号</th>
        <th>実日数</th>
        <th>請求点数</th>
        <th>負担金</th>
      </tr>
      ${tableRows}
    </table>
    ${details}
  </div>
</div>`;
}

function renderShoubyoumeiCard(groups: ShoubyoumeiGroup[]): string {
  if (groups.length === 0) return '';

  let rows = '';
  let idx = 0;
  for (const group of groups) {
    for (const s of group.shoubyoumeis) {
      idx++;
      const mainBadge = s.is_main ? '<span class="tag tag-main">主</span>' : '';
      const tenkiClass = getTenkiColorClass(s.tenki.code);
      const tenkiBadge = `<span class="tag ${tenkiClass}">${escapeHtml(s.tenki.name)}</span>`;

      const shuushokugoSub =
        s.master_shuushokugos.length > 0
          ? `<br/><span class="sub-code">${s.master_shuushokugos.map((m) => escapeHtml(m.code)).join(' ')}</span>`
          : '';

      const commentText = s.comment
        ? ` <span class="text-dim">（${escapeHtml(s.comment)}）</span>`
        : '';

      const rowClass = s.is_main
        ? ' class="disease-main"'
        : s.is_worpro
          ? ' class="disease-worpro"'
          : '';

      rows += `
      <tr${rowClass}>
        <td>${idx}</td>
        <td class="code">${escapeHtml(s.master_shoubyoumei.code)}${shuushokugoSub}</td>
        <td>${mainBadge}</td>
        <td>${escapeHtml(s.full_text)}${commentText}</td>
        <td>${escapeHtml(s.start_date.wareki.text)}</td>
        <td>${tenkiBadge}</td>
      </tr>`;
    }
  }

  return `
<div class="card">
  <div class="card-title">傷病名</div>
  <div class="card-body">
    <table>
      <tr><th>#</th><th>コード</th><th>主</th><th>傷病名</th><th>開始日</th><th>転帰</th></tr>
      ${rows}
    </table>
  </div>
</div>`;
}

function renderTekiyouCard(receipt: Receipt): string {
  const sections = receipt.tekiyou.shinryou_shikibetsu_sections;
  if (sections.length === 0) return '';

  let rows = '';
  let prevShinkuUpper = '';

  for (const section of sections) {
    const shinkuCode = String(section.shinryou_shikibetsu.code);
    const shinkuUpper = shinkuCode.length > 0 ? shinkuCode[0] : '';
    let isFirstIchirenInSection = true;

    for (const ichiren of section.ichiren_units) {
      let isFirstSanteiInIchiren = true;

      for (const santei of ichiren.santei_units) {
        let isFirstItemInSantei = true;

        for (const item of santei.items) {
          // Determine row separator class
          let separatorClass = '';
          if (isFirstIchirenInSection) {
            if (shinkuUpper !== prevShinkuUpper && prevShinkuUpper !== '') {
              separatorClass = 'row-upper-shinku';
            } else if (rows !== '') {
              separatorClass = 'row-next-shinku';
            }
          } else if (isFirstSanteiInIchiren && !isFirstIchirenInSection) {
            separatorClass = 'row-next-shinku';
          } else if (isFirstItemInSantei && !isFirstSanteiInIchiren) {
            separatorClass = 'row-new-santei';
          }

          const showShinku = isFirstIchirenInSection && isFirstItemInSantei;

          rows += renderTekiyouRow(
            item,
            separatorClass,
            showShinku ? shinkuCode : '',
            isFirstItemInSantei,
            santei.tensuu,
            santei.kaisuu,
          );

          if (isFirstItemInSantei) isFirstItemInSantei = false;
          if (isFirstSanteiInIchiren) isFirstSanteiInIchiren = false;
          if (isFirstIchirenInSection) isFirstIchirenInSection = false;
        }
      }
    }

    prevShinkuUpper = shinkuUpper;
  }

  return `
<div class="card">
  <div class="card-title">摘要欄</div>
  <div class="card-body">
    <table class="tekiyou-table">
      <tr>
        <th>コード</th>
        <th>区</th>
        <th>＊</th>
        <th>明細</th>
        <th style="text-align:right">点数</th>
        <th style="text-align:right">x回数</th>
      </tr>
      ${rows}
    </table>
  </div>
</div>`;
}

function renderTekiyouRow(
  item: TekiyouItem,
  separatorClass: string,
  shinkuCode: string,
  isFirstInSantei: boolean,
  santeiTensuu: number,
  santeiKaisuu: number,
): string {
  const rowClass = separatorClass ? ` class="${separatorClass}"` : '';
  const categoryClass = getCategoryColorClass(item.type);
  const mark = isFirstInSantei ? '<span style="color:#9c27b0;font-weight:bold">＊</span>' : '';

  if (item.type === 'comment') {
    return renderCommentRow(item, rowClass, shinkuCode, mark, categoryClass);
  }

  return renderMedicalRow(
    item,
    rowClass,
    shinkuCode,
    mark,
    categoryClass,
    santeiTensuu,
    santeiKaisuu,
    isFirstInSantei,
  );
}

function renderMedicalRow(
  item: ShinryouKouiItem | IyakuhinItem | TokuteiKizaiItem,
  rowClass: string,
  shinkuCode: string,
  mark: string,
  categoryClass: string,
  santeiTensuu: number,
  santeiKaisuu: number,
  isFirstInSantei: boolean,
): string {
  const code = item.master.code;
  const name =
    item.text.product_name && item.text.product_name !== item.text.master_name
      ? item.text.product_name
      : item.text.master_name;

  const detailParts: string[] = [];
  if (item.text.shiyouryou) detailParts.push(item.text.shiyouryou);
  if (item.text.unit_price) detailParts.push(item.text.unit_price);
  const detailText =
    detailParts.length > 0
      ? ` <span class="text-dim">${escapeHtml(detailParts.join(' '))}</span>`
      : '';

  const tensuuDisplay = isFirstInSantei && santeiTensuu > 0 ? formatNumber(santeiTensuu) : '';
  const kaisuuDisplay = isFirstInSantei && santeiTensuu > 0 ? `x${santeiKaisuu}` : '';

  return `<tr${rowClass}>
    <td class="col-code">${escapeHtml(code)}</td>
    <td class="col-shinku">${escapeHtml(shinkuCode)}</td>
    <td class="col-mark">${mark}</td>
    <td class="col-name ${categoryClass}">${escapeHtml(name)}${detailText}</td>
    <td class="col-tensuu">${tensuuDisplay}</td>
    <td class="col-kaisuu">${kaisuuDisplay}</td>
  </tr>`;
}

function renderCommentRow(
  item: CommentItem,
  rowClass: string,
  shinkuCode: string,
  mark: string,
  categoryClass: string,
): string {
  const code = item.master.code;
  // item.text may be an ItemText object at runtime despite the type declaration
  const text =
    typeof item.text === 'string'
      ? item.text
      : ((item.text as { master_name?: string }).master_name ?? '');
  const appended = item.appended_content
    ? `<span class="appended">${escapeHtml(item.appended_content.text)}</span>`
    : '';

  return `<tr${rowClass}>
    <td class="col-code">${escapeHtml(code)}</td>
    <td class="col-shinku">${escapeHtml(shinkuCode)}</td>
    <td class="col-mark">${mark}</td>
    <td class="col-name ${categoryClass}">${escapeHtml(text)}${appended}</td>
    <td class="col-tensuu"></td>
    <td class="col-kaisuu"></td>
  </tr>`;
}

function renderTensuuShuukeiCard(receipt: Receipt): string {
  const shuukei = receipt.tensuu_shuukei;
  if (!shuukei?.sections) return '';

  const sectionEntries = Object.entries(shuukei.sections);
  if (sectionEntries.length === 0) return '';

  // Collect all hoken keys across all sections
  const hokenKeysSet = new Set<string>();
  for (const [, sec] of sectionEntries) {
    for (const hk of Object.keys(sec.hokens)) {
      hokenKeysSet.add(hk);
    }
  }
  const hokenKeys = Array.from(hokenKeysSet);
  if (hokenKeys.length === 0) return '';

  // Header row
  let header = '<tr><th style="text-align:left">区分</th>';
  for (const hk of hokenKeys) {
    header += `<th>${escapeHtml(hk)} 点数</th><th>${escapeHtml(hk)} 回数</th>`;
  }
  header += '</tr>';

  // Data rows - skip sections where all hokens are null/0
  let dataRows = '';
  for (const [sectionKey, sec] of sectionEntries) {
    let hasData = false;
    for (const hk of hokenKeys) {
      const h = sec.hokens[hk];
      if (h && (h.tensuu || h.total_kaisuu)) {
        hasData = true;
        break;
      }
    }
    if (!hasData) continue;

    dataRows += `<tr><td style="text-align:left">${escapeHtml(sectionKey)}</td>`;
    for (const hk of hokenKeys) {
      const h = sec.hokens[hk];
      if (h) {
        dataRows += `<td>${h.tensuu != null ? formatNumber(h.tensuu) : ''}</td>`;
        dataRows += `<td>${h.total_kaisuu != null ? formatNumber(h.total_kaisuu) : ''}</td>`;
      } else {
        dataRows += '<td></td><td></td>';
      }
    }
    dataRows += '</tr>';
  }

  if (!dataRows) return '';

  return `
<div class="card">
  <div class="card-title">点数集計</div>
  <div class="card-body">
    <table class="shuukei-table">
      ${header}
      ${dataRows}
    </table>
  </div>
</div>`;
}

function renderKyuufuCard(receipt: Receipt): string {
  const k = receipt.ryouyou_no_kyuufu;
  const ih = k.iryou_hoken;

  // Only show food/living therapy data - main stats are in hoken card now
  const rows: string[] = [];

  if (ih) {
    if (ih.shokuji_seikatsu_ryouyou_kaisuu != null && ih.shokuji_seikatsu_ryouyou_kaisuu > 0) {
      rows.push(
        `<tr><th>食事・生活療養回数</th><td class="num">${formatNumber(ih.shokuji_seikatsu_ryouyou_kaisuu)}回</td></tr>`,
      );
    }
    if (
      ih.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
      ih.shokuji_seikatsu_ryouyou_goukei_kingaku > 0
    ) {
      rows.push(
        `<tr><th>食事・生活療養合計金額</th><td class="num">${formatNumber(ih.shokuji_seikatsu_ryouyou_goukei_kingaku)}円</td></tr>`,
      );
    }
    if (ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0) {
      rows.push(
        `<tr><th>食事・生活療養標準負担額</th><td class="num">${formatNumber(ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku)}円</td></tr>`,
      );
    }
  }

  // Check kouhi for food/living data too
  for (let i = 0; i < k.kouhi_futan_iryous.length; i++) {
    const rk = k.kouhi_futan_iryous[i];
    if (rk.shokuji_seikatsu_ryouyou_kaisuu != null && rk.shokuji_seikatsu_ryouyou_kaisuu > 0) {
      rows.push(
        `<tr><th>公費${i + 1} 食事・生活療養回数</th><td class="num">${formatNumber(rk.shokuji_seikatsu_ryouyou_kaisuu)}回</td></tr>`,
      );
    }
    if (
      rk.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
      rk.shokuji_seikatsu_ryouyou_goukei_kingaku > 0
    ) {
      rows.push(
        `<tr><th>公費${i + 1} 食事・生活療養合計金額</th><td class="num">${formatNumber(rk.shokuji_seikatsu_ryouyou_goukei_kingaku)}円</td></tr>`,
      );
    }
  }

  if (rows.length === 0) return '';

  return `
<div class="card">
  <div class="card-title">食事・生活療養</div>
  <div class="card-body">
    <table>
      ${rows.join('\n      ')}
    </table>
  </div>
</div>`;
}
