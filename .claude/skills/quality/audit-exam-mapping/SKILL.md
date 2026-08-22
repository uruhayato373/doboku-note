---
name: audit-exam-mapping
description: >
  技術士総合技術監理部門の過去問⇄キーワード紐づけマップの精度を semantic 監査するスキル。
  `exam-keyword-mapping-auditor` エージェントを各設問に分配し、結果を集約・段階反映・NotebookLM 監査シート化する。
  Use when user asks to [過去問紐づけ監査, exam-keyword 精度向上, /audit-exam-mapping, mapping audit].
---

## 用途

`.claude/state/exam-keyword-map.json` の紐づけ精度を体系的に監査し、追加/削除候補を confidence 付きで surface する。`auto_apply` 階層は機械的に反映、`needs_review` 階層は NotebookLM サンプリング監査用シートに切り出す。

対象は **技術士総合技術監理部門（PE）のみ**。1 級土木は Phase 4 で抽象化予定。

## 関連エージェント・スクリプト

| ファイル | 役割 |
|---|---|
| `.claude/agents/exam-keyword-mapping-auditor.md` | 過去問 1 問の紐づけを評価する Evaluator |
| `.claude/scripts/build-keyword-summaries.mjs` | auditor Stage 2 用の事前資産（`keyword-summaries.json`）生成 |
| `.claude/scripts/apply-audit-result.mjs` | 監査差分 JSON を機械的に exam-keyword-map.json に反映 |
| `.claude/state/exam-keyword-map.json` | 単一正源（読み書き対象） |
| `.claude/state/keyword-summaries.json` | 658 件のキーワード要約（事前生成） |
| `.claude/state/improvements/pe-priority-2026-05-11.json` | リライト優先度（A/B/C/C'/D）注釈源 |
| `.claude/state/exam-keyword-audits/{year}/{date}.json` | 監査差分の保存先 |
| `.tmp/notebooklm-audit/{year}-{date}.md` | NotebookLM 投入用シート |

## サブコマンド

### `audit-year {year}` — 該当年度の全設問を監査

```
/audit-exam-mapping audit-year r07
```

**前提条件**: `keyword-summaries.json` が最新であること。なければ実行:

```bash
node .claude/scripts/build-keyword-summaries.mjs
```

**処理フロー**:

1. **対象 anchor 列挙**: `.claude/state/exam-keyword-map.json` の `pe-comprehensive-management.{year}-primary` から全 anchor を取得
2. **auditor 並列起動**: 各 anchor について `exam-keyword-mapping-auditor` agent を起動
   - 入力: `exam_slug` / `anchor` / `current_slugs`
   - 出力: 監査 JSON（標準出力）
   - 並列度: 5（trip count 過大対策）
3. **集約**: 全 anchor の JSON を `.claude/state/exam-keyword-audits/{year}/{YYYY-MM-DD}.json` に統合
4. **サマリレポート**: 標準出力に集計（auto_apply / needs_review / reject の件数バランス）

**集約 JSON スキーマ**:

```json
{
  "version": 1,
  "audit_date": "2026-05-11T13:00:00Z",
  "year": "r07",
  "exam_slug": "pe-comprehensive-management-r07-primary",
  "category": "pe-comprehensive-management",
  "summary": {
    "anchors_total": 40,
    "anchors_with_changes": 22,
    "candidates_add_auto_apply": 18,
    "candidates_add_needs_review": 12,
    "candidates_remove_auto_apply": 5,
    "candidates_remove_needs_review": 8
  },
  "has_needs_review": true,
  "anchors": {
    "1-25": { ... auditor 出力 ... }
  }
}
```

**並列実行ガード**: `audit-year` 実行中は他の `audit-year` 起動を拒否（同一年度の重複は意味なし、別年度は順次でも問題なし）。

### `apply {audit-path}` — 差分を機械的に反映

```
/audit-exam-mapping apply .claude/state/exam-keyword-audits/r07/2026-05-11.json
```

`apply-audit-result.mjs` を直接呼ぶ。既定では `auto_apply` 階層のみ反映。

**オプション**:

| オプション | 動作 |
|---|---|
| `--dry-run` | 反映なしで差分プレビュー |
| `--include-needs-review` | `needs_review` 階層も反映（NotebookLM 監査後の確定反映に使用） |
| `--tier auto_apply` | 反映する tier 指定（既定 `auto_apply`） |

**反映後の手動ステップ**:

```bash
npm run refresh-indexes
git diff .claude/state/exam-keyword-map.json
```

差分に問題なければ commit。問題があれば `rollback` で復元。

### `export-notebooklm-sheet {audit-path}` — needs_review シート生成

```
/audit-exam-mapping export-notebooklm-sheet .claude/state/exam-keyword-audits/r07/2026-05-11.json
```

監査 JSON から `needs_review` tier のエントリのみを抽出し、NotebookLM 投入用の markdown を生成:

`.tmp/notebooklm-audit/{year}-{YYYY-MM-DD}.md`

**シート構造**:

```markdown
# 監査シート R07 一次択一 (needs_review のみ)

監査日: 2026-05-11
出力件数: 12 (candidates_to_add 7 + candidates_to_remove 5)

## R07 Ⅰ-1-25 度数率
- 現紐づけ: frequency-rate, occupational-safety-management
- 削除候補: occupational-safety-management (confidence 0.72)
  - 理由: 本文が設問論点に直接触れていない、周辺概念のみ
  - 判定: [ ] 採用 [ ] 却下 [ ] 保留

## R07 Ⅰ-1-26 リスク評価
- 追加候補: alarp-principle (confidence 0.78)
  - 理由: 選択肢肢3の文中に「ALARP 判断」あり
  - 判定: [ ] 採用 [ ] 却下 [ ] 保留
```

