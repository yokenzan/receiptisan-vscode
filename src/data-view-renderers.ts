import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CliError } from './cli';
import type {
  CommentItem,
  DailyKaisuu,
  DigitalizedReceipt,
  IyakuhinItem,
  Receipt,
  ReceiptisanJsonOutput,
  ShinryouKouiItem,
  ShinryouShikibetsuSection,
  ShoubyoumeiGroup,
  TekiyouItem,
  TokuteiKizaiItem,
  Wareki,
} from './types';

/** 摘要欄テーブルの列構成モード */
interface TekiyouLayout {
  /** horizontal: コード・診区・負担区分あり + 全日カレンダー, compact: 診区あり + 算定日のみ */
  mode: 'horizontal' | 'compact';
  activeDays: number[];
  /** compact モードでのカレンダー最低列数（「算定日」ヘッダの見切れ防止） */
  minCalCols: number;
  year: number;
  month: number;
  /** horizontal mode only: 保険スロットの有効/無効 [保, 公1, 公2, 公3, 公4] */
  futanSlots: boolean[];
  normalizeAscii: boolean;
}

export interface DataViewRenderOptions {
  normalizeTekiyouAscii?: boolean;
}

// --- 負担区分 helpers ---

/** 負担区分コード → ビットマスク (左から 医保, 公1, 公2, 公3, 公4) */
const FUTAN_KUBUN_MAP: Record<string, number> = {
  // 1者
  '1': 0b10000,
  '5': 0b01000,
  '6': 0b00100,
  B: 0b00010,
  C: 0b00001,
  // 2者
  '2': 0b11000,
  '3': 0b10100,
  E: 0b10010,
  G: 0b10001,
  '7': 0b01100,
  H: 0b01010,
  I: 0b01001,
  J: 0b00110,
  K: 0b00101,
  L: 0b00011,
  // 3者
  '4': 0b11100,
  M: 0b11010,
  N: 0b11001,
  O: 0b10110,
  P: 0b10101,
  Q: 0b10011,
  R: 0b01110,
  S: 0b01101,
  T: 0b01011,
  U: 0b00111,
  // 4者
  V: 0b11110,
  W: 0b11101,
  X: 0b11011,
  Y: 0b10111,
  Z: 0b01111,
  // 5者
  '9': 0b11111,
};

const FUTAN_SLOT_BITS = [0b10000, 0b01000, 0b00100, 0b00010, 0b00001];
const FUTAN_LABELS = ['保', '公1', '公2', '公3', '公4'];

function decodeFutanKubun(code: string): boolean[] {
  const bits = FUTAN_KUBUN_MAP[code] ?? 0;
  return FUTAN_SLOT_BITS.map((mask) => (bits & mask) !== 0);
}

const cssContent = fs.readFileSync(path.join(__dirname, 'data-view.css'), 'utf-8');

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

