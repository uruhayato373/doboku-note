# 試験別コンテンツ整備方針 + レビュー視点

doboku-note は複数の資格試験を扱うが、試験ごとに「**何を / どこまで / どの粒度で書くか**」が異なる。デザインの一貫性は保ちつつ、コンテンツ密度・忠実性・出題反映度は試験ごとに方針を変える。

**いつ読むか**: PDF→MDX 変換時（`/pdf-to-mdx --exam civil-construction-1`, `/pdf-to-mdx --exam cem`, `/pdf-to-mdx`）、品質レビュー時（`/improve-article --mode verify`, `/review`）、新資格追加時。

このファイルは **執筆フェーズ（Generator 側）** と **レビューフェーズ（Evaluator 側）** の両方の判断基準を統合している。

---

## Part 1: 執筆フェーズ — 試験別コンテンツ整備方針

### 試験別の整備方針差分

| 観点 | 1級土木 textbook | 1級土木 guide | 総監キーワード | 総監過去問 |
|---|---|---|---|---|
| **目的** | 教科書の電子化 | 出題傾向の要約 | キーワード集の概念解説 | 過去問の解説 |
| **真実源** | 教科書 PDF 原本 | 過去問+編集判断 | キーワード集2026 | 過去問 PDF |
| **コンテンツ密度** | 高（網羅95%以上） | 中（ポイント抽出） | 低（要約中心） | 高（逐条+解説） |
| **典型的な長さ** | 5,000-15,000字 | 2,000-5,000字 | 800-2,500字 | 3,000-8,000字 |
| **図の標準量** | 多数（断面・配筋・施工写真） | 少数（重要箇所のみ） | ほぼゼロ（テキスト中心） | 原本準拠（あれば） |
| **数式** | 頻出（W/C 比・配合・力学） | 限定的 | 少ない | 問題文に応じて |
| **Generator スキル** | `/pdf-to-mdx --exam civil-construction-1` | 手動編集 | `/keyword-page` | `/pdf-to-mdx` `/pdf-to-mdx --exam cem` |
| **Evaluator エージェント** | `civil-construction-qa` (textbook mode) | `civil-construction-qa` (guide mode) | `cem-qa` | `content-qa` |

### 試験別の判断ガイド

#### 1級土木 textbook（`group: textbook`）

- **整備の目標**: 元教科書 PDF をモバイルで読める形に電子化する
- **網羅率**: PDF の章節見出しを **95% 以上** カバーすること（切り捨てしない）
- **図**: PDF にある図はすべて取り込む。300dpi 以上、natural ≥ display を維持
- **数式・規格表**: 教科書通りに正確に転記。KaTeX で記述
- **執筆ツール**: `/pdf-to-mdx --exam civil-construction-1` を使い、Phase 5 で `/improve-article --mode verify` を必ず実行

#### 1級土木 guide（`group: guide`）

- **整備の目標**: 過去問データに基づき、受験者が「ここを押さえれば得点できる」要点を抽出
- **網羅率**: 教科書全部ではなく、**頻出トピックのみ**（出題頻度表を冒頭に置く）
- **過去問バックリンク**: 主要セクションごとに対応する過去問へのリンクを張る（双方向）
- **図**: 重要な概念のみ図示。過剰に貼らない
- **執筆ツール**: 手動編集（Generator スキルなし）。テンプレートとしては `essay-exam-strategy` 等を参照

#### 1級土木 primary（`group: primary`、一次過去問）

- **整備の目標**: 公開済み一次検定 過去問を逐条解説する
- **構造**: 問題ごとに H2 `## 問題 No.N`、解答は `<details>` で開閉式、各問題に `<ExamPoint>` 1 個（最大 1 個）
- **ExamPoint ルール**: `summary` 30〜50 字（本質）、`items` は体言止め 1〜3 個（≤60 字、句読点禁止）。詳細は [content-principles.md §5「items の禁止パターン」](./content-principles.md) 参照
- **過去歴**: `migrate-civil-answer-style.mjs` の `generateExamPoint()` バグで約 1,440 個の壊れた items が生成された（2026-04-24）。修復は `civil-exampoint-restorer` Generator サブエージェントを使う（2026-05-16 起動）
- **執筆ツール**: 既存リライトは `civil-exampoint-restorer`、新規変換は `/pdf-to-mdx --exam civil-construction-1`

