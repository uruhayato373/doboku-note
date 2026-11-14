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
2. 同じ商品は 1 ページ 2 回まで、許すのは「冒頭バナー＋本文直後の再掲（`MagazineHeroCta`・ラベル `-top-end`／`-end`）」の組だけ（2026-11-14 運営者決定）。本文途中（自動の `article-mid`・手書き）で冒頭や他の枠と同じ商品を出さない（一次過去問の「冒頭商品を中間にも表示」はやめる）。記事末の `HubCtaBanner`（`-footer`）と右サイドバー（`-docs-sb`）のもくじタイルは「教材一覧の枠」として重複の数に入れない。
   - 検査の対象外（理由つきで検査コードの許可リストに書く）: 基準書 `/standards/**`（記事ページではなく別実装・広告面は配置ルールの管轄）、`/links`（商品一覧ページ）、記事末の `article-end-offsite`（ココナラ。転職アフィリエイトではない）、キャリア記事の `career-multi-register`（転職が主導線の記事・訴求設計 §12）、手書きカードが 4 枚以上ある商品一覧型の記事 7 本（集計の「B/C への引き継ぎ」の一覧。中身の構成なので枚数上限から外す。ただし同一商品の重複は直す）。
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

A 実施（2026-11-14、起点 `a7a2204e18`）。git 書き込み・claim・配置変更・CI 登録は未実施。明細は [.claude/state/quality/cta-layout-dn1198.json](../state/quality/cta-layout-dn1198.json)。

- HTML 対象 **2435**、実検査 **2435**（記事 **2279**）、取得失敗 **0**。違反 **2796 件 / 2003 ページ**。監査は想定どおり exit 1。
- 内訳: 同一商品重複 1,319 件、記事カード内 >3 枚 11 件、最初の h2 前 >1 枚 12 件、禁止面の sponsored 762 件、転職 >1 枠 691 件、既存の note 総数上限 1 件。ピクセル重複は 0 件。
- A/B は隣接する image/text の同一 CTA だけを1枚に集約。商品は UTM を除いた note URL で照合。手書きは本文内かつ article-mid 以外、自動は冒頭・途中・本文外として分類する。サイドバーは main の兄弟も検査し、転職枠は 993px 境界の切替を考慮して mobile/desktop の多い方を記録。

| ページ種別 × 原因 | 違反件数 | ページ数 |
|---|---:|---:|
| exam/guide × アフィリ | 21 | 21 |
| exam/guide × 自動同士 | 119 | 115 |
| exam/guide × 自動×手書き | 30 | 25 |
| exam/guide × 手書き同士 | 14 | 13 |
| exam/keywords × アフィリ | 17 | 17 |
| exam/keywords × 自動同士 | 697 | 697 |
| exam/keywords × 自動×手書き | 1 | 1 |
| exam/keywords × 手書き同士 | 10 | 10 |
| exam/past-exams × 自動同士 | 219 | 219 |
| exam/past-exams × 自動×手書き | 3 | 2 |
| exam/pillar × 自動同士 | 5 | 5 |
| exam/pillar × 自動×手書き | 5 | 5 |
| exam/primary × アフィリ | 8 | 8 |
| exam/primary × 自動同士 | 137 | 137 |
| exam/primary × 自動×手書き | 23 | 23 |
| exam/secondary × アフィリ | 19 | 19 |
| exam/secondary × 自動同士 | 14 | 14 |
| exam/secondary × 自動×手書き | 9 | 4 |
| exam/secondary × 手書き同士 | 9 | 4 |
| exam/textbook × アフィリ | 8 | 8 |
| exam/textbook × 自動同士 | 64 | 64 |
| non-article × 自動同士 | 1 | 1 |
| standards × アフィリ | 1380 | 690 |

原因は重複計上あり（自動と手書き2枚以上が混在する密度超過など）。ページ数も行間で重複する。全体値は JSON の violationCount / violationPages を使う。

### B/C への引き継ぎ

- **手書き同士の同一商品重複は 19 記事**。20以下なので B 内で対応可能。JSON の `rule=note-product-dup` かつ `causes` に `manual-manual` を含む行が一覧（商品URL・ラベル・配置・DOM順つき）。
- 自動枠を消しても手書きだけで3枚を超える記事は 7 本。単なる同一商品の重複除去では不足するものがある:
  - `exam/civil-construction-2/secondary/experience-writing-examples`: 手書き 16 枚
  - `exam/civil-construction-2/secondary/experience-writing-guide`: 手書き 6 枚
  - `exam/civil-construction-2/secondary/r07`: 手書き 4 枚
  - `exam/concrete-chief-engineer/guide/essay`: 手書き 18 枚
  - `exam/concrete-diagnostician/guide/essay`: 手書き 7 枚
  - `exam/pe-comprehensive-management/guide/essay-persona-guide`: 手書き 8 枚
  - `exam/rccm/guide/mondai1-keiken-ronbun`: 手書き 7 枚
- 自動同士の重複も対象。例: `exam/civil-construction-1/guide/1-vs-2` は reading-guide が article-top / article-end に各1枚。冒頭と手書きの照合だけではゼロにならない。
- **設計と既存面の衝突があるため、B/C で扱いを判断する**。基準書690ページに standards-* の広告面があり、禁止面と複数枠で計1,380件。DocPage 以外の別実装なので今回変更していない。記事末の sponsored 72ページは `article-end-offsite` のココナラ導線。転職のみの禁止と解釈して勝手に除外せず、plan の「rel=sponsored が無い」をそのまま判定した。
- `exam/civil-construction-1/guide/market-value-check` は既存の career-multi-register が2枠。`/links` は商品一覧138枚で既存の総数30上限に抵触する（記事カードの3枚上限とは別）。これらも削除・除外はしていない。

### 実行した検証

- `npm run build`: tsx CLI の IPC が sandbox で EPERM。package scripts の build チェーンを展開した後、tsx 起動を `node --import tsx`、Next を `node node_modules/next/dist/bin/next build --webpack` に置換し、同じ前後処理を完走（exit 0）。共有 node_modules・package.json は未変更。静的生成2,462ページ、最終HTML2,435件、検索索引2,103件、sitemap2,103件。コンパイルと TypeScript 検査も成功。再現コマンドと全ログ: `.tmp/dn1198-build-webpack.log`（先頭行に展開済みコマンド）。置換は再帰展開の完了後に1回だけ行う（途中で置換すると node --import が重複する）。
- `node --test tests/{cta-density,affiliate-link-keys,note-body-experiment,affiliate-design-experiment,script-helpers-ratchet,cli-args-ratchet,read-json-ratchet,scripts-no-undef}.test.mjs`: **8ファイル・34テスト、失敗0**。新規CTA回帰14テストを含む。
- `node scripts/check-cta-density.mjs --record-dn1198`: 上記2,435件を実検査、違反2,796件、exit 1。JSONを生成。
- `npm run lint`: exit 0。`git diff --check`: 違反0。`node scripts/check-task-plan-links.mjs`: plan 3件・backlog 260件、違反0。
- `npm run check-datasets`: 899追跡ファイル・296データセットを検査、違反1（新規JSONが未addのため追跡一覧に無い）。JSON自体は台帳照合・集計整合を別途1ファイル実検査し違反0。**親がadd後に再実行する**。別に DN-0262 の claim 参照切れの警告あり（claim操作は禁止されているため未変更）。
- 全体 `npm run test`（git操作を含むテストがある）と `quality:audit:ci`、画面点検は未実施。今回はAの検査関連テストに限定。B以降の配置・MDX・実験描画/計測は変更していない。
