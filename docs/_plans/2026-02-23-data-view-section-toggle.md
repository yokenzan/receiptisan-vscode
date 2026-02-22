# Data View: フラットセクション化 + セクショントグル 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** data-view のカード形式をフラットセクションに変更し、ビュー上の設定パネルから各セクションの表示/非表示をトグルできるようにする。

**Architecture:** 全テンプレートの `.card` > `.card-title` + `.card-body` 構造を `<section class="data-section" data-section="NAME">` + `<h3 class="section-title">` に置き換える。テーマ切替ボタンを設定パネルに統合し、チェックボックスでセクション表示を JS で制御する。`vscodeApi.setState` で永続化。

**Tech Stack:** Eta テンプレート, CSS, vanilla JS (WebView内), TypeScript (cards.ts, tekiyou.ts)

---

## Task 1: vertical用テンプレートのフラットセクション化

**Files:**
- Modify: `views/templates/data-view/receipt-header-card.eta`
- Modify: `views/templates/data-view/patient-card.eta`
- Modify: `views/templates/data-view/hoken-card.eta`
- Modify: `views/templates/data-view/kyuufu-card.eta`
- Modify: `views/templates/data-view/shoubyoumei-card.eta`

**Step 1: receipt-header-card.eta を変換**

Before:
```html
<div class="card receipt-info-card">
  <div class="card-body">
    ...table...
  </div>
</div>
```

After:
```html
<section class="data-section data-section-receipt-header" data-section="receipt-header">
  <h3 class="section-title">レセプト共通</h3>
  ...table...
</section>
```

Note: このカードだけ `card-title` がなかったので `section-title` を新たに追加する。テーブルの中身はそのまま。

**Step 2: patient-card.eta を変換**

Before:
```html
<div class="card card-patient">
  <div class="card-title">患者情報</div>
  <div class="card-body">
    ...table...
  </div>
</div>
```

After:
```html
<section class="data-section data-section-patient" data-section="patient">
  <h3 class="section-title">患者情報</h3>
  ...table...
</section>
```

**Step 3: hoken-card.eta を同様に変換**

`<div class="card card-hoken">` → `<section class="data-section data-section-hoken" data-section="hoken">`。`card-title` → `section-title`。`card-body` 除去。テーブルとhoken-detail部分はそのまま。

**Step 4: kyuufu-card.eta を同様に変換**

`<div class="card card-kyuufu">` → `<section class="data-section data-section-kyuufu" data-section="kyuufu">`。`card-title` → `section-title`。`card-body` 除去。

**Step 5: shoubyoumei-card.eta を同様に変換**

`<div class="card card-shoubyoumei">` → `<section class="data-section data-section-shoubyoumei" data-section="shoubyoumei">`。`card-title` → `section-title`。`card-body` 除去。

**Step 6: コンパイルして確認**

Run: `npm run compile`
Expected: エラーなし

**Step 7: コミット**

```bash
git add views/templates/data-view/receipt-header-card.eta views/templates/data-view/patient-card.eta views/templates/data-view/hoken-card.eta views/templates/data-view/kyuufu-card.eta views/templates/data-view/shoubyoumei-card.eta
git commit -m "refactor(data-view): convert vertical cards to flat sections"
```

---

## Task 2: tekiyou テンプレートのフラットセクション化

**Files:**
- Modify: `views/templates/data-view/tekiyou-card-compact.eta`
- Modify: `views/templates/data-view/tekiyou-card-horizontal.eta`

**Step 1: tekiyou-card-compact.eta を変換**

Before:
```html
<div class="card">
  <div class="card-title">摘要欄</div>
  <div class="card-body tekiyou-scroll-container">
    <table ...>
```

After:
```html
<section class="data-section data-section-tekiyou" data-section="tekiyou">
  <h3 class="section-title">摘要欄</h3>
  <div class="tekiyou-scroll-container">
    <table ...>
```

Note: `tekiyou-scroll-container` はスクロールに必要なのでラッパーとして残す。末尾の `</div></div></div>` → `</div></section>` に変更。

**Step 2: tekiyou-card-horizontal.eta を同様に変換**

