# 2026-10-16 共通仕様書の仕上げ（節分割・北海道版・表の組み直し）— マージと後片づけの引き継ぎ

> [!note] 状態
> 実装はすべて PR #1092（`feat/standards-common-finish`・base develop・最終 cfe794a78）に入っている。残りはマージ判断・worktree の後片づけ・表の断片の残り（DN-0755）だけ。別の PC（Mac 含む）から続ける前提で書く。済んだら残りを DN-0755 のカードへ移し、このファイルを削除する。

## 何ができているか（PR #1092）

- **一般施工の節分割**: 出力が `sectionPages.minOutputBytes`（200000）を超える章を節ごとのページに分ける（現在は 3-2 だけ）。分割は `src/lib/standards-section-split.mjs`、目次は `StandardSectionIndex`、検査 16。
- **北海道版の章立て**: `config/standards-structure.json` に北海道版（`bodyStartPage` 87・見出しの補正）。比較では別の仕様書として扱う（`comparison.separateDocuments`）。
- **表の組み直し 217 件**: `content/sources/standards/tables/{key}.json`（承認済みだけ使用・文字の過不足ゼロ）。検査 14 が生成器とは別の実装で照合する。
- **読みやすさの検査 17〜19**: 文の途中の改行・表から外れた断片・壊れた表。基準値は `config/standards-structure.json` の `readabilityBaselines`（ラチェット。直したら下げる）。
- **描画の検査**: `e2e/standards-render.spec.ts`。対象は「中身が異なるページすべて」168 ページ（`scripts/lib/standards-render-targets.mjs`）。目視用の一覧は `npm run standards-table-gallery`。
- **再現性**: 道具 `npm run standards-tables`、エージェント `standards-table-writer` / `standards-table-qa`、流れはスキル `/standards-table-rebuild`。原本のページ画像は Drive vault（`原資料PDF/共通仕様書/`）、vault が見えない PC は原本から `render`（SHA-256 照合つき）。

## 残り

1. **PR #1092 のマージ**: CI が全部通ってから運営者が判断する（コード系なので PR 経由）。本番へは `/deploy`、後に `npm run check-production-ssr` が exit 0 で完了。
2. **worktree の後片づけ**（マージ後・作った PC で）: `.claude/worktrees/standards-common-finish` の `node_modules` はジャンクションなので、先に PowerShell で `cmd /c rmdir` → `Test-Path` で消えたことを確かめてから `git worktree remove`。中の `.tmp/`（旧手順書・原本 PDF・ページ画像）は作り直せるので一緒に消えてよい。
3. **DN-0755**: 近畿版に表から外れた断片が 7〜8 件残る（検査 18 の基準値）。`/standards-table-rebuild` で回し、直したら `readabilityBaselines` を下げる。

## 別の PC で始めるとき

- `git pull origin develop`（マージ前なら `git fetch && git switch feat/standards-common-finish`）→ `npm ci`。
- 表の作業を始めるなら `/standards-table-rebuild` を読む。作業物は `.tmp/standards-tables/` に作り直される。
- Windows で Playwright のブラウザが無いときは `standards-table-gallery -- --channel msedge`。Git Bash では `MSYS_NO_PATHCONV=1` を付けないと `/standards/…` の引数が化ける。
