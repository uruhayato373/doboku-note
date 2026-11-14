---
taskId: DN-1198
type: implementation-plan
createdAt: 2026-11-14
deleteOnComplete: true
---

# 記事ページの商品導線（note・アフィリエイト）の整理

## Context

`/exam/civil-construction-1/guide/exam-overview` などで、note 商品のカードが冒頭に続けて並び、1 ページに何枚も出ている。調査で原因が分かった。

- **自動配置と MDX 手書きが互いを見ていない**。冒頭バナー（`MagazineTopBanner`）・本文途中（`rehypeMidCta`）・本文直後（`MagazineHeroCta`）の自動配置と、MDX 手書きの `<MagazineCard>`（140 記事 293 箇所）が独立に動く。重複除去は「途中は冒頭と別商品」「手書きがあれば本文直後を出さない」の 2 つだけ（`src/lib/magazine-placement.ts:291-345`）。
- exam-overview で実際に見える note は 5 枚: 冒頭バナー → 直下の手書きカード（`article.mdx:43`）→ 途中の自動カード → 終盤の手書きカード（`:246`）→ 記事下のもくじタイル。
- HTML 上で同じリンクが 2 本続くのは A/B 実験 EXP-053（running）が 2 案を両方描いて片方を CSS で隠すためで、**見えるのは 1 枚**。不具合ではない。
- 既存の検査 `scripts/check-cta-density.mjs`（note 枠 ≤ 3）は、手書きカードを数えず、A/B の隠れた案を 2 と数える。だから今の状態が通っている。

## 画面幅でどう変わるか（現状と方針）

現状、CTA は**画面幅で部品も画像も切り替えていない**。変わるのは大きさだけ。

| 幅 | 本文内の CTA | サイドバー |
|---|---|---|
| 〜992px（スマホ・タブレット） | 同じ部品・同じ画像（2:1）を幅いっぱいに縮小 | なし |
| 993px〜（PC） | 同じ | もくじタイル 1 枚（6:5）＋追従する目次 |

方針: **枠の数と順番は全幅で共通にし、スマホを基準に決める**。PC はサイドバーの 1 枚が増えるだけ。幅別の画像・バナーは作らない（画像は 2:1 と 6:5 の 2 種のまま。`<picture>` を足すと画像の制作と台帳 `pop-image.json` が倍になる）。幅で調整するのは余白・カードの縦横の組み方だけ。

## 配置ルール（design-system.md §8.5 を改定）

1. 記事カード内で見える note は最大 3 枚（手書きを含めて数える）。記事下のもくじタイルは別枠で 1 枚。
2. 同じ商品は 1 ページ 1 回。
3. 最初の h2 より前に手書きの `<MagazineCard>` がある記事は、冒頭バナーを出さない（手書きを優先）。
4. 手書きカードが 2 枚以上ある記事は、本文途中の自動 note 枠を出さない（関連記事と転職カードの枠は残す）。
5. 転職アフィリエイトは現行維持（2026-11-14 運営者の決定）。面を増やすかは EXP-048 の判定（12/26）の後に決める。

EXP-053・EXP-048 の描画と計測は触らない。

### 面ごとの型とサイズ（§8.5 に表で書く）

| 面 | note | 転職アフィリエイト |
|---|---|---|
| 冒頭 | バナー 1 枚（画像 2:1・全幅） | 出さない |
| 本文中 | カード（画像 2:1 か文章型・EXP-053） | 文章型の小型カード 1 枠・全幅。1024px 以上は EXP-048 の対象者だけ 2 社横並び |
| 記事末 | もくじタイル 1 枚（6:5・幅 300） | 出さない（2026-10-21 に閉鎖・画像 0.014% 対 文章 0.14%） |
| 右サイドバー（993px 以上） | もくじタイル 1 枚（6:5） | 出さない（2026-09-26 に撤去） |

- 300×250 の支給バナーは記事ページでは使わない（カテゴリのサイドバーなど記事以外の面は現行の配置ルールのまま）。
- 手順 1 の検査に「記事ページの記事末・サイドバーに `rel=sponsored` が無いこと」「転職カードが 1 ページ 1 枠（2 社並びは 1 枠と数える）」を足して固定する。

## 手順

