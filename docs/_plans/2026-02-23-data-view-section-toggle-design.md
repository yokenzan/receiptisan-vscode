# Data View: セクショントグル + フラットセクション化

## 概要

data-view のカード形式をフラットセクションに変更し、各セクションの表示/非表示をビュー上の設定パネルから切り替えられるようにする。

## 背景

- カード (`card` > `card-title` + `card-body` > `table`) の二段構造が枠が多く冗長
- レセプト内の情報はセクション区切りで十分
- 保険情報や傷病名など、不要なセクションを非表示にして見通しを良くしたい

## アプローチ

**CSS visibility + JS パネル** (アプローチ A) を採用。

- セクションの HTML は常にレンダリングする
- JS でセクション要素に `hidden` 属性を付け外しして `display: none` で切り替え
- テーマボタンと統合した設定パネルにチェックボックスを配置
- vertical / horizontal 両モードで動作

## 設計

### 1. セクション識別とHTML構造

各カードに `data-section` 属性を付与しトグル対象を識別する。

| data-section | 内容 |
|---|---|
| `receipt-header` | レセプト共通 |
| `patient` | 患者情報 |
| `hoken` | 保険情報 |
| `kyuufu` | 給付（verticalのみ。horizontalではhokenに統合済み） |
| `shoubyoumei` | 傷病名 |
| `tekiyou` | 摘要 |

フラットセクション化:

```html
<!-- Before -->
<div class="card card-patient">
  <div class="card-title">患者情報</div>
  <div class="card-body">
    <table>...</table>
  </div>
</div>

<!-- After -->
<section class="data-section" data-section="patient">
  <h3 class="section-title">患者情報</h3>
  <table>...</table>
</section>
```

非表示時は JS が `hidden` 属性を付与。

### 2. トグルパネルUI

現在のテーマ切替ボタン（右下）を設定パネルに統合する。

```
┌─────────────────────────┐
│ 表示設定                 │
│                         │
│ テーマ:  [L] [D] [A]    │
│                         │
│ セクション表示:           │
│ ☑ レセプト共通           │
│ ☑ 患者情報              │
│ ☑ 保険情報              │
│ ☑ 給付                  │
│ ☑ 傷病名               │
│ ☑ 摘要                  │
└─────────────────────────┘
```

- パネル外クリックで閉じる
- チェックを外すと全レセプトの該当セクションが即座に非表示
- 状態は `vscodeApi.setState` に `{ visibleSections: [...] }` として保存
- ページロード時に保存済み状態を復元

### 3. CSSスタイリング

- `.card` の `border`, `border-radius`, `background` を廃止
- `.card-title` → `.section-title`: 上部のセパレータ線 + 見出しテキスト
- `.card-body` ラッパーを除去

```css
.data-section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  border-top: 1px solid var(--border-strong);
  padding: 4px 0;
  margin: 0;
}

.data-section[hidden] {
  display: none;
}
```

設定パネル: `position: fixed; right: 12px; bottom: 48px;`、z-indexでオーバーレイ。light/dark両テーマ対応。

horizontal固有の統合カード (`patient-receipt-horizontal`, `hoken-kyuufu-horizontal`) も同様に `.data-section` 化。`data-section` 属性は統合前と同じ名前を使用。

### 4. 実装スコープと影響範囲

変更対象:

| ファイル | 変更内容 |
|---|---|
| `views/templates/data-view/*.eta` | 各テンプレートを `<section data-section="...">` 化、`card-body` 除去 |
| `views/templates/styles/data-view.css.eta` | `.card` → `.data-section` / `.section-title` 化、設定パネルスタイル追加 |
| `views/templates/data-view/document.eta` | テーマボタン→設定ボタンに変更、パネルHTML追加、トグルJS追加 |
| `src/features/data-view/view/cards.ts` | テンプレート名変更があれば追従 |
| `test/data-view-*.test.js` | `.card` クラス参照のアサーション更新 |

変更しない:

- `presenter.ts`, `service.ts`, `page.ts` — レンダリングパイプライン
- `package.json` — VSCode設定項目
- `view-model/` — ビューモデル構築ロジック

実装順序:

1. テンプレートのフラットセクション化 (card → section)
2. CSS の書き換え
3. 設定パネルの追加 (HTML + JS)
4. テストの更新
