# Receiptisan Preview

RECEIPTC.UKE ファイル（日本の電子レセプトファイル）をSVGでプレビューするVSCode拡張です。

## 機能

- `.UKE` ファイルを開いた状態でコマンドパレットから「Receiptisan: Preview」を実行すると、レセプト用紙のSVGプレビューを隣カラムに表示
- キャンセル可能なプログレス表示付き

## 前提条件

この拡張機能を使用するには、[receiptisan](https://github.com/yokenzan/receiptisan) CLIが必要です。

### receiptisan のインストール

```bash
gem install receiptisan
```

または、Gemfileを使う場合:

```ruby
gem 'receiptisan'
```

## インストール

### Marketplace から（予定）

Visual Studio Code Marketplaceで「Receiptisan Preview」を検索してインストール。

### VSIX ファイルから

1. [Releases](https://github.com/yokenzan/receiptisan-preview/releases) からVSIXファイルをダウンロード
2. VSCodeで「拡張機能」ビュー → 「...」メニュー → 「VSIXからインストール」を選択
3. ダウンロードしたVSIXファイルを選択

## 使い方

1. `.UKE` ファイルを開く
2. コマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）を開く
3. 「Receiptisan: Preview」を選択
4. 隣カラムにSVGプレビューが表示される

## 設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `receiptisan.command` | receiptisan CLIの実行コマンド | `receiptisan` |
| `receiptisan.cwd` | CLI実行時の作業ディレクトリ | (なし) |

### 設定例

#### gem install した場合（デフォルト）

設定変更は不要です。

#### bundle exec を使用する場合

```json
{
  "receiptisan.command": "bundle exec ruby exe/receiptisan",
  "receiptisan.cwd": "/path/to/receiptisan"
}
```

## ライセンス

MIT
