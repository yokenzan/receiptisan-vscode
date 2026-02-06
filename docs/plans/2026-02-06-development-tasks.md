# Development Tasks

各タスクはtopic branchで実装し、conventional commitsに従ってコミットし、PRを作成する。

ブランチ命名: `feat/<task-slug>`, `chore/<task-slug>` 等
コミットメッセージ: [Conventional Commits](https://www.conventionalcommits.org/) に準拠

## Phase 1: SVG Preview

### Task 1: プロジェクト初期化

**Branch**: `chore/project-init`

**作業内容**:
- `npm init` で `package.json` を作成（拡張マニフェスト含む）
- TypeScript設定（`tsconfig.json`）
- ESLint設定
- `.vscodeignore` の作成
- ビルドスクリプトの設定（`esbuild` or `tsc`）
- `src/extension.ts` に空のactivate/deactivate関数を作成
- `F5` で拡張を起動し、Extension Hostが立ち上がることを確認

**受入要件**:
- [x] `npm run compile` でビルドが通る
- [x] `F5` でExtension Development Hostが起動する
- [x] `package.json` に拡張のメタデータ（name, displayName, description, publisher, version, engines）が設定されている

---

### Task 2: UKE言語登録とコマンド定義

**Branch**: `feat/uke-language-and-command`

**作業内容**:
- `package.json` の `contributes.languages` に `.UKE` 拡張子を `uke` 言語として登録
- `package.json` の `contributes.commands` に `receiptisan.preview` コマンドを定義
  - title: `Receiptisan: Preview`
- `package.json` の `contributes.menus.commandPalette` でコマンド表示条件を設定
  - `when`: `editorLangId == uke`
- `package.json` の `activationEvents` に `onCommand:receiptisan.preview` と `onLanguage:uke` を設定

**受入要件**:
- [x] `.UKE` ファイルを開くと言語モードが `uke` と表示される
- [x] `.UKE` ファイルを開いた状態でコマンドパレットに「Receiptisan: Preview」が表示される
- [x] `.UKE` 以外のファイルではコマンドパレットに表示されない

---

### Task 3: 設定項目の定義

**Branch**: `feat/configuration`

**作業内容**:
- `package.json` の `contributes.configuration` に `receiptisan.command` 設定を追加
  - type: `string`
  - default: `receiptisan`
  - description（日英）
- `extension.ts` で設定値を読み取るユーティリティを実装

**受入要件**:
- [x] VSCodeの設定画面で `receiptisan.command` が表示・編集できる
- [x] デフォルト値が `receiptisan` になっている
- [x] コードから `workspace.getConfiguration('receiptisan').get('command')` で値を取得できる

---

### Task 4: CLI実行とSVG出力の取得

**Branch**: `feat/cli-execution`

**作業内容**:
- receiptisan CLIを子プロセスとして実行する関数を実装
  - `child_process.spawn` を使用（`shell: true`）
  - 引数: `--preview --format=svg <filePath>`
  - stdoutをバッファに蓄積して返す
  - stderrは無視（ログ出力のみ）
- エラーハンドリング:
  - コマンド未発見 → 設定案内のエラーメッセージ
  - 非0終了 → エラーメッセージ
  - タイムアウト処理（大きなファイル対応）
- コマンド実行中のプログレス表示（`window.withProgress`）

**受入要件**:
- [x] 設定で指定したコマンドが実行され、stdoutのHTMLが取得できる
- [x] コマンドが見つからない場合、設定を案内するエラーメッセージが表示される
- [x] CLI実行中にプログレスインジケータが表示される
- [x] 実行中にキャンセル可能

---

### Task 5: WebviewでのSVGプレビュー表示

**Branch**: `feat/webview-preview`

**作業内容**:
- `receiptisan.preview` コマンドのハンドラを実装
  - アクティブエディタの検証（存在チェック、UKEファイルチェック）
  - Task 4のCLI実行関数を呼び出し
  - WebviewPanelを作成し、取得したHTMLを設定
- Webviewパネルの動作:
  - `ViewColumn.Beside` で開く
  - タイトル: `プレビュー: <ファイル名>`
  - 同一ファイルの再実行時は既存パネルを更新（WebviewPanelのインスタンスを管理）
  - パネルが閉じられたらインスタンス管理から削除

**受入要件**:
- [x] `.UKE` ファイルを開いた状態でコマンドを実行すると、隣カラムにSVGプレビューが表示される
- [x] プレビュー内のSVGがレセプト用紙として正しく描画されている
- [x] 同じファイルに対して再度実行すると、新しいタブが増えず既存タブが更新される
- [x] プレビュータブを閉じた後に再実行すると、新しいタブが開く
- [x] アクティブエディタがない場合、適切なエラーメッセージが表示される

---

### Task 6: README と公開準備

**Branch**: `docs/readme-and-packaging`

**作業内容**:
- `README.md` の作成
  - 拡張の概要、スクリーンショット
  - 前提条件（Ruby, receiptisan gem）
  - インストール方法
  - 使い方
  - 設定項目の説明
- `CHANGELOG.md` の作成
- `package.json` の公開用メタデータ確認（repository, icon, categories, keywords）
- `vsce package` でVSIXファイルが生成できることを確認

**受入要件**:
- [x] `README.md` に拡張の使い方が記載されている (完了)
- [x] `vsce package` でエラーなくVSIXが生成される (完了)
- [x] VSIXからインストールして拡張が動作する (Phase 1 完了時に確認済み)

---

## Phase 2: Structured Data View (将来)

### Task 7: JSON出力の取得と型定義

**Branch**: `feat/json-output-types`

**作業内容**:
- receiptisanの `--format=json` 出力に対応するTypeScript型定義の作成
- CLI実行関数の拡張（format引数の対応）

**受入要件**:
- [x] JSON出力の構造を網羅した型定義がある
- [x] `--format=json` でCLIを実行し、型安全にパースできる

---

### Task 8: レセプト一覧ナビゲーション付き構造化ビュー

**Branch**: `feat/structured-data-view`

**作業内容**:
- Webview上にレセプト一覧とナビゲーションUIを構築
- レセプト選択時に詳細（患者、保険、傷病名、診療行為）を表示
- recediffのTUI出力を参考にした表示形式

**受入要件**:
- [x] レセプト一覧がリスト表示され、クリックで各レセプトの詳細にジャンプできる
- [x] 患者情報、保険、傷病名、診療行為が見やすく表示される

---

## Future

### Task 9: カーソル位置/選択範囲のレセプトプレビュー

**Branch**: `feat/preview-at-cursor`

**作業内容**:
- エディタ上のカーソル位置からレセプト範囲（IR + RE〜次RE手前）を特定するロジック
- 抽出した内容をstdinでCLIに渡してプレビュー生成
- `receiptisan.previewAtCursor` / `receiptisan.previewSelection` コマンドの追加

**受入要件**:
- [x] カーソルがあるレセプトのみがプレビューされる
- [x] 選択範囲に含まれるレセプトのみがプレビューされる
