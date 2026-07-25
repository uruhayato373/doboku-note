# 1級・2級土木 サイト／note導線 修正作業票

> [!todo]
> **2026-07-24 実装待ち**：対象3記事のCTAを検索意図に合わせて修正し、ソース・公開note・監査結果を一致させる。

## 1. 目的

サイトからnote、note記事同士、noteからサイトの導線監査で見つかった、次の問題を解消する。

1. `経験記述-AI設計-無料` に購入導線と「土木もくじ」への帰路がない。
2. 1級・2級の一次検定過去問PDFで、二次経験記述商品が第一CTAになり、検索意図と購入段階がずれている。
3. 対象3記事でソースと公開noteのCTA反映状態が一致していない。

導線全体のSSOTは `.claude/knowledge/reference/note-funnel-architecture.md`、機械可読SSOTは `.claude/config/note-funnel.json`。本書は今回の実装作業票であり、新しい競合SSOTではない。

## 2. 対象

### 記事

- `docs/note/1級・2級土木/経験記述-AI設計-無料/article.md`
  - note: `n0171b3105e2d`
- `docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/article.md`
  - note: `n155093f42183`
- `docs/note/1級・2級土木/2級土木/一次択一-過去問PDF/article.md`
  - note: `n4963f45bd6f8`

### 設定・SSOT

- `.claude/config/note-funnel.json`
- `.claude/knowledge/reference/note-funnel-architecture.md`
- 必要な場合のみ `scripts/audit-note-funnel.mjs` とテスト

### 正式URL

- Brain AI設計キット: `https://brain-market.com/a/b5EDO3UjMgoTZsNWa0JXY`
- 1級一次 出る順合格ノート: `https://note.com/dobokunote/n/nec34238ca6d6`
- 土木もくじ: `https://note.com/dobokunote/n/n4fde0f62dc20`
- 除去対象・1級二次まるごと: `https://note.com/dobokunote/m/md29a34906314`
- 除去対象・2級想定工事バンク: `https://note.com/dobokunote/m/m8554e87ca6ec`

## 3. 完成する導線

```text
サイトの広い入口
  └─ 土木もくじ
      ├─ 1級一次
      ├─ 1級二次
      ├─ 2級一次
      └─ 2級二次

1級一次PDF
  ├─ 冒頭: 1級一次 出る順合格ノート
  └─ 末尾: 土木もくじ

2級一次PDF
  └─ 末尾: 土木もくじ

AI設計の無料記事
  ├─ 冒頭または商品説明直後: Brain AI設計キット
  └─ 末尾: 土木もくじ
```

サイト側の `src/lib/hub-cta.ts`、高意図記事の `MagazineCard`、UTM計測は今回変更しない。現在の「広い入口はもくじ、高意図の二次記事は対応商品」の構造を維持する。

## 4. ソース実装

### 4.1 機械可読SSOT

`.claude/config/note-funnel.json` の `exams.civil.topCtaExcludeDirs` に次を追加する。

```json
"経験記述-AI設計-無料",
"1級土木/一次択一-過去問PDF",
"2級土木/一次択一-過去問PDF"
```

既定 `cta:pack-top` の監査対象から外すためであり、記事固有CTAを消す意味ではない。

### 4.2 AI設計記事

商品説明の直後に次のブロックを追加する。価格は `src/lib/brain-products.ts` が変わり得るため本文に固定しない。

```md
<!-- cta:civil-ai-kit -->
自分の工事経験を入力し、設問整理・答案案・独立レビュー・字数検査までClaude Codeで回したい方は、「施工経験記述 設計キット」の詳細をご確認ください。

https://brain-market.com/a/b5EDO3UjMgoTZsNWa0JXY
```

記事末尾の免責より前に、既存SSOTと同じ末尾CTAを追加する。

```md
<!-- cta:civil-mokuji -->
1級・2級土木のほかの記事・経験記述の答案集は「土木もくじ」から一覧できます。

https://note.com/dobokunote/n/n4fde0f62dc20
```

### 4.3 1級一次PDF

現在の `<!-- cta:pack-top -->` から `md29a34906314` へ送るブロックを、次に置換する。

```md
<!-- cta:civil-1-primary-ronten -->
過去問を解くだけでなく、過去12年の出題頻度から「どの分野を優先するか」まで決めたい方は、1級土木 第1次検定「出る順 合格ノート」もあわせてご覧ください。

https://note.com/dobokunote/n/nec34238ca6d6
```

末尾 `cta:civil-mokuji` は残す。`md29a34906314` は本文から除去する。

### 4.4 2級一次PDF

現在の `<!-- cta:pack-top -->` から `m8554e87ca6ec` へ送るブロックを削除する。一次向けの代替商品がないため、無理に商品CTAを置かない。