同じパターン。`<div class="card">` → `<section class="data-section data-section-tekiyou" data-section="tekiyou">`。`card-body tekiyou-scroll-container` → `tekiyou-scroll-container` のみ残す。

**Step 3: コンパイルして確認**

Run: `npm run compile`
Expected: エラーなし

**Step 4: コミット**

```bash
git add views/templates/data-view/tekiyou-card-compact.eta views/templates/data-view/tekiyou-card-horizontal.eta
git commit -m "refactor(data-view): convert tekiyou cards to flat sections"
```

---

## Task 3: horizontal用統合テンプレートのフラットセクション化

**Files:**
- Modify: `views/templates/data-view/patient-receipt-card-horizontal.eta`
- Modify: `views/templates/data-view/hoken-kyuufu-card-horizontal.eta`

**Step 1: patient-receipt-card-horizontal.eta を変換**

Before:
```html
<div class="card card-patient-receipt-horizontal">
  <div class="card-body">
    <div class="card-horizontal-columns">
      <div class="card-horizontal-pane">...receipt table...</div>
      <div class="card-horizontal-pane">...patient table...</div>
    </div>
  </div>
</div>
```

After:
```html
<section class="data-section data-section-patient-receipt-horizontal" data-section="patient">
  <h3 class="section-title">レセプト共通 / 患者情報</h3>
  <div class="section-horizontal-columns">
    <div class="section-horizontal-pane">...receipt table...</div>
    <div class="section-horizontal-pane">...patient table...</div>
  </div>
</section>
```

Note: `data-section="patient"` を使う。horizontal ではレセプト共通と患者情報が統合されているので、`patient` セクションをトグルすると両方消える。`receipt-header` は horizontal では独立して存在しない。CSS クラス名を `card-horizontal-*` → `section-horizontal-*` にリネーム。

**Step 2: hoken-kyuufu-card-horizontal.eta を変換**

Before:
```html
<div class="card card-hoken-kyuufu-horizontal">
  <div class="card-title">療養の給付</div>
  <div class="card-body">
    ...tables...
  </div>
</div>
```

After:
```html
<section class="data-section data-section-hoken-kyuufu-horizontal" data-section="hoken">
  <h3 class="section-title">療養の給付</h3>
  ...tables...
</section>
```

Note: `data-section="hoken"` を使う。horizontal では保険と給付が統合されている。

**Step 3: コンパイルして確認**

Run: `npm run compile`
Expected: エラーなし

**Step 4: コミット**

```bash
git add views/templates/data-view/patient-receipt-card-horizontal.eta views/templates/data-view/hoken-kyuufu-card-horizontal.eta
git commit -m "refactor(data-view): convert horizontal combined cards to flat sections"
```

---

## Task 4: CSS の書き換え

**Files:**
- Modify: `views/templates/styles/data-view.css.eta`

**Step 1: `.card` / `.card-title` / `.card-body` のスタイルを `.data-section` / `.section-title` に置き換え**

削除するルール:
```css
.card { ... }
.card-title { ... }
.card-body { ... }
```

追加するルール:
```css
.data-section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  padding: 4px 0;
  margin: 0;
  border-bottom: 1px solid var(--border-strong);
}

.data-section[hidden] {
  display: none;
}

.data-section > table,
.data-section > .tekiyou-scroll-container,
.data-section > .section-horizontal-columns {
  padding: 4px 0;
}
```

**Step 2: `.card-patient`, `.card-hoken` 等の幅制限ルールを更新**

Before:
```css
.receipt-info-card,
.card-patient,
.card-hoken,
.card-patient-receipt-horizontal,
.card-hoken-kyuufu-horizontal,
.card-shoubyoumei,
.card-kyuufu {
  max-width: 800px;
}
```

After:
```css
.data-section-receipt-header,
.data-section-patient,
.data-section-hoken,
.data-section-shoubyoumei,
.data-section-kyuufu {
  max-width: 800px;
}
```

**Step 3: horizontal カード固有のスタイルを更新**

