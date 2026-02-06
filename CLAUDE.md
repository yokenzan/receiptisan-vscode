# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This repository contains:

1. **VSCode Extension** (`receiptisan-preview`) — TypeScript extension for previewing RECEIPTC.UKE files
2. **Symlinks to Ruby CLI tools**:
   - `receiptisan/` → current version (v2, v0.4.x)
   - `recediff/` → legacy version (v1, v0.1.0)

The Ruby CLI tools are separate git repositories. The VSCode extension calls the receiptisan CLI to generate previews.

## VSCode Extension Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Lint (Biome)
npm run lint

# Lint with auto-fix
npm run lint:fix

# Format
npm run format

# Package VSIX
npx vsce package
```

### Technology Stack

- **Language**: TypeScript
- **Formatter/Linter**: Biome
- **Release**: semantic-release (conventional commits)
- **Branching**: GitHub feature flow (topic branches → PR → main)

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature (minor version bump)
- `fix:` — bug fix (patch version bump)
- `docs:` — documentation only
- `chore:` — maintenance, no release
- `refactor:` — code change that neither fixes a bug nor adds a feature

## Ruby CLI Development

Both Ruby projects share the same command structure:

```bash
# Install dependencies
cd receiptisan  # or recediff
bundle install

# Run tests (default rake task)
bundle exec rake test
# or directly:
bundle exec rspec

# Run a single test file
bundle exec rspec spec/lib/receiptisan/model/receipt_computer/digitalized_receipt/parser/processor/si_processor_spec.rb

# Lint
bundle exec rake lint
# or directly:
bundle exec rubocop

# Run the CLI
bundle exec ruby exe/receiptisan --preview --format=svg path/to/RECEIPTC.UKE   # v2
bundle exec exe/recediff --preview path/to/RECEIPTC.UKE --all                  # v1
```

## Domain Context

These tools parse **RECEIPTC.UKE** files — the standard electronic format for Japanese medical insurance billing (診療報酬請求). The UKE format is CSV-like, Windows-31J encoded, with record types identified by the first column:

| Record | Japanese | Meaning |
|--------|----------|---------|
| IR | 医療機関情報 | Hospital/facility header |
| RE | レセプト共通 | Receipt header (one per patient per month) |
| HO | 保険者 | Medical insurance |
| KO | 公費 | Public insurance |
| SY | 傷病名 | Disease/diagnosis |
| SI | 診療行為 | Medical procedures |
| IY | 医薬品 | Medications |
| TO | 特定器材 | Special medical equipment |
| CO | コメント | Comments |

Each record type has fixed column positions defined as constants (e.g., `Record::RE::C_レセプト番号`). Comments in Japanese are standard throughout the codebase.

## Architecture: Receiptisan (v2)

### Module Layout
```
Receiptisan::Cli                          # dry-cli commands (preview, version)
Receiptisan::Model::ReceiptComputer
  ::DigitalizedReceipt                    # Top-level parsed document
    ::Parser                              # Line-by-line UKE parser
      ::Processor::{IR,RE,HO,KO,SY,SI,IY,TO,CO}Processor  # Per-record-type processors
      ::Buffer                            # Parse state accumulator
      ::Context                           # Line/receipt tracking for error context
    ::Receipt                             # Domain models (Patient, Tekiyou, etc.)
  ::Master                                # Reference/master data facade
    ::Treatment::{ShinryouKoui,Iyakuhin,TokuteiKizai,Comment}
    ::Diagnosis::{Shoubyoumei,Shuushokugo}
    ::Loader                              # Year-aware master data loading
Receiptisan::Output::Preview
  ::Previewer::{SVG,JSON,YAML}Previewer   # Output formatters (Strategy pattern)
  ::Parameter::Generator                  # Domain → display parameter conversion
Receiptisan::Util                         # Encoding (IOWithEncoding), Wareki, DateUtil
```

### Data Flow
```
UKE file → Parser (encoding conversion + record routing) → Processors → DigitalizedReceipt
    → Parameter::Generator → Previewer → SVG(HTML) / JSON / YAML output
```

### Key Design Patterns
- **Processor pattern**: Each record type has a dedicated processor class extracting values by column index
- **Strategy pattern**: Pluggable previewers (SVG/JSON/YAML)
- **Year-aware master data**: `config/{2018..2024}/` directories with YAML configs for medical codes that change annually
- **Encoding refinement**: `IOWithEncoding` uses Ruby refinements for transparent Windows-31J → UTF-8 conversion
- **Error context reporting**: `Parser::Context::ErrorContextReportable` mixin tracks current line/receipt for debugging

## Architecture: Recediff (v1)

### Module Layout
```
Recediff::Cli                    # dry-cli commands (preview, daily-cost-list, ef-like-csv, sokatsu, uke-structure, version)
Recediff::Parser                 # Monolithic CSV parser with Buffer for state management
Recediff::Previewer              # ANSI-colored terminal output with masking support
Recediff::Model::Uke::Enum       # Column index constants per record type
Recediff::{Receipt,Patient,CalcUnit,Cost,Iho,Kohi,Syobyo,Hospital}  # Flat domain models
```

### Key Differences from v2
- Terminal-based text output (ANSI escape codes) vs v2's SVG/JSON/YAML
- More commands (daily-cost-list, ef-like-csv, sokatsu, uke-structure) vs v2's focused preview-only approach
- Monolithic parser vs v2's modular processor-per-record-type architecture
- Master data from static CSV files in `/csv/` vs v2's year-versioned YAML configs
- Ruby >= 2.6.0 vs v2's >= 3.3.0
- No type checking vs v2's Sorbet integration
- Known bugs: TO record parsing incomplete, comment-only calc units unsupported

## Code Style (enforced by RuboCop)

Both projects share these conventions:

- `# frozen_string_literal: true` at top of every file
- Single quotes for strings
- 120-char line length
- `snake_case` variables, non-ASCII identifiers/constants allowed (Japanese constant names like `C_レセプト番号`)
- Trailing commas in multiline arrays and hashes (`consistent_comma`)
- Hash alignment: table style for colons
- Hash shorthand syntax: **never** (always explicit `key: value`, not `key:`)
- Spaces inside block parameters (`{ | x | ... }`)
- Japanese comments are standard

### v2-specific
- Sorbet type annotations (sorbet-runtime, tapioca)
- RSpec: max 4 nesting levels, max 10-line examples, verified doubles
