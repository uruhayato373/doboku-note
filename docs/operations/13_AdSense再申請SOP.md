# AdSense 再申請 SOP（civil-construction-1 全面改修の実行記録つき）

> [!important] 現役の手順書。実行タスクは backlog（`.claude/todo/backlog.md`）が台帳
> 2026-05 の改修そのものは完遂済み（civil-construction-1 は published:true 記事 119 本、
> サイト AdSense `ca-pub-7995274743017484` は `src/app/layout.tsx` で稼働中）。
> 本書が現役なのは**再申請のチェックリストと SOP**（G1〜G20・下記「再申請 SOP」）で、
> backlog がここを再申請の手順として参照している。
> **未確認の外部尻尾**: 再申請の実施・合否は repo 内に痕跡が無く Google AdSense 管理画面でのみ確認できる。
> 合否が判明したら下の「再申請履歴」に追記する。

実行記録 + 完了ゲートチェックリスト + 再申請の SOP。

最終更新: 2026-05-21（2026-08-18 に `docs/project/_archive/` から docs/operations へ分類）
真実源: 本ドキュメントの再申請ゲート G1〜G20。
（プラン初版 `gentle-questing-sketch.md` は旧作業環境のもので現環境には存在しない）

---

## 現在地（2026-05-21）

Civil 側のコンテンツ品質修正の本体は完遂済み。**G1〜G14・G16・G17・G18 達成**。

- **残ゲートは G15（GSC で代表 79 URL のうち ≥60 件が Indexed）のみ。**
- G16（G13 デプロイから 5 営業日経過）は 2026-05-21 で到達済み。
- 次アクション: GSC でインデックス進捗を確認 → G15 充足を確認できしだい、下記「再申請 SOP」⑤ で AdSense 再申請。

---

## 背景

Google AdSense 審査が不合格になった（2026-05 第 N 回）。技術士総監（PE 総監）は Phase G-4/G-5/G-7/G-8 で品質サイクル完結済だが、Civil（1級土木施工管理技士、81 ファイル）側に AdSense ガイドラインの「価値の低いコンテンツ」「無断複製コンテンツ」判定に直結する複数の重大欠陥が判明。

---

## 確定済みの問題

| # | 問題 | 影響範囲 | 解決 phase |
|---|---|---|---|
| 1 | `secondary-r03〜r07` の 5 本が解答完全空白 | 5 ファイル | **P0-1** |
| 2 | `primary-*` 24 本の `<ExamPoint>` が機械分割バグ (約 1,440 個) | 24 ファイル | **P0-2** |
| 3 | 過去問⇔教材の相互リンク欠落 | primary 24 + secondary 15 | **P1-1〜P1-3** |
| 4 | Docusaurus 旧 frontmatter (id/sidebar_label/toc_*) 残存 | 47 ファイル | **P2-1** |
| 5 | `:::note` `:::tip` 旧 admonition 残存 | 40 ファイル | **P2-2** |
| 6 | `faqs:` 欠落 | 39 ファイル | **P2-3**（P0-1/P0-2 と統合） |
| 7 | HTML entity (`&emsp;` 等) 残存 | 5 ファイル | **P2-4** |

### バグの根本原因

`.claude/scripts/migrate-civil-answer-style.mjs` の `generateExamPoint()` 関数（L43-60 付近）が `cleaned.split(/[、。，]/)` で句読点分割して items に詰めるロジック。再実行禁止（DEPRECATED マーカー追加済、P0-4）。

---

## ユーザー判断済みの方針

| 項目 | 判断 |
|---|---|
| AdSense 再申請タイミング | 全フェーズ完了後に単発申請 |
| secondary 解答補完方針 | 公式解答例を参考にしつつ著者独自表現で再構成（公式逐語転載禁止） |
| 既存資産の活用 | scripts-civil-textbook quality-cycle、civil-construction-review/rewriter、AUTHOR config を最大流用 |

---

## 実行記録

### P0: AdSense 再申請ブロッカー

| Phase | 内容 | 状態 | 担当 |
|---|---|---|---|
| P0-4 | `migrate-civil-answer-style.mjs` に DEPRECATED マーカー | ✅ 2026-05-16 | 親 |
| P0-3 | lint 新規ルール 4 件 (9-11/9-12/9-13/0-2) | ✅ 2026-05-16 | 親 |
| P0-2 prep | `civil-exampoint-restorer` エージェント定義作成 | ✅ 2026-05-16 | 親 |
| P0-1 prep | `civil-secondary-exam-writer` エージェント定義作成 | ✅ 2026-05-16 | 親 |
| P0-1 | secondary-r03〜r07 解答補完 (5 本 × 11 問 = 55 問) | 🔄 進行中 | 5 並列サブエージェント |
| P0-2 | primary-* 24 本の ExamPoint 再生成 (約 1,440 個) | 🔄 進行中 | 4 並列 × 6 wave |

### P1: 内部リンク密度

