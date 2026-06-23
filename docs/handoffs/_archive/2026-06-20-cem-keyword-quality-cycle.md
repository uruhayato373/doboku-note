# 総監キーワード品質サイクル 引き継ぎ（2026-06-20）

技術士総監（pe-comprehensive-management）キーワードページのリライト品質サイクル。本セッションで「真の低品質16本」を完了し、次は **C＝weighted 2.0–2.5 帯のリライト**。

## 完了済み（本セッション）

> [!done] 16本リライト完了（develop に5コミット）
> cem-qa が weighted<2.0 と判定した16本を全リライト → lint全合格・auto再採点3.0。
> natech / inspection-methods / halo-effect-errors / lead-time / extended-producer-responsibility / eco-label / front-loading / ics / iso-26000 / training-techniques / pha / fmea / hazop / task-based-training / visual-management / wacc-roic
> **未デプロイ**（develop 積み上げ。本番反映は `/deploy` でユーザー判断）。

> [!note] SoT を正確化済み
> `.claude/state/quality-scores.json` の古い不合格53本（陳腐化）を修正。現在 **不合格0 / 100%合格**。
> cem-qa採点146本（`qualitative_comment` 付き）は保持済み。

## C（weighted 2.0–2.5 帯のリライト）

### ✅ 最優先チャンク 24本 完了（2026-06-20、6バッチ）
cem-qa 2.00–2.19 帯の24本を全リライト → lint全合格・auto再採点 2.90–3.00。**未デプロイ**（develop 積み上げ）。
batch1 esd/likelihood/pqcdsme/liquefaction｜batch2 OEE/human-factors/SIS/contingency｜batch3 csv/global-compact/health-management/human-resource-assessment｜batch4 多目的最適化/定期点検/標準原価/目標原価｜batch5 TOC/三点見積り/並列システム/CITES｜batch6 EOP/グローバル人材/課徴金/テロリズム
共通修正＝背景H2を位置づけ前へ移動／ExamPoint末尾移動／5管理トレードオフH3新設／表前導入文・表セル短縮／参考資料の公的民間バランス是正（壊れURL・HTTP500・JISCトップ等を200確認済URLへ差替）。

### 残り: cem-qa 2.2–2.5 帯 40本（緊急度・低）
合格マージンが大きい（2.2:2 / 2.3:27 / 2.4:7 / 2.5:4）。再取得は下記コマンドの上限を `<2.5` に。先頭例: inventory-control / personal-info-protection / risk-analysis / ojt-off-jt / second-career / circular-economy / competency-hr / crisis-management-manual / delphi-method / indirect-manufacturing-cost

対象リスト再取得:
```bash
node -e 'const d=require("./.claude/state/quality-scores.json").pages;
Object.values(d).filter(p=>p.weighted>=2.0&&p.weighted<2.2&&p.qualitative_comment)
.sort((a,b)=>a.weighted-b.weighted).forEach(p=>console.log(p.weighted.toFixed(2),p.slug,"|",p.qualitative_comment))'
```

## 確立した作業レシピ（1バッチ=4本）

1. **欠陥抽出**: 各 slug に `node .claude/scripts/lint-mdx-mobile.mjs <path>` を実行し HIGH/MEDIUM を取得。`quality-scores.json` の `qualitative_comment` も併せて渡す。
2. **委託**: `keyword-rewriter`（sonnet）に1本ずつ。プロンプトに「lint欠陥＋cem-qaコメント＋修正方針」を入れる。頻出修正＝**5管理トレードオフH3新設（現場運用型）／総括ExamPointを末尾「総合技術監理における位置づけ」直下へ＋items3点／歴史・背景H2の構造順序ズレ解消／参考資料の公的＋民間バランス（§9）／factual table直下に§22インライン出典／3列表セル15字以内／alt≤80字・太字≤30字／ExamPoint items句読点なし体言止め**。
3. **エージェント厳守事項**: frontmatter維持（lastRewrittenAt/revisionCycle更新のみ可）・URLは WebFetch で200確認（**METIドメインはこの環境から到達不可**なので使わない）・git/bash実行禁止・Read/Edit/WebFetchのみ・編集後U+FFFDチェック。
4. **検証（親）**: `lint-mdx-mobile.mjs` で HIGH 0 を確認。残MEDIUMは親が外科的に潰す。
5. **再採点（親）**: 該当slugを削除→`node scripts/bulk-score.mjs`（`--all` 禁止＝cem-qaコメントを破壊する）。
   ```bash
   node -e 'const fs=require("fs");const p=".claude/state/quality-scores.json";const d=JSON.parse(fs.readFileSync(p));for(const s of [SLUGS])delete d.pages[s];fs.writeFileSync(p,JSON.stringify(d,null,2)+"\n");'
   node scripts/bulk-score.mjs
   ```
6. **コミット**: `npm run refresh-indexes` → 該当 article.mdx + quality-scores.json + src/config/*.json(5本) を **明示add**（`git add -A`禁止）→ commit。

## 罠・注意

> [!warning] 落とし穴
> - `bulk-score.mjs --all` は全ページを `scoring_method:'auto'` で上書きし **cem-qa の qualitative_comment 146本を破壊**する（本セッションで一度誤削除→git restoreで復旧）。再採点は必ず「対象slug削除→`--all`なし実行」。
> - auto再採点3.0は**機械採点**。構造・形式は直すが意味採点ではない。仕上げ確認したいなら `cem-qa` Evaluator で再評価（任意）。
> - 並列 keyword-rewriter は別ファイル編集なら競合しないが、**エージェントにgit禁止**を徹底（`git add -A` sweep事故防止）。コミットは親が明示pathで行う。
> - cem-qa の `qualitative_comment` は2026-04〜05採点。content が既に改善済みの場合あり→エージェントは現物を読んで残存欠陥のみ直す。

## 関連

- スコアリング: `scripts/bulk-score.mjs`（5軸: structure.30/mobile.25/principle.20/reference.15/linking.10、0点軸ありで weighted≤1.0 クランプ）
- ルーブリック真実源: `docs/reference/content-principles.md`（§5 ExamPoint・§9 参考資料・§19 5管理トレードオフ・§22 インライン出典）、`docs/reference/content-authoring.md`
- エージェント: `keyword-rewriter`(Generator) / `cem-qa`(Evaluator)