function toHalfWidthAscii(text: string): string {
  return text
    .replace(/\u3000/g, ' ')
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

function normalizeTekiyouText(text: string, enabled: boolean): string {
  return enabled ? toHalfWidthAscii(text) : text;
}

function renderTekiyouTextWithParenStyle(text: string, normalizeAscii: boolean): string {
  const normalized = normalizeTekiyouText(text, normalizeAscii);
  const chunks: Array<{ text: string; parenthetical: boolean }> = [];
  let normalBuf = '';
  let parenBuf = '';
  const stack: string[] = [];

  const flushNormal = (): void => {
    if (normalBuf.length > 0) {
      chunks.push({ text: normalBuf, parenthetical: false });
      normalBuf = '';
    }
  };
  const flushParenAsNormal = (): void => {
    if (parenBuf.length > 0) {
      normalBuf += parenBuf;
      parenBuf = '';
    }
  };

  for (const ch of normalized) {
    const isOpen = ch === '(' || ch === '（';
    const isClose = ch === ')' || ch === '）';

    if (stack.length === 0) {
      if (isOpen) {
        flushNormal();
        stack.push(ch);
        parenBuf += ch;
      } else {
        normalBuf += ch;
      }
      continue;
    }

    parenBuf += ch;
    if (isOpen) {
      stack.push(ch);
      continue;
    }
    if (!isClose) continue;

    const expectedOpen = ch === ')' ? '(' : '（';
    const top = stack[stack.length - 1];
    if (top === expectedOpen) {
      stack.pop();
    } else if (stack.length > 0) {
      stack.pop();
    }

    if (stack.length === 0) {
      chunks.push({ text: parenBuf, parenthetical: true });
      parenBuf = '';
    }
  }

  if (stack.length > 0) flushParenAsNormal();
  flushNormal();

  return chunks
    .map((chunk) =>
      chunk.parenthetical
        ? `<span class="tekiyou-paren-compact">${escapeHtml(chunk.text)}</span>`
        : escapeHtml(chunk.text),
    )
    .join('');
}

function formatTokuteiKizaiUnitPrice(text: string): string {
  const normalized = toHalfWidthAscii(text);
  return normalized.replace(/-?\d[\d,]*/g, (token) => {
    const raw = token.replace(/,/g, '');
    if (!/^-?\d+$/.test(raw)) return token;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value.toLocaleString() : token;
  });
}

function formatWarekiShort(wareki: Wareki): string {
  const base = `${wareki.gengou.alphabet}${wareki.year}.${wareki.month}`;
  if (wareki.day != null) return `${base}.${wareki.day}`;
  return base;
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

function renderNyuugaiTag(nyuugai: string): string {
  if (nyuugai === 'nyuuin') {
    return '<span class="tag tag-nyuuin">入院</span>';
  }
  return '<span class="tag tag-gairai">外来</span>';
}

function buildReceiptLabel(receipt: Receipt): string {
  const patient = receipt.patient;
  const idPart = String(receipt.id).padStart(4, '0');
  const shinryouYm = escapeHtml(formatWarekiShort(receipt.shinryou_ym.wareki));
  const nyuugaiLabel = receipt.nyuugai === 'nyuuin' ? '入院' : '外来';
  const patientId = patient.id ?? '';
  return `No.${idPart} - ${shinryouYm}診療 ${nyuugaiLabel} ${escapeHtml(patientId)} ${escapeHtml(patient.name)}`;
}

// --- Calendar helpers ---

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getDailyKaisuu(
  dailyKaisuus: DailyKaisuu[] | undefined,
  year: number,
  month: number,
  day: number,
): number {
  if (!dailyKaisuus) return 0;
  const entry = dailyKaisuus.find(
    (dk) => dk.date.year === year && dk.date.month === month && dk.date.day === day,
  );
  return entry?.kaisuu ?? 0;
}

function renderCalendarHeaders(year: number, month: number): string {
  const daysInMonth = getDaysInMonth(year, month);
  let headers = '';
  for (let day = 1; day <= daysInMonth; day++) {
    const classes: string[] = ['col-cal'];
    if (day === 1) classes.push('cal-month-start');
    const dow = getDayOfWeek(year, month, day);
    if (dow === 2 || dow === 4) classes.push('cal-tue-thu');
    if (dow === 0) classes.push('cal-sun');
    else if (dow === 6) classes.push('cal-sat');
    if (day % 5 === 1 && day > 1) classes.push('cal-5day-border');
    headers += `<th class="${classes.join(' ')}">${day}</th>`;
  }
  return headers;
}

function renderCalendarCells(
  dailyKaisuus: DailyKaisuu[] | undefined,
  showDailyKaisuu: boolean,
  year: number,
  month: number,
): string {
  const daysInMonth = getDaysInMonth(year, month);
  let cells = '';
  for (let day = 1; day <= daysInMonth; day++) {
    const classes: string[] = ['col-cal'];
    if (day === 1) classes.push('cal-month-start');
    const dow = getDayOfWeek(year, month, day);
    if (dow === 2 || dow === 4) classes.push('cal-tue-thu');
    if (dow === 0) classes.push('cal-sun');
    else if (dow === 6) classes.push('cal-sat');
    if (day % 5 === 1 && day > 1) classes.push('cal-5day-border');
    const count = showDailyKaisuu ? getDailyKaisuu(dailyKaisuus, year, month, day) : 0;
    const display = count > 0 ? String(count) : '';
    cells += `<td class="${classes.join(' ')}">${display}</td>`;
  }
  return cells;
}

// --- Compact calendar helpers (vertical mode) ---

function collectActiveDays(sections: ShinryouShikibetsuSection[]): number[] {
  const days = new Set<number>();
  for (const section of sections) {
    for (const ichiren of section.ichiren_units) {
      for (const santei of ichiren.santei_units) {
        if (santei.daily_kaisuus) {
          for (const dk of santei.daily_kaisuus) {
            if (dk.kaisuu > 0) {
              days.add(dk.date.day);
            }
          }
        }
      }
    }
  }
  return Array.from(days).sort((a, b) => a - b);
}

function renderCompactCalendarHeaders(activeDays: number[], year: number, month: number): string {
  let headers = '';
  for (const day of activeDays) {
    const classes: string[] = ['col-cal'];
    const dow = getDayOfWeek(year, month, day);
    if (dow === 2 || dow === 4) classes.push('cal-tue-thu');
    if (dow === 0) classes.push('cal-sun');
    else if (dow === 6) classes.push('cal-sat');
    headers += `<th class="${classes.join(' ')}">${day}</th>`;
  }
  return headers;
}

function renderCompactCalendarCells(
  dailyKaisuus: DailyKaisuu[] | undefined,
  showDailyKaisuu: boolean,
  activeDays: number[],
  minCols: number,
  year: number,
  month: number,
): string {
  let cells = '';
  for (const day of activeDays) {
    const classes: string[] = ['col-cal'];
    const dow = getDayOfWeek(year, month, day);
    if (dow === 2 || dow === 4) classes.push('cal-tue-thu');
    if (dow === 0) classes.push('cal-sun');
    else if (dow === 6) classes.push('cal-sat');
    const count = showDailyKaisuu ? getDailyKaisuu(dailyKaisuus, year, month, day) : 0;
    const display = count > 0 ? String(count) : '';
    cells += `<td class="${classes.join(' ')}">${display}</td>`;
  }
  // 最低列数に満たない場合は空セルで埋める
  for (let i = activeDays.length; i < minCols; i++) {
    cells += '<td class="col-cal"></td>';
  }
  return cells;
}

// --- 負担区分 column rendering ---

function renderFutanKubunHeaders(futanSlots: boolean[]): string {
  return futanSlots
    .map((active, i) => {
      const inactiveClass = active ? '' : ' futan-inactive';
      const leftClass = i === 0 ? ' futan-outer-left' : '';
      const rightClass = i === futanSlots.length - 1 ? ' futan-outer-right' : '';
      return `<th class="col-futan${inactiveClass}${leftClass}${rightClass}">${FUTAN_LABELS[i]}</th>`;
    })
    .join('');
}

function renderFutanKubunCells(
  futanKubun: string,
  showFutanKubun: boolean,
  futanSlots: boolean[],
): string {
  const decoded = showFutanKubun ? decodeFutanKubun(futanKubun) : [];
  return futanSlots
    .map((slotActive, i) => {
      const inactiveClass = slotActive ? '' : ' futan-inactive';
      const leftClass = i === 0 ? ' futan-outer-left' : '';
      const rightClass = i === futanSlots.length - 1 ? ' futan-outer-right' : '';
      const mark = showFutanKubun && decoded[i] ? '●' : '';
      return `<td class="col-futan${inactiveClass}${leftClass}${rightClass}">${mark}</td>`;
    })
    .join('');
}

// --- Render functions ---

function renderUkeHeader(dr: DigitalizedReceipt): string {
  const hospitalName = escapeHtml(dr.hospital.name ?? dr.hospital.code);
  const detailParts: string[] = [];
  if (dr.hospital.location) detailParts.push(escapeHtml(dr.hospital.location));
  if (dr.hospital.tel) detailParts.push(`TEL: ${escapeHtml(dr.hospital.tel)}`);

  return `
<div class="uke-header">
  <div class="uke-header-title">${hospitalName}</div>
  <div class="uke-header-detail">
    <span>${escapeHtml(formatWarekiShort(dr.seikyuu_ym.wareki))}請求</span>
    <span>${escapeHtml(dr.audit_payer.name)}</span>
    <span>${escapeHtml(dr.prefecture.name)}</span>
  </div>
  ${detailParts.length > 0 ? `<div class="uke-header-detail"><span>${detailParts.join('</span><span>')}</span></div>` : ''}
</div>`;
}

function renderReceipt(
  receipt: Receipt,
  id: string,
  layoutMode: string,
  options: DataViewRenderOptions,
): string {
  const headerText = buildReceiptLabel(receipt);
  const showCalendar = layoutMode === 'horizontal';

  return `
<div id="${id}" class="receipt-section">
  <div class="receipt-header">${headerText}</div>
  ${renderReceiptHeader(receipt)}
  ${renderPatientCard(receipt)}
  ${renderHokenCard(receipt)}
  ${renderKyuufuCard(receipt)}
  ${renderShoubyoumeiCard(receipt.shoubyoumeis)}
  ${renderTekiyouCard(receipt, showCalendar, options)}
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

  const nyuuinDateCell =
    receipt.nyuugai === 'nyuuin' && receipt.nyuuin_date
      ? escapeHtml(formatWarekiShort(receipt.nyuuin_date.wareki))
      : '';
  const byoushouCell =
    receipt.nyuugai === 'nyuuin' && receipt.byoushou_types.length > 0
      ? receipt.byoushou_types.map((b) => escapeHtml(b.short_name)).join('、')
      : '';

  return `
<div class="card receipt-info-card">
  <div class="card-body">
    <table class="receipt-info-table">
      <tr>
        <th colspan="4">No. <strong>${receipt.id}</strong></th>
      </tr>
      <tr>
        <th>診療年月</th>
        <td>${escapeHtml(formatWarekiShort(receipt.shinryou_ym.wareki))}診療</td>
        <th>入外</th>
        <td>${renderNyuugaiTag(receipt.nyuugai)}</td>
      </tr>
      <tr>
        <th>種別</th>
        <td>${typeBadges}</td>
        ${nyuuinDateCell ? `<th>入院日</th><td>${nyuuinDateCell}</td>` : '<td></td><td></td>'}
      </tr>
      <tr>
        <th>特記事項</th>
        <td>${tokkiBadges}</td>
        ${byoushouCell ? `<th>病棟</th><td>${byoushouCell}</td>` : '<td></td><td></td>'}
      </tr>
    </table>
  </div>
</div>`;
}

function renderPatientCard(receipt: Receipt): string {
  const p = receipt.patient;
  const sexTag =
    String(p.sex.code) === '1'
      ? `<span class="tag tag-sex-male">${escapeHtml(p.sex.name)}</span>`
      : String(p.sex.code) === '2'
        ? `<span class="tag tag-sex-female">${escapeHtml(p.sex.name)}</span>`
        : escapeHtml(p.sex.name);

  return `
<div class="card card-patient">
  <div class="card-title">患者情報</div>
  <div class="card-body">
    <table>
      <tr><th>患者番号</th><td>${escapeHtml(p.id)}</td></tr>
      <tr><th>氏名</th><td>${p.name_kana ? `<ruby>${escapeHtml(p.name)}<rp>（</rp><rt>${escapeHtml(p.name_kana)}</rt><rp>）</rp></ruby>` : escapeHtml(p.name)}</td></tr>
      <tr><th>性別</th><td>${sexTag}</td></tr>
      <tr><th>生年月日</th><td>${escapeHtml(formatWarekiShort(p.birth_date.wareki))}</td></tr>
    </table>
  </div>
</div>`;
}

function renderHokenCard(receipt: Receipt): string {
  const h = receipt.hokens;
  const ih = h.iryou_hoken;
  const k = receipt.ryouyou_no_kyuufu;

  if (!ih && h.kouhi_futan_iryous.length === 0) return '';

  let rows = '';
  const detailParts: string[] = [];

  if (ih) {
    const kih = k.iryou_hoken;
    const shikakuParts = [ih.kigou, ih.bangou, ih.edaban].filter((v) => v != null);
    const shikakuBangou = shikakuParts.join('・');

    rows += `<tr>
      <td>医療保険</td>
      <td class="code">${escapeHtml(ih.hokenja_bangou)}</td>
      <td>${escapeHtml(shikakuBangou)}</td>
      <td class="num">${kih ? `${kih.shinryou_jitsunissuu}日` : ''}</td>
      <td class="num">${kih ? `${formatNumber(kih.goukei_tensuu)}点` : ''}</td>
      <td class="num"></td>
      <td class="num">${kih?.ichibu_futankin != null ? `${formatNumber(kih.ichibu_futankin)}円` : ''}</td>
    </tr>`;

    if (ih.kyuufu_wariai != null) detailParts.push(`給付割合: ${ih.kyuufu_wariai}%`);
    if (ih.teishotoku_type) detailParts.push(`低所得: ${escapeHtml(ih.teishotoku_type)}`);
  }

  for (let i = 0; i < h.kouhi_futan_iryous.length; i++) {
    const kouhi = h.kouhi_futan_iryous[i];
    const rk = k.kouhi_futan_iryous[i];
    rows += `<tr>
      <td>公費${i + 1}</td>
      <td class="code">${escapeHtml(kouhi.futansha_bangou)}</td>
      <td>${escapeHtml(kouhi.jukyuusha_bangou)}</td>
      <td class="num">${rk ? `${rk.shinryou_jitsunissuu}日` : ''}</td>
      <td class="num">${rk ? `${formatNumber(rk.goukei_tensuu)}点` : ''}</td>
      <td class="num">${rk?.kyuufu_taishou_ichibu_futankin != null ? `(${formatNumber(rk.kyuufu_taishou_ichibu_futankin)}円)` : ''}</td>
      <td class="num">${rk?.ichibu_futankin != null ? `${formatNumber(rk.ichibu_futankin)}円` : ''}</td>
    </tr>`;
  }

  const detailRow =
    detailParts.length > 0
      ? `<div class="hoken-detail">${detailParts.map((p) => `<span>${p}</span>`).join('')}</div>`
      : '';

  return `
<div class="card card-hoken">
  <div class="card-title">保険情報</div>
  <div class="card-body">
    <table class="hoken-integrated-table">
      <colgroup>
        <col class="col-kubun" />
        <col class="col-jigyousha" />
        <col class="col-shikaku" />
        <col class="col-jitsunissuu" />
        <col class="col-tensuu" />
        <col class="col-kyuufu-futankin" />
        <col class="col-futankin" />
      </colgroup>
      <tr>
        <th>区分</th>
        <th>事業者番号</th>
        <th>資格番号</th>
        <th>実日数</th>
        <th>請求点数</th>
        <th>給付対象負担金</th>
        <th>負担金</th>
      </tr>
      ${rows}
    </table>
    ${detailRow}
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
      const utagaiBadge = s.master_shuushokugos.some((m) => String(m.code) === '8002')
        ? '<span class="tag tag-utagai">疑</span>'
        : '';
      const worproBadge = s.is_worpro === true ? '<span class="tag tag-worpro">未</span>' : '';
      const tenkiClass = getTenkiColorClass(s.tenki.code);
      const tenkiBadge = `<span class="tag ${tenkiClass}">${escapeHtml(s.tenki.name)}</span>`;

      const shuushokugoSub =
        s.master_shuushokugos.length > 0
          ? `<br/><span class="sub-code">${s.master_shuushokugos.map((m) => escapeHtml(m.code)).join(' ')}</span>`
          : '';

      const commentText = s.comment
        ? ` <span class="text-dim">（${escapeHtml(s.comment)}）</span>`
        : '';

      const diseaseClasses: string[] = [];
      if (s.is_main) diseaseClasses.push('disease-main');
      if (s.is_worpro) diseaseClasses.push('disease-worpro');
      const rowClass = diseaseClasses.length > 0 ? ` class="${diseaseClasses.join(' ')}"` : '';

      rows += `
      <tr${rowClass}>
        <td>${idx}</td>
        <td class="code">${escapeHtml(s.master_shoubyoumei.code)}${shuushokugoSub}</td>
        <td>${mainBadge}</td>
        <td>${utagaiBadge}</td>
        <td>${worproBadge}</td>
        <td>${escapeHtml(s.full_text)}${commentText}</td>
        <td>${escapeHtml(formatWarekiShort(s.start_date.wareki))}</td>
        <td>${tenkiBadge}</td>
      </tr>`;
    }
  }

  return `
<div class="card card-shoubyoumei">
  <div class="card-title">傷病名</div>
  <div class="card-body">
    <table class="shoubyoumei-table">
      <colgroup>
        <col class="col-idx" />
        <col class="col-code" />
        <col class="col-main-badge" />
        <col class="col-utagai-badge" />
        <col class="col-worpro-badge" />
        <col class="col-name" />
        <col class="col-start-date" />
        <col class="col-tenki" />
      </colgroup>
      <tr><th>#</th><th>コード</th><th>主</th><th>疑</th><th>ワープロ</th><th>傷病名</th><th>開始日</th><th>転帰</th></tr>
      ${rows}
    </table>
  </div>
</div>`;
}