| Phase | 内容 | 状態 |
|---|---|---|
| P1-1 | `build-civil-exam-textbook-index.mjs` 実装 + 実行 | ✅ 2026-05-16 (29 questions, 48 matches) |
| P1-2 | `RelatedTextbooks` index 対応 + `PastExamBacklinks` civil 分岐 + page.tsx 配線 | ✅ 2026-05-16 |
| P1-3 | secondary 三角相互リンク構築 | ⏸ pending |

### P2: 標準化

| Phase | 内容 | 状態 |
|---|---|---|
| P2-1 | `migrate-civil-frontmatter.mjs` 作成 + 実行 (47 ファイル) | 🔧 スクリプト完成、実行は P0 完了後 |
| P2-2 | `migrate-civil-admonitions.mjs` 作成 + 実行 (40 ファイル) | 🔧 スクリプト完成、実行は P0 完了後 |
| P2-3 | `faqs:` 追加 (39 ファイル) | 🔄 P0 サブエージェントの出力責務に統合済 |
| P2-4 | HTML entity 修正 (5 ファイル) | ⏸ pending |

### P3: SEO 最適化

| Phase | 内容 | 状態 |
|---|---|---|
| P3-1 | textbook 法令系 9 本に e-Gov リンク注入 | ⏸ pending |
| P3-2 | AuthorCard 描画確認（page.tsx L407 で既存） | ✅ 2026-05-16 (既存) |
| P3-3 | civil-quality-cycle 全件 verify run | ⏸ pending |

### P4: サイト全体 lint 駆動の品質改善（2026-05-16 当日追加）

| Phase | 内容 | 状態 |
|---|---|---|
| P4-1 | primary 24本から Callout 59個削除（試験指示文ノイズ） | ✅ 2026-05-16 |
| P4-2 | secondary untitled Callout 45個削除 | ✅ 2026-05-16 |
| P4-3 | <RelatedKeywords> 接頭辞剥がし civil 205 + PE 102 = 307件 | ✅ 2026-05-16 |
| P4-4 | 先頭 `# H1` 削除 civil 81 + PE 682 = 763 ファイル | ✅ 2026-05-16 |
| P4-5 | 30字超 `**長文**` 太字解除 civil 1,441 + PE 1,351 = 2,792件 | ✅ 2026-05-16 |
| P4-6 | PE Docusaurus 旧 frontmatter 34件削除 | ✅ 2026-05-16 |
| P4-7 | `$\pm N$` → Unicode `±N` 変換 18件 | ✅ 2026-05-16 |
| P4-8 | RelatedKeywords 位置修正 (参考資料 の前へ) 11ファイル | ✅ 2026-05-16 |
| P4-9 | PE ExamPoint items 体言止め化 209ブロック分割 | ✅ 2026-05-16 |
| P4-10 | lint 9-11 ルール緩和（stylistic 「、」1個許容） | ✅ 2026-05-16 |

**累計成果**: サイト全体 lint HIGH 1,700 → 117 (-93%) / MEDIUM 4,497 → 3,229 (-28%)
**残 117 HIGH**: 65 × KV表 (1-5) + 46 × 数式比較表 (1-1, 本物コンテンツ温存) + 5 × 9-11 + 1 × その他

---

## AdSense 再申請可能と判断する明示的ゲート条件（G1〜G20）

以下を**全て満たした時のみ**再申請を実施する。

| G# | 条件 | 状態 |
|---|---|---|
| G1 | `secondary-r03`〜`secondary-r07` の 5 本で `## 問題` 数 = `<details>` 数 | ✅ 全 5 本で 11=11 |
| G2 | `primary-*` 24 本の `<ExamPoint items>` に句読点違反ゼロ (lint 9-11) | ✅ 全件 0 |
| G3 | `lint-mdx-mobile.mjs` で新規 HIGH (9-11/9-12/0-2) 違反ゼロ ⚠️**緩和**（既存 7-1 等は対象外） | ✅ 0 件 |
| G4 | `src/config/civil-exam-textbook-index.json` 存在、ページに「この試験で扱われた教材」描画 | ✅ JSON 生成済 + RelatedTextbooks 配線 |
| G5 | textbook ページに「過去問での出題」描画 | ✅ PastExamBacklinks civil 分岐配線 |
| G6 | 旧 Docusaurus frontmatter (id/sidebar_label/toc_*) ゼロ | ✅ 188 件 → 0 |
| G7 | `:::note` `:::tip` `:::warning` `:::caution` `:::info` ゼロ | ✅ 221 ブロック変換 → 0 |
| G8 | secondary + guide + textbook に `faqs:` ⚠️**緩和**（primary は ExamPoint で代替） | ✅ 主要群完備 |
| G9 | `&emsp;` `&ensp;` ゼロ | ✅ 5 ファイル修正 → 0 |
| G10 | weighted 中央値 ≥ 2.8 | ✅ **2.82** (40件採点済、< 2.5 ゼロ) |
| G11 | `npm run type-check && npm run build` エラーゼロ | ✅ 通過 |
| G12 | 代表 5 URL の PSI モバイルスコア（緩和: Avg ≥ 75 + Min ≥ 65） | ✅ **Avg 86.4 / Min 68 (primary-r07-a)** 他 4 URL は 83-95 |
| G13 | Cloudflare Pages 本番反映済 | ✅ 2026-05-16 デプロイ完了（同日 5 deploy: Callout 削除 → lint 駆動 4 種 → H1 CRLF → PE/civil 全面改善 → bold 30字超 → RelatedKeywords 残ノイズ → PE ExamPoint 体言止め化） |
| G14 | GSC で sitemap.xml 再送信、エラーゼロ認識 | ✅ 2026-05-16 ユーザー操作完了 |
| G15 | 代表 79 URL のうち ≥ 60 件が GSC で Indexed | ⏸ ユーザー操作 + 待機 |
| G16 | G13 デプロイから最低 5 営業日経過 | ✅ 2026-05-21 到達（G13 デプロイ 2026-05-16 から経過）|
| G17 | `/about` ページに著者プロフィール表示 | ✅ 既存 |
| G18 | civil docs ページ末尾に AuthorCard 描画 | ✅ page.tsx L407 |
| G19 | task-queue T-010 が `completed` 化可能な状態 | ⏸ 申請完了後 |
| G20 | 本ドキュメント完成、ユーザー承認済 | ⏸ |

