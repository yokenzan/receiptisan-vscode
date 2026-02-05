# receiptisan-preview VSCode Extension Design

## Overview

RECEIPTC.UKE ファイルのプレビューをVSCode上で実行するための拡張機能。
receiptisan CLI を子プロセスとして呼び出し、生成されたSVG(HTML)をWebviewタブに表示する。

## Background

- recediff(v1)は `vim-quickrun` 等でVim上からTUIプレビューを実行できた
- receiptisan(v2)はSVG埋め込みHTMLを出力するため、CUI上での表示は困難
- VSCode拡張としてWebviewを利用することで、エディタ内でのSVGプレビューを実現する

## Phases

### Phase 1: SVG Preview

コマンドパレットから実行し、UKEファイル全体のSVGプレビューをWebviewタブに表示する。

### Phase 2: Structured Data View

receiptisanのJSON出力を利用し、レセプト一覧のナビゲーションや構造化された点検・分析向けビューを提供する。
recediffのTUI出力やSinatra HTML出力のような、点検・分析がしやすいフォーマットを目指す。

### Future: Cursor/Selection Preview

カーソル位置や選択範囲のレセプトのみをプレビューする機能。

## Phase 1 Design

### Commands

| Command ID | Title | Description |
|---|---|---|
| `receiptisan.preview` | Receiptisan: Preview | アクティブなUKEファイル全体をSVGプレビュー |

### Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `receiptisan.command` | `string` | `receiptisan` | receiptisan CLIの実行コマンド。例: `receiptisan`, `bundle exec receiptisan`, `/usr/local/bin/receiptisan` |

### Activation Events

- `onCommand:receiptisan.preview`
- `onLanguage:uke`

### Language Registration

`.UKE` 拡張子を `uke` 言語IDとして `package.json` に登録する。
これにより:
- コマンドの `when` 句で `editorLangId == uke` を使用可能
- `onLanguage:uke` でアクティベーション可能

### Execution Flow

```
1. ユーザーがコマンドパレットで「Receiptisan: Preview」を実行
2. アクティブエディタの検証
   - エディタがない → エラーメッセージ
   - UKEファイルでない → エラーメッセージ
3. 設定から receiptisan.command を取得
4. child_process.spawn でCLI実行（shell: true）
   - args: --preview --format=svg <filePath>
   - stdout をバッファに蓄積
   - stderr は無視（receiptisanは警告をstderrに出力しつつ正常分をstdoutに出す）
5. 終了コード確認
   - 非0 → エラーメッセージ表示
   - コマンド未発見 → 設定方法を案内するエラーメッセージ
6. Webviewパネルを生成
   - ViewColumn.Beside（エディタの隣カラム）
   - タイトル: 「プレビュー: <ファイル名>」
   - 同じファイルに対する再実行は既存パネルを更新
7. stdoutのHTML文字列をWebview.htmlに設定
```

### Webview Details

- receiptisanのSVG出力は完全なHTMLドキュメント（`<!DOCTYPE html>` 〜 `</html>`）
- Webviewの `html` プロパティに直接設定してレンダリング
- インラインSVGのためCSP制約の問題なし
- `@font-face` によるローカルフォント参照（BIZ UD明朝等）はWebview内でも機能する

### Output Size Consideration

- サンプルファイル(75レセプト)で約2.6MBのHTML出力
- `child_process.spawn` でストリーミング受信し `maxBuffer` 制限を回避

### Project Structure

```
receiptisan-preview/
├── package.json          # 拡張マニフェスト（commands, configuration, languages）
├── tsconfig.json
├── src/
│   └── extension.ts      # エントリポイント（コマンド登録、CLI実行、Webview生成）
└── resources/            # アイコン等（必要に応じて）
```

Phase 1 では `extension.ts` 1ファイルにロジックを集約し、最小構成で始める。

### Error Messages

| Condition | Message |
|---|---|
| アクティブエディタなし | `プレビューするUKEファイルを開いてください` |
| UKEファイルでない | `UKEファイルのみプレビューできます` |
| コマンド未発見 | `receiptisanコマンドが見つかりません。設定 "receiptisan.command" を確認してください` |
| CLI実行エラー（非0終了） | `プレビューの生成に失敗しました: <stderr抜粋>` |

## Future Requirements

### Cursor/Selection Preview

- `receiptisan.previewAtCursor` — カーソル位置のレセプトのみプレビュー
- `receiptisan.previewSelection` — 選択範囲のレセプトをプレビュー
- 実装方針: 拡張側でIRレコード＋対象REレコード〜次RE手前を抽出し、stdinでCLIに渡す

### Structured Data View (Phase 2)

- receiptisanの `--format=json` 出力を利用
- レセプト単位でジャンプ・移動できるリスト
- 患者情報、保険、傷病名、診療行為等の構造化表示
- recediffのTUI出力を参考にした点検・分析向けUI
- VSCode Webview APIでカスタムHTML/CSS/JSをレンダリング