function renderTekiyouCard(
  receipt: Receipt,
  showCalendar: boolean,
  options: DataViewRenderOptions,
): string {
  const sections = receipt.tekiyou.shinryou_shikibetsu_sections;
  if (sections.length === 0) return '';

  const year = receipt.shinryou_ym.year;
  const month = receipt.shinryou_ym.month;

  // レイアウトモード決定
  const activeDays = collectActiveDays(sections);
  const MIN_CAL_COLS = 2;
  // 保険スロットの有効/無効判定
  const futanSlots: boolean[] = [
    receipt.hokens.iryou_hoken != null,
    receipt.hokens.kouhi_futan_iryous.length >= 1,
    receipt.hokens.kouhi_futan_iryous.length >= 2,
    receipt.hokens.kouhi_futan_iryous.length >= 3,
    receipt.hokens.kouhi_futan_iryous.length >= 4,
  ];

  const layout: TekiyouLayout = showCalendar
    ? {
        mode: 'horizontal',
        activeDays,
        minCalCols: 0,
        year,
        month,
        futanSlots,
        normalizeAscii: options.normalizeTekiyouAscii ?? false,
      }
    : {
        mode: 'compact',
        activeDays,
        minCalCols: MIN_CAL_COLS,
        year,
        month,
        futanSlots,
        normalizeAscii: options.normalizeTekiyouAscii ?? false,
      };

  let rows = '';
  let prevShinkuUpper = '';

  for (const section of sections) {
    const shinkuCode = String(section.shinryou_shikibetsu.code);
    const shinkuUpper = shinkuCode.length > 0 ? shinkuCode[0] : '';
    let isFirstIchirenInSection = true;

    for (const ichiren of section.ichiren_units) {
      let isFirstSanteiInIchiren = true;
      let isFirstItemInIchiren = true;

      for (const santei of ichiren.santei_units) {
        let isFirstItemInSantei = true;
        const lastNonCommentIdx = santei.items.reduce(
          (lastIdx, item, idx) => (item.type !== 'comment' ? idx : lastIdx),
          -1,
        );

        for (let itemIdx = 0; itemIdx < santei.items.length; itemIdx++) {
          const item = santei.items[itemIdx];
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
          const isLastNonComment = itemIdx === lastNonCommentIdx;

          rows += renderTekiyouRow(
            item,
            separatorClass,
            showShinku ? shinkuCode : '',
            isFirstItemInSantei,
            isLastNonComment,
            santei.tensuu,
            santei.kaisuu,
            santei.daily_kaisuus,
            layout,
            ichiren.futan_kubun,
            isFirstItemInIchiren,
          );

          if (isFirstItemInSantei) isFirstItemInSantei = false;
          if (isFirstSanteiInIchiren) isFirstSanteiInIchiren = false;
          if (isFirstIchirenInSection) isFirstIchirenInSection = false;
          if (isFirstItemInIchiren) isFirstItemInIchiren = false;
        }
      }
    }

    prevShinkuUpper = shinkuUpper;
  }

  // 列幅定数（CSS の col width と一致させる）
  const COL_W_H = {
    code: 66,
    shinku: 29,
    futan: 20,
    mark: 18,
    name: 290,
    tensuu: 68,
    timesSign: 14,
    kaisuu: 36,
    cal: 20,
  };
  const COL_W_C = {
    shinku: 29,
    futanCode: 24,
    mark: 18,
    name: 290,
    tensuu: 68,
    timesSign: 14,
    kaisuu: 36,
    cal: 20,
  };

  if (layout.mode === 'horizontal') {
    const daysInMonth = getDaysInMonth(year, month);
    const futanWidth = 5 * COL_W_H.futan;
    const baseWidth =
      COL_W_H.code +
      COL_W_H.shinku +
      futanWidth +
      COL_W_H.mark +
      COL_W_H.name +
      COL_W_H.tensuu +
      COL_W_H.timesSign +
      COL_W_H.kaisuu;
    const tableWidth = baseWidth + daysInMonth * COL_W_H.cal;
    const calendarCols = '<col class="col-cal" />'.repeat(daysInMonth);
    const futanColgroup = '<col class="col-futan" />'.repeat(5);

    return `
<div class="card">
  <div class="card-title">摘要欄</div>
  <div class="card-body tekiyou-scroll-container">
    <table class="tekiyou-table" style="width: ${tableWidth}px">
      <colgroup>
        <col class="col-code" />
        <col class="col-shinku" />
        ${futanColgroup}
        <col class="col-mark" />
        <col class="col-name" />
        <col class="col-tensuu" />
        <col class="col-times-sign" />
        <col class="col-kaisuu" />
        ${calendarCols}
      </colgroup>
      <tr>
        <th>コード</th>
        <th>診区</th>
        ${renderFutanKubunHeaders(futanSlots)}
        <th>＊</th>
        <th>明細</th>
        <th style="text-align:right">点数</th>
        <th class="col-times-sign"></th>
        <th style="text-align:right">回数</th>
        ${renderCalendarHeaders(year, month)}
      </tr>
      ${rows}
    </table>
  </div>
</div>`;
  }

  // compact mode (vertical split)
  // 「算定日」ヘッダが見切れないよう最低列数を確保
  const numCalCols = Math.max(activeDays.length, layout.minCalCols);
  const baseWidth =
    COL_W_C.shinku +
    COL_W_C.futanCode +
    COL_W_C.mark +
    COL_W_C.name +
    COL_W_C.tensuu +
    COL_W_C.timesSign +
    COL_W_C.kaisuu;
  const tableWidth = baseWidth + numCalCols * COL_W_C.cal;
  const calendarCols = '<col class="col-cal" />'.repeat(numCalCols);
  const padCols = numCalCols - activeDays.length;

  return `
<div class="card">
  <div class="card-title">摘要欄</div>
  <div class="card-body tekiyou-scroll-container">
    <table class="tekiyou-table tekiyou-compact" style="width: ${tableWidth}px">
      <colgroup>
        <col class="col-shinku" />
        <col class="col-futan-code" />
        <col class="col-mark" />
        <col class="col-name" />
        <col class="col-tensuu" />
        <col class="col-times-sign" />
        <col class="col-kaisuu" />
        ${calendarCols}
      </colgroup>
      <tr>
        <th rowspan="2">診区</th>
        <th rowspan="2">負担区分</th>
        <th rowspan="2">＊</th>
        <th rowspan="2">明細</th>
        <th rowspan="2" style="text-align:right">点数</th>
        <th rowspan="2" class="col-times-sign"></th>
        <th rowspan="2" style="text-align:right">回数</th>
        <th colspan="${numCalCols}" class="col-cal-group">算定日</th>
      </tr>
      <tr>
        ${renderCompactCalendarHeaders(activeDays, year, month)}
        ${padCols > 0 ? '<th class="col-cal"></th>'.repeat(padCols) : ''}
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
  isLastNonComment: boolean,
  santeiTensuu: number,
  santeiKaisuu: number,
  dailyKaisuus: DailyKaisuu[] | undefined,
  layout: TekiyouLayout,
  futanKubun: string,
  showFutanKubun: boolean,
): string {
  const rowClass = separatorClass ? ` class="${separatorClass}"` : '';
  const categoryClass = getCategoryColorClass(item.type);
  const mark = isFirstInSantei ? '<span style="color:#9c27b0;font-weight:bold">＊</span>' : '';

  if (item.type === 'comment') {
    return renderCommentRow(
      item,
      rowClass,
      shinkuCode,
      mark,
      categoryClass,
      dailyKaisuus,
      isLastNonComment,
      layout,
      futanKubun,
      showFutanKubun,
    );
  }

  return renderMedicalRow(
    item,
    rowClass,
    shinkuCode,
    mark,
    categoryClass,
    santeiTensuu,
    santeiKaisuu,
    isLastNonComment,
    dailyKaisuus,
    layout,
    futanKubun,
    showFutanKubun,
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
  isLastNonComment: boolean,
  dailyKaisuus: DailyKaisuu[] | undefined,
  layout: TekiyouLayout,
  futanKubun: string,
  showFutanKubun: boolean,
): string {
  const code = item.master.code;
  const name =
    item.text.product_name && item.text.product_name !== item.text.master_name
      ? item.text.product_name
      : item.text.master_name;
  const styledNameHtml = renderTekiyouTextWithParenStyle(name, layout.normalizeAscii);

  const isUnknown = item.text.master_name.startsWith('【不明な');
  const unknownClass = isUnknown ? ' item-unknown' : '';

  const detailParts: string[] = [];
  if (item.text.shiyouryou) detailParts.push(item.text.shiyouryou);
  if (item.text.unit_price) {
    detailParts.push(
      item.type === 'tokutei_kizai'
        ? formatTokuteiKizaiUnitPrice(item.text.unit_price)
        : item.text.unit_price,
    );
  }
  const detailTextHtml = detailParts
    .map((part) => renderTekiyouTextWithParenStyle(part, layout.normalizeAscii))
    .join(' ');
  const detailText =
    detailTextHtml.length > 0 ? ` <span class="text-dim">${detailTextHtml}</span>` : '';

  const tensuuDisplay = isLastNonComment && santeiTensuu > 0 ? formatNumber(santeiTensuu) : '';
  const timesSignDisplay = isLastNonComment && santeiTensuu > 0 ? 'x' : '';
  const kaisuuDisplay = isLastNonComment && santeiTensuu > 0 ? String(santeiKaisuu) : '';

  const calendarCells =
    layout.mode === 'horizontal'
      ? renderCalendarCells(dailyKaisuus, isLastNonComment, layout.year, layout.month)
      : renderCompactCalendarCells(
          dailyKaisuus,
          isLastNonComment,
          layout.activeDays,
          layout.minCalCols,
          layout.year,
          layout.month,
        );

  if (layout.mode === 'compact') {
    const futanCodeDisplay = showFutanKubun ? escapeHtml(futanKubun) : '';
    return `<tr${rowClass}>
    <td class="col-shinku">${escapeHtml(shinkuCode)}</td>
    <td class="col-futan-code">${futanCodeDisplay}</td>
    <td class="col-mark">${mark}</td>
    <td class="col-name ${categoryClass}${unknownClass}">${styledNameHtml}${detailText}</td>
    <td class="col-tensuu">${tensuuDisplay}</td>
    <td class="col-times-sign">${timesSignDisplay}</td>
    <td class="col-kaisuu">${kaisuuDisplay}</td>
    ${calendarCells}
  </tr>`;
  }

  const futanCells = renderFutanKubunCells(futanKubun, showFutanKubun, layout.futanSlots);

  return `<tr${rowClass}>
    <td class="col-code">${escapeHtml(code)}</td>
    <td class="col-shinku">${escapeHtml(shinkuCode)}</td>
    ${futanCells}
    <td class="col-mark">${mark}</td>
    <td class="col-name ${categoryClass}${unknownClass}">${styledNameHtml}${detailText}</td>
    <td class="col-tensuu">${tensuuDisplay}</td>
    <td class="col-times-sign">${timesSignDisplay}</td>
    <td class="col-kaisuu">${kaisuuDisplay}</td>
    ${calendarCells}
  </tr>`;
}

function renderCommentRow(
  item: CommentItem,
  rowClass: string,
  shinkuCode: string,
  mark: string,
  categoryClass: string,
  dailyKaisuus: DailyKaisuu[] | undefined,
  isLastNonComment: boolean,
  layout: TekiyouLayout,
  futanKubun: string,
  showFutanKubun: boolean,
): string {
  const code = item.master.code;
  const text =
    typeof item.text === 'string'
      ? item.text
      : ((item.text as { master_name?: string }).master_name ?? '');
  const styledTextHtml = renderTekiyouTextWithParenStyle(text, layout.normalizeAscii);

  const calendarCells =
    layout.mode === 'horizontal'
      ? renderCalendarCells(dailyKaisuus, isLastNonComment, layout.year, layout.month)
      : renderCompactCalendarCells(
          dailyKaisuus,
          isLastNonComment,
          layout.activeDays,
          layout.minCalCols,
          layout.year,
          layout.month,
        );

  if (layout.mode === 'compact') {
    const futanCodeDisplay = showFutanKubun ? escapeHtml(futanKubun) : '';
    return `<tr${rowClass}>
    <td class="col-shinku">${escapeHtml(shinkuCode)}</td>
    <td class="col-futan-code">${futanCodeDisplay}</td>
    <td class="col-mark">${mark}</td>
    <td class="col-name ${categoryClass}">${styledTextHtml}</td>
    <td class="col-tensuu"></td>
    <td class="col-times-sign"></td>
    <td class="col-kaisuu"></td>
    ${calendarCells}
  </tr>`;
  }

  const futanCells = renderFutanKubunCells(futanKubun, showFutanKubun, layout.futanSlots);

  return `<tr${rowClass}>
    <td class="col-code">${escapeHtml(code)}</td>
    <td class="col-shinku">${escapeHtml(shinkuCode)}</td>
    ${futanCells}
    <td class="col-mark">${mark}</td>
    <td class="col-name ${categoryClass}">${styledTextHtml}</td>
    <td class="col-tensuu"></td>
    <td class="col-times-sign"></td>
    <td class="col-kaisuu"></td>
    ${calendarCells}
  </tr>`;
}

function renderTensuuShuukeiCard(receipt: Receipt): string {
  const shuukei = receipt.tensuu_shuukei;
  if (!shuukei?.sections) return '';

  const sectionEntries = Object.entries(shuukei.sections);
  if (sectionEntries.length === 0) return '';

  const hokenKeysSet = new Set<string>();
  for (const [, sec] of sectionEntries) {
    for (const hk of Object.keys(sec.hokens)) {
      hokenKeysSet.add(hk);
    }
  }
  const hokenKeys = Array.from(hokenKeysSet);
  if (hokenKeys.length === 0) return '';

  let header = '<tr><th style="text-align:left">区分</th>';
  for (const hk of hokenKeys) {
    header += `<th>${escapeHtml(hk)} 点数</th><th>${escapeHtml(hk)} 回数</th>`;
  }
  header += '</tr>';

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

  const hasIh =
    ih &&
    ((ih.shokuji_seikatsu_ryouyou_kaisuu != null && ih.shokuji_seikatsu_ryouyou_kaisuu > 0) ||
      (ih.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
        ih.shokuji_seikatsu_ryouyou_goukei_kingaku > 0) ||
      ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0);
  const hasKouhi = k.kouhi_futan_iryous.some(
    (rk) =>
      (rk.shokuji_seikatsu_ryouyou_kaisuu != null && rk.shokuji_seikatsu_ryouyou_kaisuu > 0) ||
      (rk.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
        rk.shokuji_seikatsu_ryouyou_goukei_kingaku > 0),
  );

  if (!hasIh && !hasKouhi) return '';

  let rows = '';

  if (hasIh && ih) {
    rows += `<tr>
      <td>医療保険</td>
      <td class="num">${ih.shokuji_seikatsu_ryouyou_kaisuu != null ? `${formatNumber(ih.shokuji_seikatsu_ryouyou_kaisuu)}回` : ''}</td>
      <td class="num">${ih.shokuji_seikatsu_ryouyou_goukei_kingaku != null ? `${formatNumber(ih.shokuji_seikatsu_ryouyou_goukei_kingaku)}円` : ''}</td>
      <td class="num">${ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0 ? `${formatNumber(ih.shokuji_seikatsu_ryouyou_hyoujun_futangaku)}円` : ''}</td>
    </tr>`;
  }

  for (let i = 0; i < k.kouhi_futan_iryous.length; i++) {
    const rk = k.kouhi_futan_iryous[i];
    const hasData =
      (rk.shokuji_seikatsu_ryouyou_kaisuu != null && rk.shokuji_seikatsu_ryouyou_kaisuu > 0) ||
      (rk.shokuji_seikatsu_ryouyou_goukei_kingaku != null &&
        rk.shokuji_seikatsu_ryouyou_goukei_kingaku > 0);
    if (!hasData) continue;

    rows += `<tr>
      <td>公費${i + 1}</td>
      <td class="num">${rk.shokuji_seikatsu_ryouyou_kaisuu != null ? `${formatNumber(rk.shokuji_seikatsu_ryouyou_kaisuu)}回` : ''}</td>
      <td class="num">${rk.shokuji_seikatsu_ryouyou_goukei_kingaku != null ? `${formatNumber(rk.shokuji_seikatsu_ryouyou_goukei_kingaku)}円` : ''}</td>
      <td class="num">${rk.shokuji_seikatsu_ryouyou_hyoujun_futangaku > 0 ? `${formatNumber(rk.shokuji_seikatsu_ryouyou_hyoujun_futangaku)}円` : ''}</td>
    </tr>`;
  }

  return `
<div class="card card-kyuufu">
  <div class="card-title">食事・生活療養</div>
  <div class="card-body">
    <table>
      <tr>
        <th>区分</th>
        <th>回数</th>
        <th>合計金額</th>
        <th>標準負担額</th>
      </tr>
      ${rows}
    </table>
  </div>
</div>`;
}

// --- Exported page-level renderers ---

export function renderErrorHtml(error: CliError): string {
  const stderrSection = error.stderr ? `<pre class="stderr">${escapeHtml(error.stderr)}</pre>` : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
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

export function renderDataView(
  data: ReceiptisanJsonOutput,
  layoutMode = 'vertical',
  options: DataViewRenderOptions = {},
): string {
  const nonce = crypto.randomUUID();
  const bodyClass = layoutMode === 'horizontal' ? ' class="layout-horizontal"' : '';

  let navItems = '';
  let receiptSections = '';
  let index = 0;

  for (const digitalizedReceipt of data) {
    receiptSections += renderUkeHeader(digitalizedReceipt);

    for (const receipt of digitalizedReceipt.receipts) {
      const receiptId = `receipt-${index}`;
      const label = buildReceiptLabel(receipt);

      navItems += `<li><a href="#${receiptId}" class="nav-item" data-target="${receiptId}">${label}</a></li>\n`;
      receiptSections += renderReceipt(receipt, receiptId, layoutMode, options);
      index++;
    }
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
${cssContent}
</style>
</head>
<body${bodyClass}>
  <div id="nav">
    <ul>${navItems}</ul>
  </div>
  <div id="content">${receiptSections}</div>
  <script nonce="${nonce}">
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