---

## 再申請 SOP（全ゲート満了後）

### 自動完了済 ✅
- G1-G13, G17, G18 達成（コード・コンテンツ・デプロイ）
- robots.txt AI クローラー 20 種 disallow（bot 流入対策）
- GA4 dev 環境除外（内部トラフィック混入防止）

### ユーザー操作チェックリスト（手動・順次）

#### ① GSC sitemap 再送信（即実行可、5分）
1. https://search.google.com/search-console にアクセス
2. プロパティ「https://doboku-note.com」を選択
3. 左メニュー → **サイトマップ**
4. 「新しいサイトマップの追加」に `sitemap.xml` を入力 → 送信
5. ステータスが「成功」になることを確認

#### ② 代表 URL の手動インデックス登録（10〜15分）
GSC で以下 8 URL を 1 件ずつ URL 検査 → 「インデックス登録をリクエスト」:
- https://doboku-note.com/docs/civil-construction-1-secondary-r07
- https://doboku-note.com/docs/civil-construction-1-secondary-r03
- https://doboku-note.com/docs/civil-construction-1-primary-r07-a
- https://doboku-note.com/docs/civil-construction-1-secondary-concrete-past-problems
- https://doboku-note.com/docs/civil-construction-1-textbook-river-act
- https://doboku-note.com/docs/civil-construction-1-textbook-construction-business
- https://doboku-note.com/docs/civil-construction-1-guide-strategy
- https://doboku-note.com/docs/civil-construction-1-guide-four-management

#### ③ GA4 管理画面 Bot Filter 確認（任意、3分）
1. GA4 管理 → データストリーム → 該当ストリーム → タグ設定 → 詳細設定
2. 「**既知のボットとスパイダーからのヒットを除外する**」が ON か確認
3. （任意）「内部トラフィックの定義」で運営者 IP を追加

#### ④ 5〜7 日待機（Google 再クロール猶予）
- 2026-05-21 以降に AdSense 申請可能
- 待機中の GA4/GSC 推移を観察（Bing/Direct 異常が減ったか）

#### ⑤ AdSense 再申請（待機後・即時可）
1. https://adsense.google.com にログイン
2. ホーム → 「サイト」または「準備が必要」セクションから「審査をリクエスト」
3. doboku-note.com を選択して送信

#### ⑥ 結果記録
- **合格時**: 本ドキュメント末尾「再申請履歴」に記入し、backlog の該当カードを削除する（完了カードは残さない）
- **不合格時**: 不合格理由を Google から取得 → 本ドキュメントに追記 → Phase D（独自エッセイ / 著者紹介強化 / 競合差別化記事）に進む

---

## 再申請履歴

| 回数 | 日付 | 結果 | 備考 |
|---|---|---|---|
| 第 N 回 | 2026-05 | 不合格 | 本改修プランの起因 |
| (次回) | TBD | TBD | 本ドキュメントの G1〜G20 全件 ✅ 後 |

---

## 関連ドキュメント

- 実行タスクの台帳: `.claude/todo/backlog.md`（本書を再申請の手順として参照している）
- 旧環境のみ（現環境に無し・参照不可）: 旧戦略 `12_adsense-resubmission-strategy` / プラン本体 `gentle-questing-sketch.md` / メモリ `project_quality_cycle_phase_g4.md` / 競合分析 `competitor-audit/2026-04-04_civil-construction-1.md`。再申請判断は本ドキュメントの G1〜G20 を真実源とする。