末尾 `cta:civil-mokuji` は残す。`m8554e87ca6ec` は本文から除去する。

## 5. サブエージェント構成

Claude Codeでは生成と評価を分離する。

1. 親エージェント
   - SSOT確認、編集方針、ソース変更、Playwright更新、最終判定を担当。
2. `note-funnel-auditor`
   - 変更前後の意味監査だけを担当。ファイル変更は禁止。
3. `note-operator`
   - 既存スクリプトと公開noteの整合確認を補助。戦略判断・本文執筆はさせない。

並列編集はしない。サブエージェントには監査・確認だけを任せ、同じ3記事を複数エージェントに編集させない。

## 6. 公開noteへの反映

### 原則

- note編集は Playwrightスクリプトと永続プロファイルを使う。
- MCP Playwrightはログインプロファイルを引き継がないため、note更新には使わない。
- 更新前に `dobokunote` アカウントであることを確認する。
- 既定はdry-run。対象、差分、有料境界を確認してから `--commit`。
- 更新通知は必ず「いいえ」。
- 有料2記事は価格と `paidBoundary` を維持する。
- 全選択削除＋pasteは禁止。

### 推奨手段

対象3記事はソース本文を正として `scripts/note-update-body.mjs` を使用する。まずdry-runし、問題がなければ `--commit` する。

```bash
node scripts/note-update-body.mjs \
  --article "docs/note/1級・2級土木/経験記述-AI設計-無料/article.md"

node scripts/note-update-body.mjs \
  --article "docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/article.md" \
  --keep-boundary

node scripts/note-update-body.mjs \
  --article "docs/note/1級・2級土木/2級土木/一次択一-過去問PDF/article.md" \
  --keep-boundary
```

dry-runで記事ID、アカウント、本文長、有料境界、更新内容が正しいことを確認後、同じコマンドに `--commit` を付ける。

`--keep-boundary` が安全条件を満たさない場合は保存せず中断し、frontmatterの `paidBoundary` を使った `--boundary-h2` を検討する。場当たり的な一回限りスクリプトを先に作らない。

## 7. 検証

### ソース

```bash
node scripts/note-lint.mjs "docs/note/1級・2級土木/経験記述-AI設計-無料/article.md"
node scripts/note-lint.mjs "docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/article.md"
node scripts/note-lint.mjs "docs/note/1級・2級土木/2級土木/一次択一-過去問PDF/article.md"
npm run audit-note-funnel
npm run check-note-funnel
npm run check-note-republish
```

確認事項:

- civilのD1/D6がゼロ。
- review surfacerに対象3記事が不適合候補として出ない。
- 1級一次に `nec34238ca6d6` が1回あり、`md29a34906314` がない。
- 2級一次に `m8554e87ca6ec` がない。
- AI記事に `b5EDO3UjMgoTZsNWa0JXY` と `n4fde0f62dc20` が各1回ある。

`check-note-republish` は他カテゴリの既存driftで失敗してもよいが、対象3記事の状態を必ず個別報告する。

### ライブ

```bash
npm run audit-note-funnel -- --live
```

公開APIまたはブラウザで次を実査する。

- `n0171b3105e2d`: Brain URLと土木もくじURLが存在。
- `n155093f42183`: 出る順URLと土木もくじURLが存在し、二次まるごとURLが存在しない。
- `n4963f45bd6f8`: 土木もくじURLが存在し、2級想定工事バンクURLが存在しない。
- 1級一次は有料価格 `1980`、2級一次は `1480` のまま。
- 有料プレビュー境界が更新前後で維持されている。
- 更新通知を送っていない。

### 意味監査

`note-funnel-auditor` に対象3記事と `土木もくじ` を監査させ、次を確認する。

- 資格セグメント整合
- 一次／二次の検索意図整合
- CTA文面の関連性
- 行き止まりの不存在

## 8. 完了条件

- 3記事のソースが本書どおり。
- `.claude/config/note-funnel.json` が記事固有CTA方針と一致。
- note-lintが3記事すべて成功。
- civilのソース監査D1/D6がゼロ。
- civilのライブ監査D5がゼロ。
- 公開noteの期待URL／除去URL／有料価格／境界を実査済み。
- `docs/handoffs/YYYY-MM-DD-civil-note-funnel-remediation.md` に変更・検証・未解決を記録。
- 関係ファイルだけを明示的にstageする。`git add .` と `git add -A` は使わない。

## 9. 非スコープ

- サイト側Hub CTAや季節切替の再設計
- 2級一次向け新商品の企画・制作
- 他資格の137件のnote→サイトUTM違反
- noteの価格変更
- 新規記事公開
- deploy