1. **検査を直す**（`scripts/check-cta-density.mjs` を拡張。新しいスクリプトは作らない）
   - 手書きカードを数に入れる（`data-cta-label` の語尾ではなく `data-cta` の種類で数える）
   - A/B の 2 案（`data-note-body-arm`）は 1 枚と数える
   - 追加の判定: 同一商品の重複、最初の h2 より前の note 2 枚、見える note > 3
   - 出力は検査ページ数・違反数・原因別（自動×手書き／手書き同士）の集計。`tests/` に回帰テスト
2. **全ページの現状を出す**: `npm run build` → 拡張した検査を `out/` に実行。違反の一覧をページ種別×原因で集計
3. **共通部品で直す**
   - `src/components/docs/DocPage.tsx`（310-393・475・497）: MDX の手書きカードの id と位置を集め、`resolvePlacement` へ渡す
   - `src/lib/magazine-placement.ts`: ルール 2〜4 の除外を実装
   - 手書き同士の重複だけが残る記事は、一覧を出して MDX を個別に直す（`lib/mdx-io.mjs` の `writeMdxFile`。件数は手順 2 で確定）
4. **画面で確かめる**: `config/site-visual-review.json` に「手書きカードのある guide」（exam-overview）を足し、`/site-visual-review` を 375・768・1440 で回す。ここで記事下の「PR がテキストで見える」箇所の見え方も判定に入れる（部品の特定は未了。`CareerAffiliate` か `ArticleFooter` の転職枠のどちらかを撮影で特定する）
5. **ゲート化**: 拡張した検査を `quality:audit:ci` に入れる。design-system.md §8.5 と `reference_site_magazine_cta_firing.md`（旧パスが残っている）を更新

## 分業

### モデルとエフォートの割り当て

この端末の Codex（0.162.1）で選べるのは `gpt-6-astra`（最上位）・`gpt-5.6-sol`・`gpt-5.6-terra`（単純作業向け）・`gpt-5.6-luna`（速さ優先）。既定は `gpt-6-astra`・エフォート `high`（`~/.codex/config.toml`）。エフォートは low〜ultra。

考え方は 3 つ。

- **セッションは手順ではなく文脈のまとまりで切る**。切るたびにコードを読み直すので、3 本にまとめる。
- **上位モデル×高エフォートは「間違えると売上の導線が消える」所だけ**に使う。仕様が決まっている作業は下げる。
- **既定の `high` のまま全部を流さない**。各セッションで `-m` と `-c model_reasoning_effort=` を明示する。

| # | 作業 | 担当・モデル | エフォート | 理由 |
|---|---|---|---|---|
| 0 | DN-1198 起票・この plan（済み・2026-11-14） | Claude | — | — |
| A | 手順 1・2: 検査の拡張とテスト、build、全ページの集計 | Codex `gpt-6-astra` | `medium` | 判定の仕様はこの plan で確定済みなので深い推論は不要。ただし検査が甘いと偽の緑になるので、モデルは下げない |
| B | 手順 3: `DocPage.tsx`・`magazine-placement.ts` の配置ロジック | Codex `gpt-6-astra` | `high` | 自動配置・手書き・EXP-053・商品の到達性検査が絡む。ここだけ高くする |
| B' | 手順 3 の MDX 個別修正（手書き同士の重複） | Codex `gpt-5.6-terra` | `low` | 一覧に沿った機械的な置換。20 記事以下なら B の中で済ませ、別セッションにしない |
| C | 手順 4・5: 画面の点検、文書の更新、CI への登録、PR | Codex `gpt-5.6-terra` | `medium` | 手順が決まっている。撮影の判定はトークンの大半が画像で、エフォートを上げても効かない |

上げ下げの規則:

- 同じテスト・検査が 2 回続けて落ちたら、そのセッションだけ 1 段上げる（A: `medium`→`high`、C: モデルを `gpt-6-astra` へ）。
- `xhigh` 以上は使わない。B が `high` で 2 回詰まったら止めて運営者へ報告する。
- C の点検で不合格が出たら、直すのは B の設定（`gpt-6-astra`・`high`）で、直す対象は共通の部品。
- Claude 側の追加レビューは置かない。合否は検証の節のコマンドと CI で決める（CLAUDE.md §9）。

