---
name: civil-keiken-magazine
description: >
  1級・2級土木 第2次検定「施工経験記述」の note 有料マガジン用フル模範答案を、Generator
  (civil-keiken-essay-writer) → Evaluator (civil-keiken-essay-qa) で生成・採点する。
  過去問年度別 / テーマ別完成答案集 / 予想問題集 の3種に対応。サイト無料記事とは重複させず
  (Red Line #4)、規格値は捏造せずプレースホルダ運用、改変前提テンプレとして打ち出す。
  Use when user asks to [施工経験記述マガジン, 模範答案を作成, 経験記述の模範解答, 過去問模範答案集, 予想問題集を作る, /civil-keiken-magazine].
user-invocable: true
---

## 用途

土木施工管理技士 第2次検定 問題1（施工経験記述）の **note 有料マガジン記事**（フル模範答案）を作る。手書きせずエージェント駆動で量産・採点する。サイト（無料 SEO 本体）はフル答案を持たず、note 有料がフル答案を担う三層分業（Red Line #4）。

## 引数

| 引数 | 必須 | 説明 |
|---|---|---|
| `--grade {1\|2}` | ✓ | 1=監理技術者レベル / 2=主任技術者レベル |
| `--type {pastexam\|theme\|yosou}` | ✓ | 過去問年度別 / テーマ別完成答案集 / 予想問題集 |
| `--slug <name>` | ✓ | 記事スラッグ（R0X / 管理名 / 新方向名）。複数可 |
| `--koushu <list>` | | 使用工種（既存と重複しないものを指定。省略時は親が既存を読んで割当） |

## 実行手順

1. **既存把握（重複回避）**: 対象級の既存マガジン全 article.md ＋ サイト `secondary-experience-writing-{guide,examples}` を確認し、使用済み工種・現場設定を洗い出す。`pastexam` はサイト `secondary-r0X` の問題1（公式問題文）を正として用意。
2. **生成**: `civil-keiken-essay-writer`（Generator/sonnet）を slug ごとに起動。工種は既存と別、規格値は `〇〇` プレースホルダ、形式は級・年度どおり、置換ガイド・失格注意を必須。
3. **採点**: `civil-keiken-essay-qa`（Evaluator/sonnet）で5軸採点＋必須ゲート。平均≥2.0 かつ全ゲート通過で合格。不合格は Generator に修正指示で再走。
4. **配線（親）**: `_meta.yaml` / `note-magazines.ts` エントリ / `magazine-placement.ts` / `scripts/pdf-specs/{magazine}.json` を整備（PDF は生成せず spec の JSON 妥当性＋見出し存在のみ確認＝オンデマンド方針）。
5. **検証・commit（親）**: `npm run type-check`、明示パスで commit（並行作業を巻き込まない）。

## 完了条件

- 各記事 U+FFFD 0 / 本文価格直書き 0 / サイト・既存マガジンと答案重複 0
- Evaluator 合格（平均≥2.0・全ゲート通過）
- 形式が級・年度どおり（PDF spec の include 見出しと整合）

## 担当エージェント

- Generator: `civil-keiken-essay-writer`
- Evaluator: `civil-keiken-essay-qa`

## 関連

- 紙用 PDF 化（オンデマンド）: `/magazine-to-pdf --spec scripts/pdf-specs/{magazine}.json`
- サイト過去問ページの解答補完: `civil-secondary-exam-writer`
- プラン: `docs/note/{1級土木,2級土木}/*施工経験記述プラン.md`