**NotebookLM 投入手順（手動）**:

1. NotebookLM で新規ノートブック作成
2. ソースとしてアップロード:
   - 該当年度の過去問 PDF（`.claude/pdfs/exam/pe-comprehensive-management/{year}/`）
   - 上記シート markdown
   - シートに登場するキーワードページ MDX（最大 40 本、50 ソース上限内に収める）
3. NotebookLM の Q&A で論点確認（例: "Ⅰ-1-25 の正答肢が ALARP に直接言及しているか"）
4. シートの判定欄を `[x]` 採用 / `[x]` 却下 で埋める
5. 採用分のみ抽出して手動で `exam-keyword-map.json` を編集、または `apply --include-needs-review` で一括反映

### `verify-needs-review {audit-path}` — 過去問 notebook で needs_review を検証

過去問 NotebookLM notebook（`総監一次択一過去問`、`/build-exam-notebook` で構築）が利用可能な場合、教材ベース推論より高精度な検証が可能。`needs_review` tier の追加/削除候補に対し、過去問本体に grounded したクエリで採用/却下を支援する。

```
/audit-exam-mapping verify-needs-review .claude/state/exam-keyword-audits/r07/2026-05-11.json
```

**処理フロー**:

1. 監査 JSON を読み、`needs_review` tier のエントリを抽出
2. 各エントリの `exam_question` から年度を抽出し、過去問 MDX の該当 `## Ⅰ-1-N` セクション本文を取得
3. `notebooklm-cross-query.mjs` で「過去問 notebook + 総監標準テキスト」へ並列クエリ:
   ```bash
   node .claude/scripts/notebooklm-cross-query.mjs \
     --notebooks "総監一次択一過去問,総監標準テキスト" \
     "{設問の概要}。この設問で {候補 slug の概念} は本質的な論点か？"
   ```
4. 結果を `.tmp/notebooklm-audit/{year}-{date}-verified.md` に集約。各エントリの判定欄に「過去問本体 grounded 回答」と「教材ベース回答」を並置

**前提条件**: `/build-exam-notebook` で `総監一次択一過去問` notebook が構築済みであること（少なくとも対象年度の source が ready）。未構築の場合は exit 1 + ガイダンス。

### `rollback {date}` — backup から復元

```
/audit-exam-mapping rollback 2026-05-11
```

`.claude/state/exam-keyword-map.backup-{date}.json` を `exam-keyword-map.json` に上書きコピーし、`npm run refresh-indexes` を実行。

**注意**: rollback 後は backup ファイルを残す（再 audit のときに証跡として）。

## 段階リリース運用

| Phase | 範囲 | DoD |
|---|---|---|
| MVP | R07 1 年度のみ | auto_apply 反映 + needs_review シート出力までの一連動作確認 |
| Phase 2 | R03–R07 5 年度 | 受験直結期間。auto_apply 件数 / 総候補 が 60–80% に収まる |
| Phase 3 | 平成年度（H21–H30） | 12 年度バッチ。低優先度なので分散実行 |
| Phase 4 | civil-construction-1 への抽象化 | カテゴリ別 `exam-keyword-map.json` を立てる前提の改修 |

## 既存スキルとの関係

| スキル | 関係 |
|---|---|
| `/exam-keyword-cycle` | **直交**。cycle は MDX 本文校正、本 skill は JSON マップ監査。cycle Phase 2 の「論点カバレッジ Grep 判定」は本 skill の auditor 出力に置換可能（cycle SKILL.md 改修済） |
| `/exam-backlinks` | **下流**。本 skill が `exam-keyword-map.json` を更新したら、`/exam-backlinks rebuild` が派生 JSON を再生成（または `npm run refresh-indexes` で代替） |
| `/verify-exam-coverage` | **補完**。verify はキーワードページ側の MDX 内カバー判定、本 skill は紐づけマップ側の精度。両方走らせる場合は本 skill → verify の順 |
| `/quality-cycle` | **統合候補**。Phase 2 以降で `/quality-cycle --mode audit-mapping` として組み込み検討 |

## Issue #202 リライト戦略との連携

監査 JSON の `keyword_priority_annotations` は `pe-priority-2026-05-11.json` から参照付与されるアノテーション。**マージ禁止**（正源を分けて保つ）。

`apply` 完了後の別レポート（手動 or 将来 skill 化）で次を surface:
- Priority A が `uncovered_issues` に頻出 → 紐づけ補強で expose 増チャンス
- Priority D が `auto_apply` で大量追加 → リライト負債増の警告

## 失敗パターン

- **keyword-summaries.json 古い**: キーワード MDX 改修後に再生成し忘れると Stage 2 が古い定義で評価する。`audit-year` 開始時に summary の `generated_at` を確認すること
- **rollback 連打**: backup ファイルは日付別なので、同日 2 回 rollback すると最後の backup で上書きされる。日付を跨ぐ確認推奨
- **needs_review を放置**: NotebookLM 監査の負担を軽くしたい場合、confidence 閾値を一時的に上げて auto_apply 件数を絞る運用が可能。ただし精度トレードオフ
- **PE 以外への適用**: 本 skill は PE 専用ハードコード。civil-construction-1 で動かすと `pe-comprehensive-management.{year}-primary` の探索が失敗する