Before:
```css
.card-patient-receipt-horizontal,
.card-hoken-kyuufu-horizontal {
  width: fit-content;
  max-width: 1200px;
}
.card-patient-receipt-horizontal .card-body { ... }
.card-hoken-kyuufu-horizontal .card-body { ... }
.card-horizontal-columns { ... }
.card-horizontal-pane { ... }
```

After:
```css
.data-section-patient-receipt-horizontal,
.data-section-hoken-kyuufu-horizontal {
  width: fit-content;
  max-width: 1200px;
}
.section-horizontal-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}
.section-horizontal-pane { ... }
```

**Step 4: `.receipt-info-card` を参照しているルールの更新**

`.receipt-info-card` → `.data-section-receipt-header` に。
`.card-patient table` → `.data-section-patient table` に。
その他 `.card-*` セレクタを CSS ファイル全体で検索し、対応する `.data-section-*` に置き換える。

**Step 5: `#theme-toggle-button` のスタイルはそのまま残す（Task 6 で設定パネルに変換する）**

この段階ではボタンは残しておく。

**Step 6: コンパイルして確認**

Run: `npm run compile`
Expected: エラーなし

**Step 7: コミット**

```bash
git add views/templates/styles/data-view.css.eta
git commit -m "refactor(data-view): replace card CSS with flat section styles"
```

---

## Task 5: テストの更新

**Files:**
- Modify: `test/data-view-renderers.test.js`
- Modify: `test/data-view-page.test.js`

**Step 1: テストで `.card` クラスを参照している箇所を確認**

`data-view-renderers.test.js` の既存テストは `tekiyou-table`, `col-futan`, `算定日` 等を検査しており、`.card` クラスは直接検査していない。変更不要の可能性が高いが確認する。

`data-view-page.test.js` は `receipt-section` クラスのみ検査。変更不要。

**Step 2: 全テストを実行**

Run: `npm run compile && npm test`
Expected: 全テスト PASS

**Step 3: テストが失敗した場合は修正してコミット**

```bash
git add test/
git commit -m "test(data-view): update assertions for flat section structure"
```

テストが全て PASS した場合はコミット不要。

---

## Task 6: 設定パネルの追加（HTML + JS）

**Files:**
- Modify: `views/templates/data-view/document.eta`
- Modify: `views/templates/data-view/theme-controller.js.eta`
- Modify: `views/templates/styles/data-view.css.eta`

**Step 1: document.eta のテーマボタンを設定ボタン + パネルに置き換え**

Before:
```html
<button id="theme-toggle-button" type="button" aria-label="テーマ切替">L</button>
```

After:
```html
<button id="settings-toggle-button" type="button" aria-label="表示設定">⚙</button>
<div id="settings-panel" hidden>
  <div class="settings-panel-header">表示設定</div>
  <div class="settings-panel-group">
    <div class="settings-panel-label">テーマ</div>
    <div id="theme-buttons" class="settings-panel-buttons"></div>
  </div>
  <div class="settings-panel-group">
    <div class="settings-panel-label">セクション表示</div>
    <label class="settings-checkbox"><input type="checkbox" data-section-toggle="receipt-header" checked />レセプト共通</label>
    <label class="settings-checkbox"><input type="checkbox" data-section-toggle="patient" checked />患者情報</label>
    <label class="settings-checkbox"><input type="checkbox" data-section-toggle="hoken" checked />保険情報</label>
    <label class="settings-checkbox"><input type="checkbox" data-section-toggle="kyuufu" checked />食事・生活療養</label>
    <label class="settings-checkbox"><input type="checkbox" data-section-toggle="shoubyoumei" checked />傷病名</label>
    <label class="settings-checkbox"><input type="checkbox" data-section-toggle="tekiyou" checked />摘要欄</label>
  </div>
</div>
```

**Step 2: document.eta にセクショントグル JS を追加**

パネル開閉、チェックボックス操作、`vscodeApi.setState`/`getState` による永続化の JS を `<script nonce="...">` ブロックとして追加。