起動の形（モデルの指定は実行時だけ。リポジトリに設定を残さない・CLAUDE.md §5）:

```bash
codex exec -C <worktree> -m gpt-6-astra -c model_reasoning_effort="medium" "$(cat <起動プロンプトA>)"
```

Codex は worktree（`~/.codex/worktrees/`）の feature ブランチ 1 本で A→B→C を順に進め、PR の base は `develop`。A の終わりに違反の集計を commit し、B・C はそれを読んで始める（同じ調査をやり直さない）。

## 検証

- `node scripts/check-cta-density.mjs`: 検査ページ数 > 0・違反 0 件
- `npm run test`・`npm run type-check`・`npm run lint`・`npm run quality:audit:ci`
- `curl -s localhost:3025/exam/civil-construction-1/guide/exam-overview` で `<main>` と「土木」、見える note が 3 枚以下
- `npm run site-visual-review -- prepare --keys guide,<追加した key>` → record が exit 0
- `tests/magazine-page-gate`・`monetization-coverage`・`check-magazine-cta-reachability` が緑（公開商品がどこにも出なくなっていないこと）

## 起動プロンプト

共通の前置き（3 本とも先頭に付ける）:

> doboku-note の DN-1198 を進める。`.claude/plans/DN-1198-cta-layout.md` を読み、確定設計・配置ルール・面ごとの型の表に従う。`npm run todo:claim -- DN-1198` で担当を確保済みか確かめる（A が確保する）。作業は worktree `~/.codex/worktrees/dn-1198` のブランチ `feat/dn-1198-cta-layout`（`origin/develop` から）で行い、`git add` は変更したファイルだけ指定する。EXP-053・EXP-048 の描画と計測は変えない。転職アフィリエイトの面は増やさない。

**A（`gpt-6-astra`・`medium`）**: 手順 1・2 を行う。`scripts/check-cta-density.mjs` を拡張し（数え方は plan の手順 1、アフィリの判定は「面ごとの型とサイズ」の箇条）、`tests/` に回帰テスト（違反あり・なし・A/B の 2 案を 1 枚と数える・検査 0 件は exit 1）を足す。`npm run build` のあと全ページに実行し、違反をページ種別×原因（自動×手書き／手書き同士／アフィリ）で集計して `.claude/state/quality/cta-layout-dn1198.json` に書き、件数の要約を plan の末尾「集計」に追記して commit・push する。この時点では検査を CI に入れない（違反が残るため）。

**B（`gpt-6-astra`・`high`）**: A の集計を読んで手順 3 を行う。`DocPage.tsx` で MDX の手書き `MagazineCard` の商品 id と位置（最初の h2 より前か）を集め、`magazine-placement.ts` の `resolvePlacement` にルール 2〜4 の除外を入れる。手書き同士の重複が 20 記事以下ならこのセッションで MDX を直し（`lib/mdx-io.mjs` の `writeMdxFile`）、超えるなら一覧を plan に書いて B' に回す。build→拡張した検査で違反 0、`npm run test`・`type-check`・`lint`・`check-magazine-cta-reachability`・`tests/magazine-page-gate`・`monetization-coverage` が緑になったら commit・push。

**B'（`gpt-5.6-terra`・`low`・必要なときだけ）**: plan の一覧の記事だけ、重複した手書き `MagazineCard` を 1 枚に減らす（残すのは本文の文脈に近い方）。1 記事ごとに `npm run refresh-indexes` の後で commit。

**C（`gpt-5.6-terra`・`medium`）**: 手順 4・5 を行う。`config/site-visual-review.json` に exam-overview を足し、`/site-visual-review` のスキル原本（`.claude/skills/site-visual-review/SKILL.md`）の手順で 375・768・1440 を撮って判定・記録する。記事下の「PR がテキストで見える」部品を撮影で特定し、不合格なら直さずに plan へ書いて B の設定で直す。合格したら拡張した検査を `quality:audit:ci` に入れ、design-system.md §8.5 に面ごとの型の表を書き、`.claude/memory/reference_site_magazine_cta_firing.md` の旧パスを直す。`npm run quality:audit:ci` 緑を確かめて PR（base `develop`）を作る。

## 集計

（A が追記する）
