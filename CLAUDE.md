# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A VSCode extension (`receiptisan-vscode`) that previews **RECEIPTC.UKE** files — the standard electronic format for Japanese medical insurance billing (診療報酬請求). The extension calls the [receiptisan CLI](https://github.com/yokenzan/receiptisan) (a separate Ruby project) to generate output, then renders it in webview panels.

The repo also contains symlinks to Ruby CLI repos (`receiptisan/` → v2, `recediff/` → v1 legacy), which are separate git repositories.

## Development Commands

```bash
npm install            # Install dependencies
npm run compile        # TypeScript compile + copy views/ to out/
npm run watch          # TypeScript watch mode (does NOT copy views/)
npm run build          # Clean + compile (used by vsce:prepublish)
npm run lint           # Biome check
npm run lint:fix       # Biome check with auto-fix
npm run format         # Biome format
npm test               # Run tests (pretest auto-compiles)
npx vsce package       # Package VSIX for distribution
```

Tests are plain JS files in `test/` (not TypeScript) that `require()` compiled output from `out/`. Uses Node.js built-in test runner. A single test file:
```bash
npm run compile && node --test test/cards.test.js
```

### CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`): lint → test → release (semantic-release on main push).

## Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `style:`, `test:`, `perf:`. Release is automated via semantic-release.

## Code Style

- **Biome** enforces linting and formatting
- Single quotes, semicolons always, 2-space indent, 100-char line width
- TypeScript strict mode, target ES2022, module Node16

## Architecture

### Two Features, One CLI Client

The extension provides two webview-based features that share the same CLI integration layer:

1. **Preview** (`features/preview/`) — SVG rendering of paper receipt layout. Calls CLI with `--format=svg`, displays the raw SVG HTML in a webview.
2. **Data View** (`features/data-view/`) — Structured HTML table view. Calls CLI with `--format=json`, parses the JSON into TypeScript types, transforms through a view-model layer, and renders via Eta templates.

### Layered Architecture (Data View)

```
CLI (json) → service.ts → presenter.ts → view-model/build.ts → view/*.ts → Eta templates
```

- **`service.ts`** — Orchestrates CLI execution and JSON parsing
- **`presenter.ts`** — Thin adapter calling view-model builder and page renderer
- **`view-model/`** — Transforms `ReceiptisanJsonOutput` into `DataViewModel` (navigation items + receipt groups). Key sub-modules: `build.ts` (top-level builder), `receipt-label.ts` (sidebar label data), `date-display.ts` (wareki/western date formatting)
- **`view/*.ts`** — Render functions producing HTML strings per card/section (`cards.ts`, `receipt-section.ts`, `tekiyou-table.ts`, `tekiyou-text.ts`, etc.)
- **`views/templates/`** — Eta template files (`.eta`) for document shell, cards, styles, and themes

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/cli/receiptisan-client.ts` | Spawns CLI process, handles cancellation/errors |
| `src/cli/config.ts` | Reads `receiptisan.*` workspace settings |
| `src/cli/args.ts` | Builds `--preview --format=<fmt> <path>` arguments |
| `src/shared/receiptisan-json-types.ts` | TypeScript types mirroring CLI JSON output schema |
| `src/domain/tekiyou-utils.ts` | Domain helpers (futan kubun decoding, wareki formatting, full→half-width ASCII) |
| `src/domain/tekiyou/row-policy.ts` | Separator class logic for tekiyou table rows |
| `src/template/eta-renderer.ts` | Eta template engine wrapper (views from `out/views/templates/`) |
| `src/features/data-view/theme.ts` | Theme types and labels (light/dark/original/classic/auto) |

### Template System

Templates use [Eta](https://eta.js.org/) (`.eta` files in `views/templates/`). The compile step copies `views/` into `out/views/` alongside compiled JS. The `watch` script does NOT copy views — you must run `npm run compile` after editing templates.

### Webview Panel Management

- **Preview**: Single `activePanel` variable, reuses/reveals existing panel
- **Data View**: `Map<string, WebviewPanel>` keyed by `${filePath}:${layoutMode}`, supports multiple simultaneous panels

## Domain Context

The UKE format is CSV-like, Windows-31J encoded, with record types (IR, RE, HO, KO, SY, SI, IY, TO, CO) identified by the first column. The CLI parses this and outputs structured JSON. The VSCode extension consumes this JSON.

Key domain terms in the codebase:
- **摘要 (tekiyou)** — billing detail section listing procedures/medications
- **診療識別 (shinryou shikibetsu)** — medical service category
- **負担区分 (futan kubun)** — insurance burden classification (encoded as bitmask in `tekiyou-utils.ts`)
- **和暦 (wareki)** — Japanese era calendar dates
- **療養の給付 (ryouyou no kyuufu)** — treatment benefits/reimbursement

Japanese identifiers, comments, and UI strings are standard throughout.

## Ruby CLI Development

Both Ruby projects (accessed via symlinks) are separate git repos:

```bash
cd receiptisan  # or recediff
bundle install
bundle exec rake test     # or: bundle exec rspec
bundle exec rake lint     # or: bundle exec rubocop
```

### Ruby Code Style (RuboCop)

- `# frozen_string_literal: true` at top of every file
- Single quotes, 120-char lines, `snake_case` variables
- Non-ASCII identifiers/constants allowed (Japanese names like `C_レセプト番号`)
- Trailing commas in multiline arrays/hashes, table-style hash alignment
- Hash shorthand syntax: **never** (always explicit `key: value`)
- v2 uses Sorbet type annotations