#### 1級土木 secondary（`group: secondary`、二次過去問）

- **整備の目標**: 公開済み二次検定 過去問の解答例・ポイント・各設問解説を補完する
- **構造**: 問題ごとに H2 `## 問題 N`、各問題に `<details>` ブロックで `### ポイント` → `### 解答例` → `<ExamPoint>`（最大 1 個）
- **著作権配慮（最重要）**: 試験元 = 公益財団法人 全国建設研修センター（CECC）。問題文の転載は公益目的・出典明示で OK、**解答・解説は著者独自表現で再構成（公式解答例の逐語転載禁止）**
- **経験記述問題**: 解答例を提示せず「書き方ヒント」「記述パターン」を `### 書き方ヒント` セクションで提示
- **出典表記**: ファイル末尾 `**関連コンテンツ**` の直前に `## 出典` セクション必須（CECC・著者独自再構成の明示）
- **執筆ツール**: `civil-secondary-exam-writer` Generator サブエージェント（2026-05-16 起動、AdSense 再申請対応）
- **lint**: 9-12 で `## 問題` 数 > `<details>` 数（解答欠落）を機械検出

#### 総監キーワード（`group: keyword`）

- **整備の目標**: キーワード集2026 の各キーワードを **1 ページ 800-2,500 字** で完結させる
- **網羅率**: 教科書ではなくキーワード集を真実源とし、「冒頭定義 → サブ概念 → 総合技術監理における位置づけ → 参考資料」の構造で要約
- **コンポーネント原則**: ExamPoint 最大 2 個、参考資料は公的 + 民間の両方必須、過去問への双方向バックリンク
- **図**: 原則ゼロ。テキストとコンポーネントで表現
- **執筆ツール**: `/keyword-page` スキル

#### 総監ガイド（`group: guide`）

- **整備の目標**: 受験戦略・学習計画・俯瞰ハブとして、サイト内回遊と note 有料コンテンツへのコンバージョンを担う
- **網羅率**: 教材原典を網羅する必要はない。出題傾向・学習導線・5管理トレードオフ俯瞰など、独自編集の付加価値で構成
- **典型的な長さ**: 2,000-8,000 字（俯瞰系は長め、戦略系は短め）
- **構造**: キーワードページ専用セクション（`## 総合技術監理における位置づけ` / `## 参考資料` / `## 参考文献`）は **使用禁止**。末尾は Type-1「○○の選択肢」型（戦略・実務手順系）または Type-2「次のステップ」「関連リソース」型（俯瞰・分析系）。詳細は [content-principles.md §20](./content-principles.md)
- **外部リソース**: 公的資料への離脱を最小化（必要なら本文中インラインリンクで言及、末尾セクション化禁止）。コンバージョン地点として設計
- **執筆ツール**: `/exam-guide` スキル（PE ガイド末尾テンプレ参照）。手動編集も可
- **Evaluator**: 未割当（lint-mdx-mobile.mjs カテゴリ 12 で構造違反を機械検知。Phase 2 で `guide-qa` 検討）
- **lint**: 12-1（位置づけ混入）/ 12-2（参考資料・参考文献混入）/ 12-3（末尾 H2 が承認パターン外）

#### 総監過去問（`group: past-exam`）