```javascript
(function() {
  var settingsButton = document.getElementById('settings-toggle-button');
  var settingsPanel = document.getElementById('settings-panel');
  var vscodeApi = /* 既存の vscodeApi 参照を共有 */;

  // パネル開閉
  settingsButton.addEventListener('click', function(e) {
    e.stopPropagation();
    settingsPanel.hidden = !settingsPanel.hidden;
  });
  document.addEventListener('click', function(e) {
    if (!settingsPanel.contains(e.target) && e.target !== settingsButton) {
      settingsPanel.hidden = true;
    }
  });

  // セクショントグル
  var checkboxes = settingsPanel.querySelectorAll('[data-section-toggle]');
  var state = vscodeApi.getState() || {};
  var visibleSections = state.visibleSections || null;

  // 初期状態復元
  if (visibleSections) {
    checkboxes.forEach(function(cb) {
      var section = cb.getAttribute('data-section-toggle');
      var visible = visibleSections.indexOf(section) >= 0;
      cb.checked = visible;
      applySectionVisibility(section, visible);
    });
  }

  checkboxes.forEach(function(cb) {
    cb.addEventListener('change', function() {
      var section = cb.getAttribute('data-section-toggle');
      applySectionVisibility(section, cb.checked);
      saveState();
    });
  });

  function applySectionVisibility(section, visible) {
    var elements = document.querySelectorAll('[data-section="' + section + '"]');
    elements.forEach(function(el) {
      el.hidden = !visible;
    });
  }

  function saveState() {
    var sections = [];
    checkboxes.forEach(function(cb) {
      if (cb.checked) sections.push(cb.getAttribute('data-section-toggle'));
    });
    var s = vscodeApi.getState() || {};
    s.visibleSections = sections;
    vscodeApi.setState(s);
  }
})();
```

**Step 3: theme-controller.js.eta をパネル内のテーマボタンに統合**

テーマボタンの生成先を `#theme-buttons` コンテナに変更。各テーマの小ボタン（L / D / O / CM）を動的に生成する方式に。`#theme-toggle-button` の参照を `#theme-buttons` 内のボタン群に変更。

**Step 4: CSS に設定パネルのスタイルを追加**

```css
#settings-toggle-button {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 20;
  border: 1px solid var(--control-border);
  background: var(--control-bg);
  color: var(--control-fg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  min-width: 2.6em;
  padding: 4px 8px;
  text-align: center;
}

#settings-panel {
  position: fixed;
  right: 12px;
  bottom: 48px;
  z-index: 30;
  background: var(--bg-card);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 180px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

#settings-panel[hidden] { display: none; }

.settings-panel-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.settings-panel-group {
  margin-bottom: 8px;
}

.settings-panel-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.settings-panel-buttons {
  display: flex;
  gap: 4px;
}

.settings-checkbox {
  display: block;
  font-size: 12px;
  color: var(--text);
  padding: 2px 0;
  cursor: pointer;
}

.settings-checkbox input {
  margin-right: 6px;
}
```

**Step 5: `#theme-toggle-button` の CSS を削除し `#settings-toggle-button` に統合**

**Step 6: コンパイルして確認**

Run: `npm run compile`
Expected: エラーなし

**Step 7: コミット**

```bash
git add views/templates/data-view/document.eta views/templates/data-view/theme-controller.js.eta views/templates/styles/data-view.css.eta
git commit -m "feat(data-view): add settings panel with section visibility toggle"
```

---

## Task 7: 最終テスト・動作確認

**Files:** なし（動作確認のみ）

**Step 1: 全テスト実行**

Run: `npm run compile && npm test`
Expected: 全テスト PASS

**Step 2: lint 実行**

Run: `npm run lint`
Expected: エラーなし

**Step 3: VSCode で動作確認**

1. `.uke` ファイルを開き Data View (Vertical) で表示
2. 右下の設定ボタンをクリック → パネルが開く
3. チェックボックスを外す → 該当セクションが全レセプトで非表示
4. テーマボタンをクリック → テーマ切替が動作
5. ビューを閉じて再度開く → 非表示状態が復元
6. Data View (Horizontal) でも同様に動作確認
7. パネル外クリックでパネルが閉じることを確認

**Step 4: 問題があれば修正してコミット**

**Step 5: 最終コミットが不要であればこのタスクは完了**
