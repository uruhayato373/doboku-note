---
title: 2026-05-17 PE カテゴリ整理 + mlit-whitepaper-2025 リライト + Callout 使用観点策定
date: 2026-05-17
session_focus: 試験概要セクションの分割／白書R7×16ペアトレードオフ攻略への全面書き換え／Callout使用観点5判定基準の確立
related_memory:
  - project_mlit_theme_articles
  - project_v3_strategy
related_handoffs:
  - 2026-05-17-mlit-theme-articles-completion.md
related_commits: []  # 未commit
---

# 2026-05-17 セッション引き継ぎ — PE カテゴリ整理 + Callout 観点

## 何が起きたか（1 行）

カテゴリページの guide セクションを 2 分割し、`mlit-whitepaper-2025` を白書R7×16ペアトレードオフ完全攻略へ全面リライト、その後 Callout 過多のフィードバックを受けて **「Callout 使用観点（5 判定基準）」を策定**し再利用可能なルール化を行った。コミットはまだしていない。

## 作業内容

### 1. カテゴリページ分割（src/app/category/[slug]/page.tsx）

- guide セクションに混在していた essay-mlit-* 7 記事を、slug パターン `/essay-mlit-/` で分離
- 新セクション「白書テーマ別 記述対策」を guide と pillar の間に挿入
- frontmatter / classifier には手を入れず、ページ側のフィルタリングのみで対応
- 結果: 試験概要（8件）／白書テーマ別 記述対策（7件）／5 管理学習ガイド／過去問／キーワードを探す の 5 セクション構成

### 2. `mlit-whitepaper-2025` 全面リライト

- 旧: 白書ハブ（10.6k 字、Callout 中心の資料インデックス）
- 新: 白書R7×16ペアトレードオフ完全攻略（21.8k 字 → 後の Callout 整理で 52,314 バイト = ~25k 字）
- 構造: 5 管理マッピング → 解決フレーム5選 → 主軸別 4 ペア × 4 主軸（安全／社会環境／経済性／人的資源）= 16 ペア → 論文締めの定型 → R8 出題予想
- 各ペアは「対立の構造／評価軸／解決フレームワーク／残余リスクと監視」の 4 点構造
- 出典: ユーザーが NotebookLM（白書R7 ソース）で生成した思考プロセス
- スラッグ / URL / guide_order:5 / FAQ など hub-spoke 構造は維持（essay-mlit-* 7 本 + management-tradeoffs からの逆リンクを切らない）

### 3. Callout 使用観点の策定と適用（10 → 2）

ユーザーの「個数に拘らず、観点で整理すべき」フィードバックを受けて以下を確立。

**5 つの判定基準（順に当てはめる）**

1. 本文を担っているか？（Callout 内に主要コンテンツが詰まり、外の本文が空 → NG → 散文化 or SpecSheetList）
2. 本文と二重に書いていないか？（重複 → どちらか削除、§17 に沿って Callout を削る）
3. 「答案に転写したい／後で見返したい」強い利用シーンがあるか？（YES → 残す正当理由）
4. 本文と別レイヤーの誘導（商業 CTA／致命警告／重要なお知らせ）か？（YES → 残す）
5. 同種 Callout が 3 個以上並列していないか？（並列なら SpecSheetList に統合）

**type と用途の対応**

| type | 使う場面 | 使わない場面 |
|---|---|---|
| tip | 商業 CTA、note magazine 誘導 | 一般的な助言・記事の使い方紹介 |
| note | （本記事では使わない） | 主要数字の集約（→ SpecSheetList） |
| example | 「そのまま転写可」な答案テンプレ | 散文中で十分伝わる例示 |
| warn / danger | 致命的な誤解を防ぐ警告 | 単なる注意 |
| exam | 単発の出題頻度アクセント | 早見表の代替（→ SpecSheetList） |

**適用結果**: Callout 10 → 2（example「論文締めの定型（答案転写用）」+ tip「具体的な設問予想と模範論文」）

## 検証済み

- HTTP 200 / Callout 2 個 / U+FFFD 0 / CRLF なし
- 主要キーワード SSR 残存（白書R7 60／16ペア 48／ALARP 18／残余リスク 72／論文締め 16）
- カテゴリページに「白書×トレードオフ16ペア」(shortTitle) が guide_order:5 の位置で表示

## 未完了・次やるべきこと

### 必須（次セッションで即座に）

1. **コミット**: 2 ファイル変更（page.tsx + article.mdx）が未 commit。`npm run refresh-indexes` 実行後にコミット
   - `git add src/app/category/[slug]/page.tsx .local/r2/posts/pe-comprehensive-management/mlit-whitepaper-2025/article.mdx .local/r2/posts/pe-comprehensive-management/mlit-whitepaper-2025/index.json`（refresh-indexes 後の派生も）
   - commit メッセージ案: `site(pe): mlit-whitepaper-2025 を白書R7×16ペアトレードオフ完全攻略へリライト + カテゴリ guide 分割 + Callout観点5基準で2個に削減`

2. **掲載品質の人手レビュー**: 16 ペアセクションは NotebookLM 由来テキストをもとに筆者解釈で再構成。試験本番受験者目線で、特に以下を確認
   - 同じペアが主軸違いで重複している箇所（経済性×安全 ↔ 安全×経済性 など）の差分が立っているか
   - 解決フレームの根拠（白書R7 の数字・制度）が正しく引用されているか
   - 残余リスク段落のモニタリング手段が現実的か

### 中期（横展開）

3. **Callout 使用観点を content-principles に恒久化**: 今回策定した「5 判定基準 + type 対応表」を `docs/reference/content-principles.md` §7 の下に追記。今後の記事執筆と既存記事監査の基準として使う
   - 追加すべき場所: §7「Callout はメリハリをつけるために使う」の直後
   - 追加見出し案: 「§7.1 Callout 使用観点（5 判定基準）」

4. **既存記事の Callout 監査**: 観点を適用して総監・1級土木の主要記事をスキャン
   - 優先順位: management-tradeoffs（29.5k 字、Callout 2 個 = 健全）→ essay-mlit-* 7 本（リライト中、要確認）→ keyword-2026 / last-minute-2026
   - スキャン手段: `find .local/r2/posts -name article.mdx | xargs grep -c '^<Callout' | awk -F: '$2>3'` で上限超過記事を抽出

5. **note magazine CTA の本文化**: tip「具体的な設問予想と模範論文」は公開時に UTM 付き note リンクを差し込み予定。note magazine 本番リリース時に CTA を実 URL に置換

### 周辺確認

6. dev サーバー（ポート 3020）は起動中。停止する場合は手動で kill
7. `npm run refresh-indexes` 未実行（リライト後の backlinks 反映が pending）

## 参考リソース

- プランファイル: `/Users/minamidaisuke/.claude/plans/http-localhost-3020-docs-pe-comprehensiv-rippling-shamir.md`（Callout 観点プランの全文）
- 関連記事: `/docs/pe-comprehensive-management-management-tradeoffs`（一般論 6 ペア）／`/docs/pe-comprehensive-management-essay-exam-strategy`（試験時間管理）
- content-principles §7 / §17: Callout と散文中心の真実源