- **整備の目標**: 公開済み過去問を逐条解説する
- **網羅率**: 設問単位で 100%（漏らさない）
- **構造**: 設問ごとに H2、解答・解説は `<details>` で開閉式。`<RelatedKeywords>` で関連キーワードへ
- **執筆ツール**: `/pdf-to-mdx` `/pdf-to-mdx --exam cem` `/pdf-to-mdx --exam civil-construction-1`
- **図版反映時の caption / alt**: **問題文に無い情報を一切追加しない**。構造・関係・分類など受験者が判断すべき情報を漏らさない。詳細・NG/OK 例は [docs/reference/image-policy.md §過去問図の caption / alt](./image-policy.md#過去問図の-caption--alt--問題文に無い情報を絶対に追加しない) 参照（2026-04-26 追加、Issue #128 起因）

---

## Part 2: レビューフェーズ — コンテンツ別レビュー視点

試験ごとに「正しい状態」の定義が異なるため、レビュー時に評価軸を自動で切り替える。新資格を追加する際の指針にもなる。

| 観点 | 総監キーワード（cem-qa）| 1級土木 textbook（civil-construction-qa）| 1級土木 guide（civil-construction-qa）|
|---|---|---|---|
| **真実源** | キーワード集2026 + content-principles.md | 元の教科書 PDF 原本（章節構造） | 複数 PDF を編集統合した記事 |
| **テキスト網羅性** | 不要（要約が正解） | **95% 以上必須**（教科書を切り捨てない） | 不要（出題範囲を抽出） |
| **図の標準量** | **ほぼゼロ**（テキスト中心） | **多数**（断面・配筋・施工写真） | 少なめ（重要箇所を図示） |
| **図の検証** | しない（False Positive 多発する） | **視覚比較 + 寸法 + 切れ・ノイズ検出** | あるものだけチェック |
| **コンポーネント原則** | ExamPoint 最大2個・特殊ルール多数 | 一般 MDX ルール（特殊なし） | guide 固有要素（出題頻度表など） |
| **数式** | 少ない | **頻出**（W/C 比・配合計算・力学） | 限定的 |
| **表** | 2軸比較のみ厳格 | **規格表・配合表など 4列以上も許容** | 出題頻度表 |
| **参考資料** | 公的＋民間の両方必須 | 教科書 PDF が原本 | 公的資料 + 過去問へのリンク |
| **過去問バックリンク** | 双方向必須 | 不要 | **過去問への誘導が重要** |
| **モバイル視認性** | review-mobile 厳格 | 図のレスポンシブが課題 | review-mobile 適用 |

**判定方法**: `/improve-article --mode verify` スキルが MDX の `category` と `group` から自動判定し、適切な Evaluator エージェントへ振り分ける（cem-qa / civil-construction-qa / content-qa）。詳細は各エージェント定義 `.claude/agents/*.md` を参照。

---

## Part 3: 全試験で共通のデザイン制約

試験を問わず、以下は **必ず統一** する。これによりサイト全体のデザイン一貫性が保たれる:

- **frontmatter スキーマ**: `title`, `description`, `category`, `tags`, `group`, `published`, `publishedAt`（必須項目）
- **MDX コンポーネント**: `<Callout>`, `<ExamPoint>`, `<CustomUnorderedList>`, `<RelatedKeywords>`, `<Timeline>`, `<PdcaCycle>`, `<details>` を試験横断で使用
- **モバイル視認性ルール**: 表は2軸比較のみ、4列以上禁止、計算手順は番号付きリスト、3列以上の表はセル15字以内
- **数式**: KaTeX 一択
- **図表**: Mermaid / PNG / SVG
- **画像配信**: R2 経由 `/posts/{slug}/img/` パスで参照
- **URL**: フラット `/docs/{slug}` 設計
- **見出し階層**: H1 = ページタイトル、H2-H4 = 本文構造
- **絵文字禁止**: 装飾絵文字は本文に使わない（Callout の type で表現）
- **MDX 書き込み**: `.claude/scripts/lib/mdx-io.mjs` 経由で改行コード保持

詳細は [content-authoring.md](./content-authoring.md) を参照。

---

## Part 4: 新資格を追加するときの手順

1. Part 1 の「試験別の整備方針差分」表に新しい列を追加して整備方針を決定
2. Part 2 の「コンテンツ別レビュー視点」表にも対応する列を追加
3. 必要なら `{exam-id}-pdf-to-mdx`（Generator スキル）と `{exam-id}-qa`（Evaluator エージェント）を新設
4. `/review` のディスパッチ表（`.claude/skills/dev/review/SKILL.md`）に行を追加
5. `/improve-article --mode verify` のルートテーブル（`.claude/skills/authoring/improve-article --mode verify/SKILL.md`）に行を追加
6. このファイル（exam-content-policy.md）と `agents-registry.md` を更新

---

**真実源参照**: このファイル内の情報が他のドキュメント（CLAUDE.md・SKILL.md・エージェント定義）と矛盾した場合、`docs/reference/content-principles.md` > このファイル > 他 の優先順位で判断する。
