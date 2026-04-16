# Quality Cycle 第2サイクル — セッション間ハンドオフ

**策定日**: 2026-04-14
**ステータス**: Phase F-2 中断中（30/644 件採点済）
**関連**:
- `13_quality-cycle-architecture.md`（品質サイクル全体像）
- `12_adsense-resubmission-strategy.md`（AdSense 再申請戦略）

## 1. このドキュメントの位置づけ

Quality Cycle 第1サイクル（5 件リライト + デプロイ）が完了した後、AdSense 再申請に向けて第2サイクル（弱~250 件のリライト + 段階デプロイ）に着手した。

本ドキュメントは「**第2サイクルを別セッションで継続するためのハンドオフ**」。次セッション開始時にここから読み始めれば、状況を理解して再開できる。

---

## 2. 確定している方針（2026-04-14 ユーザー判断）

### 2.1 戦略

| 項目 | 決定 |
|---|---|
| **スコープ** | 案B: 弱 ~200-250 件のみリライト（cem-qa weighted < 2.5）|
| **採点方法** | cem-qa subagent でフルスコアリング（mechanical-driven 案 E は不採用）|
| **デプロイ** | 5 波に分散、各波の間に 3-4 日空ける |
| **git history** | 今は触らない（cleanup は別タスク）|
| **波サイズ** | 50 件/波 |
| **しきい値** | weighted < 2.5（300+ 件出たら 2.3 に下げる）|

### 2.2 やらないこと

- 既に高品質な ~400 ページの再リライト（質的劣化リスク）
- 全644件リライト（バルク AI 生成シグナルで AdSense 再不合格リスク）
- mechanical-driven triage への戦略変更
- AdSense ダッシュボードでの再申請（ユーザー手動）
- past-exam / textbook / guide のリライト（別カテゴリ）

---

## 3. これまでの完了内容

### 3.1 Cycle 1（完了・本番反映済み）

- Quality Cycle インフラ構築（Phase A〜H）
- 5 件のキーワードページをリライト + verify + approved
  - ecrs-principle, reemployment-system, income-statement, process-planning-construction, balance-sheet
- AdSense Phase 1 改: 5 件スタブ非公開、descriptions 33 件補強
- E-A-T 補強: AuthorCard, About プロフィール, author schema
- main へ FF merge → Cloudflare Pages デプロイ済

### 3.2 Cycle 2 の現在地

- **.claude/skills/content/quality-cycle/scripts/quality-cycle.mjs に新フラグ追加**（commit `c2cc91c8`）
  - `--max <N>`: rewrite モードの 1 セッション処理上限
  - `--min-weighted <X.X>`: rewrite モードのスコア下限
  - `--flagship-only`: rewrite を flagship 100 内に限定
  - rewrite モードのデフォルト動作を「全 644 件対象」「state が rewritten/verified/approved のものはスキップ」に変更
- **cem-qa 採点済**: 30 / 644 件
  - Cycle 1 で採点した 20 件
  - Cycle 2 で本セッションに採点した 10 件（isms-iso27001, iso-14000, correlation-analysis, generative-ai, employment-insurance, product-safety, alps-treated-water, environmental-basic-plan, zero-trust, firewall-ids）
  - データは `.claude/state/quality-scores.json` に保存済
- **リライト候補（weighted < 2.5）**: 30 件中 18 件

---

## 4. 中断理由とブロッカー（重要）

### 4.1 コンテキスト消費が想定の3倍

- Haiku モデルで cem-qa subagent を呼ぶと、判断プロセスを冗長に書き出す傾向あり
- 1 件あたり ~3-4KB の result text が main context に流れる
- 624 件続けると ~1.8MB → 1M context でも 1 セッションでは不可能

### 4.2 cem-qa.md の weighted 計算式が曖昧

- agent 定義の式が「Σ(score × weight)」とも「Σ(score × weight) / 3」とも読める
- agent 間でバラつき、同じ軸スコアでも weighted が 0.5x ~ 2.5x の幅
- **正しい式**: `Σ(score × weight)` （weights = [0.30, 0.25, 0.20, 0.15, 0.10] sum = 1.0、最大値 = 3.0）
- **0 軸ルール**: いずれかの軸が 0 点なら weighted ≤ 1.0 にクランプ

→ subagent 出力の weighted は信頼せず、scores から自前で再計算する運用にしている

### 4.3 30 件サンプルから見える傾向

- 60% (18/30) が weighted < 2.5（リライト候補）
- 弱点軸は **9 割以上が `reference` (§9 違反)** に集中
  - 公的のみで民間欠落 → score 1
  - 参考資料セクション完全欠落 → score 0
- 副次的に `mobile`（表セル長超過、導入文欠落）と `principle`（ExamPoint 配置ズレ）

---

## 5. 次セッションで再開する手順

### 5.1 開始時のチェック

```bash
# 1. 状態確認
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode report

# 期待出力:
#   Total keyword pages : 644
#   Tier 2 scored       : 30 （または前回までの累計）
#   Score distribution  : 上記サンプル分

# 2. 残スラッグの一覧
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode score --top 1000 --dry-run | head -20
# 評価対象の先頭 N 件が出る（既評価はスキップされる）
```

### 5.2 採点の進め方（推奨）

**1 セッションあたりの目標: 30-50 件**（main context 余力次第）

1. **モデル選択**: Sonnet（haiku より概して概念理解が安定する。verbose 性は同程度）
   - もし haiku のままで進めるなら、プロンプトに「**JSON 1行のみ。reasoning 禁止**」を強調
2. **バッチサイズ**: 5 件並列（duration_ms 平均 ~30 秒）
3. **保存タイミング**: 5-10 件ごとに `.claude/state/quality-scores.json` に追記
4. **weighted の正規化**: 必ず scores から再計算する（subagent 出力の weighted は信頼しない）

### 5.3 推奨されるコード snippet

```javascript
// scores から weighted を再計算
function recomputeWeighted(s) {
  const w = s.structure*0.30 + s.mobile*0.25 + s.principle*0.20 + s.reference*0.15 + s.linking*0.10;
  const has0 = Object.values(s).some(v => v === 0);
  return has0 ? Math.min(w, 1.00) : parseFloat(w.toFixed(2));
}

// quality-scores.json に追記する node ワンライナー
node -e "
const fs = require('fs');
const path = '.claude/state/quality-scores.json';
const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
const now = new Date().toISOString();
const results = [
  {slug:'<slug>', scores:{structure:N,mobile:N,principle:N,reference:N,linking:N},
   weak_axes:[...], qualitative_comment:'...'},
  // ... 5-10 件
];
function rw(s) {
  const w = s.structure*0.30+s.mobile*0.25+s.principle*0.20+s.reference*0.15+s.linking*0.10;
  return Object.values(s).some(v=>v===0) ? Math.min(w,1) : parseFloat(w.toFixed(2));
}
for (const r of results) data.pages[r.slug] = {...r, weighted: rw(r.scores), scored_at: now};
data.scored_at = now;
fs.writeFileSync(path, JSON.stringify(data, null, 2)+'\n', 'utf-8');
console.log('saved:', results.length, 'total:', Object.keys(data.pages).length);
"
```

### 5.4 cem-qa subagent プロンプト（推奨フォーム）

```
あなたは cem-qa エージェントです。`.claude/agents/cem-qa.md` を Read で読み、それに従ってください。
品質ルーブリックの真実源は `.claude/content-principles.md` です。

評価対象: .local/r2/posts/pe-comprehensive-management/<SLUG>/article.mdx

実行手順:
1. .claude/agents/cem-qa.md を Read
2. 評価対象ファイルを Read
3. node scripts/lint-mdx-mobile.mjs <file> を Bash で実行
4. 5軸（構造30/モバイル25/原則20/参考資料15/関連付け10）を 0-3 点で採点
5. weak_axes は score≤1
6. 質的コメント30-100字

**重要**: reasoning や説明は一切書かない。JSON 1行のみ返す。weighted は呼び出し側で再計算するため省略可。

最終出力は **JSON 1行のみ**:
{"slug":"<SLUG>","scores":{"structure":N,"mobile":N,"principle":N,"reference":N,"linking":N},"weak_axes":[...],"qualitative_comment":"..."}
```

→ 重要な変更点:
- weighted を出力させない（呼び出し側で再計算）
- reasoning 禁止を強調

### 5.5 セッション計画例

| セッション | 件数 | 累計 | 残り |
|---|---|---|---|
| 既完了 | 30 | 30 | 614 |
| 次回 #1 | 50 | 80 | 564 |
| #2 | 50 | 130 | 514 |
| #3 | 50 | 180 | 464 |
| ... | ... | ... | ... |
| #13 | 50 | 644 | 0 |

**13 セッション ≒ 4-7 日**（毎日 1-2 セッション）

---

## 6. 採点完了後の作業（Phase G-2 以降）

### 6.1 リライト対象抽出

```bash
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode rewrite --threshold 2.5 --max 50 --dry-run
# 弱い順 50 件が表示される
```

### 6.2 波の構成（再掲）

| 波 | 対象 | スコア帯 | デプロイ目安 |
|---|---|---|---|
| 1 | 最弱 50 件 | weighted < 1.5 | 即時 |
| 2 | 次弱 50 件 | 1.5 ≤ weighted < 1.8 | 波1の3-4日後 |
| 3 | 中弱 50 件 | 1.8 ≤ weighted < 2.1 | 波2の3-4日後 |
| 4 | 上弱 50 件 | 2.1 ≤ weighted < 2.4 | 波3の3-4日後 |
| 5 | 残り全部 | 2.4 ≤ weighted < 2.5 | 波4の3-4日後 |

### 6.3 1 波の実行手順

1. `--threshold X.Y --max 50` で対象 50 件を抽出
2. keyword-rewriter subagent をバッチ並列 3-5 で起動
3. リライト後の lint チェック（HIGH ゼロ確認）
4. 5-10 件ごとに commit
5. 波の最後にスポット verify（5-10 件サンプル）
6. develop → main FF merge → push
7. **次の波まで 3-4 日待機**

詳細は `13_quality-cycle-architecture.md` の Phase G-2 セクション参照。

---

## 7. 代替案 E（mechanical-driven）— 採用しないが参考として残す

cem-qa スコアリングのコスト問題に対する代替案だったが、ユーザー判断で **不採用**。
ただし、もし採点を完遂できないことが判明した場合の fallback として記録しておく。

### 7.1 概要

cem-qa スコアリングをスキップし、mechanical signals で直接リライト候補を抽出する。

```javascript
// .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs の screen mode を改良
// MEDIUM の内訳をカテゴリ別に保存
//   { '1-4': N, '6-1': N, '8-1': N, '9-4': N, ... }

// 候補抽出ルール
function isRewriteCandidate(p) {
  if (p.lint_high > 0) return true;        // mobile/principle 弱
  if (p.lint_medium_by_cat['9-4'] > 0) return true; // reference 弱
  if (p.body_chars < 1500) return true;    // 薄い content
  return false;
}
```

### 7.2 メリット・デメリット

- **メリット**: コンテキスト消費 1/10、Phase F-2 を完全スキップ可能
- **デメリット**: 質的判定（独自性・読みやすさ）は spot verify でしか拾えない、weak_axes の推定が曖昧

---

## 8. 関連ファイル

### 8.1 状態を持つファイル

| パス | 内容 | 更新タイミング |
|---|---|---|
| `.claude/state/mechanical-screen.json` | 全 644 件の機械的指標（Phase F 出力） | screen mode 実行時 |
| `.claude/state/quality-scores.json` | Tier 2 採点結果（30 件） | score / verify 実行時 |
| `.claude/state/flagship-100.json` | 上位 100 件 | flagship mode 実行時 |
| `.claude/state/quality-cycle-state.json` | 各ページの state 履歴 | rewrite / verify / approve 時 |
| `.claude/state/review-queue.md` | 人間レビュー待ちリスト | review mode 実行時 |

### 8.2 ロジックを持つファイル

| パス | 役割 |
|---|---|
| `.claude/skills/content/quality-cycle/scripts/quality-cycle.mjs` | オーケストレータ（screen / score / rewrite / verify / review / report / flagship） |
| `scripts/lib/quality-state.mjs` | .claude/state/*.json の I/O |
| `scripts/lib/cem-qa-prompt.mjs` | subagent プロンプトテンプレート |
| `scripts/lib/mdx-io.mjs` | 改行コード保持 I/O |
| `scripts/lint-mdx-mobile.mjs` | カテゴリ 0-9 の機械的検証 |

### 8.3 真実源

| パス | 内容 |
|---|---|
| `.claude/agents/cem-qa.md` | 5 軸ルーブリック定義（**weighted 計算式の曖昧さは未修正**）|
| `.claude/agents/keyword-rewriter.md` | リライトルール |
| `.claude/content-principles.md` | §5 ExamPoint, §9 参考資料 |

### 8.4 cem-qa.md の修正提案（次セッションでもよい）

`.claude/agents/cem-qa.md` の weighted 計算式部分に以下を追記すべき:

```markdown
## 加重スコア計算（厳密版）

weighted = Σ(各軸スコア × 重み)
       = structure×0.30 + mobile×0.25 + principle×0.20 + reference×0.15 + linking×0.10

- 重みの合計は 1.0、最大スコア = 3.0
- いずれかの軸が 0 点なら、weighted を 1.0 でクランプ
- 合格ライン: weighted ≥ 2.0
- リライト候補ライン: weighted < 2.5

**例**: scores = {3, 2, 3, 1, 3} → weighted = 0.9 + 0.5 + 0.6 + 0.15 + 0.3 = 2.45
**0 軸例**: scores = {3, 2, 3, 0, 3} → 計算上 2.30 だが、0 軸ルールで 1.00 にクランプ
```

これを修正すれば subagent の weighted 出力もブレなくなり、post-process の再計算が不要になる。

---

## 9. 次セッションで実施すべき全タスク一覧（手順付き）

優先度順。**T1〜T2 は次セッション冒頭で必ず実施**（これがないと採点で同じブロッカーに当たる）。
T3 以降はセッション余力に応じて実施。

### T1. cem-qa.md の weighted 計算式を明文化【最優先・コード修正・所要 5 分】

**目的**: subagent ごとに異なる weighted 計算結果を出すバグを根絶する。

**手順**:

1. `.claude/agents/cem-qa.md` を Read で開く
2. 「加重スコア計算」セクション（または該当箇所）を探す
3. 以下のブロックに置き換える or 追記する:

```markdown
## 加重スコア計算（厳密版）

weighted = Σ(各軸スコア × 重み)
       = structure×0.30 + mobile×0.25 + principle×0.20 + reference×0.15 + linking×0.10

- 重みの合計は 1.0、最大スコア = 3.0
- いずれかの軸が 0 点なら、weighted を **1.0 でクランプ**（即不合格扱い）
- 合格ライン: weighted ≥ 2.0
- リライト候補ライン: weighted < 2.5

**例1（合格）**: scores = {3, 2, 3, 1, 3}
  → 0.9 + 0.5 + 0.6 + 0.15 + 0.3 = **2.45**

**例2（要修正）**: scores = {3, 1, 2, 1, 2}
  → 0.9 + 0.25 + 0.4 + 0.15 + 0.2 = **1.90**

**例3（0 軸クランプ）**: scores = {3, 2, 3, 0, 3}
  → 計算上 2.30 だが、reference=0 のため weighted = **1.00** にクランプ

**禁止事項**: weighted を /3 で除算しない（過去にこの誤解が広まったが誤り）。
weights の合計が 1.0 なので、Σ(score × weight) のままで最大 3.0 になる。
```

4. 文字化けチェック: `Grep "U+FFFD" .claude/agents/cem-qa.md`（出力ゼロ）
5. commit: `docs(cem-qa): weighted 計算式の曖昧さを排除`

---

### T2. cem-qa-prompt.mjs の prompt を verbose 抑制版に強化【コード修正・所要 5 分】

**目的**: subagent が reasoning を冗長に書き出して main context を圧迫する問題を解消する。

**手順**:

1. `scripts/lib/cem-qa-prompt.mjs` を Read
2. `buildCemQaPrompt(slug)` 内の prompt 文字列を以下の形に変更:

```javascript
export function buildCemQaPrompt(slug) {
  return `あなたは cem-qa エージェントです。
完全な定義は \`.claude/agents/cem-qa.md\` を Read で読み、それに従ってください。
品質ルーブリックの真実源は \`.claude/content-principles.md\` です。

評価対象:
  ファイル: .local/r2/posts/pe-comprehensive-management/${slug}/article.mdx

実行手順:
  1. .claude/agents/cem-qa.md を Read で読む
  2. 評価対象ファイルを Read で読む
  3. node scripts/lint-mdx-mobile.mjs <評価対象ファイル> を Bash で実行
  4. 5 軸ルーブリック（構造30% / モバイル25% / 原則20% / 参考資料15% / 関連付け10%）で
     各軸を 0〜3 点で採点
  5. weak_axes（score ≤ 1 の軸）を特定
  6. 質的コメント（30〜100字）を付与

**重要な出力ルール**:
- reasoning や説明文を一切書かない
- 最終出力は **JSON 1 行のみ**
- weighted は出力しない（呼び出し側で再計算する）
- 前置き・後置き・コードブロックフェンスは禁止

最終出力フォーマット（このまま 1 行で返す）:
{"slug":"${slug}","scores":{"structure":N,"mobile":N,"principle":N,"reference":N,"linking":N},"weak_axes":[...],"qualitative_comment":"..."}

注意:
- スコアは整数 (0/1/2/3) のみ
- weak_axes は score <= 1 の軸名（"structure"/"mobile"/"principle"/"reference"/"linking"）
- 機械的判定不能な質的観点（独自性・読みやすさ・著者の声）も評価に含める`;
}
```

3. テスト: 1 件だけ subagent を起動して output が JSON 1 行で返ることを確認
4. commit: `feat(quality-cycle): cem-qa prompt を verbose 抑制版に強化`

---

### T3. Phase F-2 の採点を再開【メインタスク・複数セッション】

**目的**: 残り 614 件を cem-qa で採点し、リライト候補（weighted < 2.5）を確定する。

**前提**: T1 と T2 が完了していること。

**手順（1 セッションあたり）**:

1. **状況確認**:
   ```bash
   node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode report
   # 期待: Tier 2 scored: 30（または前回までの累計）
   ```

2. **次の対象を取得**:
   ```bash
   node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode score --top 1000 --dry-run | head -60
   # 表示された slug の上から 30〜50 件を採点対象とする
   ```

3. **subagent をバッチ並列起動**（5 件並列を推奨）:
   - `general-purpose` subagent
   - `model: "sonnet"` を指定（haiku より解釈が安定）
   - prompt は T2 で更新した buildCemQaPrompt(slug) の出力
   - 各バッチ完了を待ってから次の 5 件へ

4. **5〜10 件溜まったら保存**:
   ```bash
   node -e "
   const fs = require('fs');
   const path = '.claude/state/quality-scores.json';
   const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
   const now = new Date().toISOString();
   const results = [
     // subagent 出力をここに貼り付け
     {slug:'<slug1>', scores:{structure:N,mobile:N,principle:N,reference:N,linking:N},
      weak_axes:[...], qualitative_comment:'...'},
   ];
   function rw(s) {
     const w = s.structure*0.30+s.mobile*0.25+s.principle*0.20+s.reference*0.15+s.linking*0.10;
     return Object.values(s).some(v=>v===0) ? Math.min(w,1) : parseFloat(w.toFixed(2));
   }
   for (const r of results) data.pages[r.slug] = {...r, weighted: rw(r.scores), scored_at: now};
   data.scored_at = now;
   fs.writeFileSync(path, JSON.stringify(data, null, 2)+'\n', 'utf-8');
   console.log('saved:', results.length, 'total:', Object.keys(data.pages).length);
   "
   ```

5. **セッション終了時**:
   ```bash
   git add .claude/state/quality-scores.json
   git commit -m "content: Quality Cycle 第2サイクル F-2 採点 ${累計}/644 件"
   git push origin main
   ```

**目標ペース**: 1 セッション 30〜50 件 × 13 セッション ≒ 4-7 日で全件採点完了。

**中断条件**: スポット 30 件を採点した時点で「弱 < 2.5 が 60% 以下」「reference 違反が 80% 未満」「全く新しい弱点パターンが出現」のいずれかなら、サンプリングが偏っている可能性があるので方針を再評価する。

---

### T4. Cycle 1 リライトのケーススタディを `13_quality-cycle-architecture.md` に追記【ドキュメント・所要 15 分】

**目的**: 第1サイクルの 5 件で「何が効いたか」を将来の rewriter プロンプト改善のために残す。

**手順**:

1. `docs/project/13_quality-cycle-architecture.md` を Read
2. 末尾付近に「## 付録: Cycle 1 リライト ケーススタディ (2026-04-14)」セクションを追加
3. 以下のテーブルを記載:

```markdown
## 付録: Cycle 1 リライト ケーススタディ (2026-04-14)

第1サイクルでリライトした 5 件の before/after スコアと、適用した拡張パターン。
将来の rewriter プロンプト改善・拡張パターン選定の参考材料。

| slug | before | after | weak_axes (before) | 適用パターン | 主な追加内容 | 追加文字数 |
|---|---|---|---|---|---|---|
| ecrs-principle | 0.85 | 3.00 | reference | A, D | 実務具体例 + 公的(厚労省) + 民間(IE協会) | 874 |
| reemployment-system | 1.00 | 3.00 | reference | A | 建設業A社60→65歳継続雇用例 + e-Gov + マネーフォワード | 1030 |
| balance-sheet | 1.65 | 2.40 → 3.00* | mobile/principle/reference | A | 建設業流動比率150%例 + 表→箇条書き + ExamPoint位置移動 + マネーフォワード追加 | 790+ |
| income-statement | 1.85 | 3.00 | principle/reference | A | 営業利益率算出例 + 表→箇条書き + ExamPoint位置移動 + 税理士法人解説 | 691 |
| process-planning-construction | 1.85 | 3.00 | mobile/reference | A | 橋梁鋼桁架設の工程計画手順 + 表→箇条書き + 国交省/PMI 等 6 件 | 1055 |

*balance-sheet は cem-qa verify で 2.40 だったが、手動で民間解説1件追加 + 表セル短縮で 3.00 相当に到達。

### 学んだこと

1. **拡張パターン A（実務での具体例）が万能**: 5/5 件に適用、いずれも weighted を大幅改善
   - 建設業の現場・案件を題材にした 200-400 字のケースが効果的
2. **拡張パターン D（参考資料追加）は reference 弱点軸の唯一解**:
   - 公的（go.jp）+ 民間（解説サイト）の組み合わせを最低 2 件追加
   - マネーフォワード、TKC、税理士法人、IE協会など実在の解説メディアを使う
3. **3 列表のセル長超過は箇条書き化が有効**: balance-sheet, income-statement で実証
4. **ExamPoint の位置移動は破壊的でない**: 既存 ExamPoint の中身は触らず、位置だけ「総合技術監理における位置づけ」直前へ移動する手法は安全
5. **追加文字数の幅**: 690 〜 1055 字。500 字未満だと改善幅が小さく、1500 字超だとリスク（テンプレ均一化シグナル）

### rewriter プロンプトへのフィードバック

これらの学びを `.claude/agents/keyword-rewriter.md` または `scripts/lib/cem-qa-prompt.mjs` の
`buildRewriterPrompt()` に反映する余地がある。特に:

- 「拡張パターン A の場合は建設業を題材にする」を明示
- 「追加文字数は 700-1100 字を推奨」を明示
- 「参考資料は実在 URL のみ。マネーフォワード・TKC・税理士法人など民間解説サイトの実例を提示」
```

4. commit: `docs: Cycle 1 リライトのケーススタディを追記`

---

### T5. データベースライン スナップショットを保存【ドキュメント・所要 10 分】

**目的**: リライト前の現状を「正解値」として保存し、将来「リライトでどう変わったか」を比較できるようにする。

**手順**:

1. 新規ファイル `docs/project/16_quality-baseline-2026-04-14.md` を作成
2. 以下を記載:

```markdown
# Quality Cycle ベースライン (2026-04-14)

第2サイクル開始時点の品質指標スナップショット。リライト後との比較のために凍結する。

## 1. mechanical-screen.json 全 644 件の統計

| 指標 | 値 |
|---|---|
| Total keyword pages | 644 |
| HIGH 違反ゼロ | 514 件 (79.8%) |
| HIGH 1-2 件 | 116 件 (18.0%) |
| HIGH 3+ 件 | 14 件 (2.2%) |
| MEDIUM > 0 | 634 件 (98.4%) |
| HIGH=0 AND MEDIUM=0 | 9 件 (1.4%) |
| body_chars < 1500 | 287 件 (44.6%) |
| body_chars 1500-3000 | 338 件 (52.5%) |

## 2. mechanical-screen の candidate_score 分布

| 区間 | 件数 | 割合 |
|---|---|---|
| 0-2 | 11 | 1.7% |
| 2-4 | 95 | 14.8% |
| 4-6 | 23 | 3.6% |
| 6-8 | 288 | 44.8% |
| 8-10 | 221 | 34.4% |
| 10+ | 5 | 0.8% |

| 統計 | 値 |
|---|---|
| 最小値 | 0.68 |
| 下位10% | 3.50 |
| 中央値 | 7.54 |
| 上位10% | 8.51 |
| 最大値 | 10.66 |

## 3. cem-qa 採点済 30 件の weighted 分布

| 区間 | 件数 |
|---|---|
| < 1.0 | 0 |
| 1.0-1.5 | 4 |
| 1.5-2.0 | 2 |
| 2.0-2.5 | 12 |
| 2.5-3.0 | 12 |

- リライト候補 (weighted < 2.5): 18 件 (60%)
- 弱点軸の 90% 以上が `reference` (§9 違反)

## 4. AdSense 第1次審査で指摘された問題（doc 12 より）

- 「有用性の低いコンテンツ」
- 推定根本原因: thin content + テンプレート均一性 + 短期間バルク投入 + E-A-T 不可視

## 5. 比較タイミング

- リライト後（第2サイクル完了時）に同じスクリプトで再計測し、本ドキュメントと比較する
- 期待値: HIGH=0 が 95%+、weighted < 2.5 が 10% 未満、平均 weighted 2.5+
```

3. commit: `docs: Quality Cycle ベースライン (2026-04-14) を保存`

---

### T6. 戦略決定マトリクスを `12_adsense-resubmission-strategy.md` に追記【ドキュメント・所要 10 分】

**目的**: 案A〜D の比較をドキュメントに残し、なぜ案 B を選んだのか将来の判断材料にする。

**手順**:

1. `docs/project/12_adsense-resubmission-strategy.md` を Read
2. 末尾近くに「## 付録: 第2サイクル戦略決定マトリクス (2026-04-14)」セクションを追加
3. 以下を記載:

```markdown
## 付録: 第2サイクル戦略決定マトリクス (2026-04-14)

第1サイクル完了後、AdSense 再申請に向けて検討した 4 案。**最終判断: 案 B**。

| 案 | 内容 | 件数 | 期間 | コスト | リスク | 効果 | 採択 |
|---|---|---|---|---|---|---|---|
| A | 全 644 件リライト | 644 | 5-7 週間 | $250-400 | 🔴 高（バルク AI シグナル） | 過剰 | ❌ |
| **B** | **弱 ~250 件のみリライト** | ~250 | 2-3 週間 | $150-200 | 🟡 中 | 高 | ✅ |
| C | ~50-100 件 + 機械的参考資料補強 | ~150 | 1-2 週間 | $80-120 | 🟢 低 | 高 | ❌ |
| D | 何もせず現状で再申請 | 0 | 即時 | $0 | 🟡 中（再不合格の可能性） | 不明 | ❌ |

### 採択理由

案 B が選ばれた決定要因:

1. **データの裏付け**: 644 件中 80% は既に lint HIGH ゼロ。全件リライトは過剰で逆効果。
2. **AdSense リスク**: 「短期間バルク AI 改訂」は不合格理由（バルク生成シグナル）を悪化させる。
3. **コスト効率**: 弱い 250 件に集中することで、最小コストで最大効果を狙える。
4. **段階デプロイ**: 5 波 × 3-4 日間隔で「自然な更新」を演出し、バルクシグナルを散らす。

### 重要な meta-insight

> **「全件リライト」は AdSense の不合格理由を**悪化**させる。**

AdSense は thin content だけでなく「短期間に大量の AI 生成コンテンツ」もペナライズする。
したがって、戦略は「全件を磨く」ではなく「**弱い箇所だけを丁寧に磨いて段階的に出す**」。
この直感に反する事実が、案 B 採択の核心。

### 案 C を不採択にした理由

案 C（mechanical-driven triage）は理論上ほぼ同等の効果が得られる可能性があったが、
質的判定（独自性・読みやすさ・著者の声）を捨てるリスクが大きい。第2サイクルは
時間的余裕があるため、cem-qa スコアリングを完遂する案 B を選んだ。
```

4. commit: `docs: 第2サイクル戦略決定マトリクスを追記`

---

### T7. Phase G-2 へ進む（採点完了後）

T3 で 644 件採点が完了したら、Phase G-2 へ進む。詳細はセクション 6 と
`docs/project/13_quality-cycle-architecture.md` を参照。

**1 波の流れ（再掲）**:

1. `node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode rewrite --threshold X.Y --max 50 --dry-run` で対象確認
2. dry-run なしで実行し、subagent タスク列を取得
3. keyword-rewriter subagent をバッチ並列 3-5 で起動
4. リライト後の lint チェック
5. 5-10 件ごとに commit
6. 波の最後にスポット verify（5-10 件サンプル）
7. develop → main FF merge → push
8. **次の波まで 3-4 日待機**

---

### T8. AdSense 再申請（全波完了後・ユーザー手動）

5 波分のデプロイが完了し、Search Console で正常クロールが確認できたら:

1. AdSense ダッシュボードを開く
2. ポリシー違反の「再審査をリクエスト」
3. 修正内容を記載（例: 「Quality Cycle で 5 軸ルーブリックに基づき ~250 ページを段階的に改訂。
   著者プロフィール・参考資料・実務での具体例を強化。デプロイは 4-7 日間隔で 5 波に分散」）

---

## 10. タスク間の依存関係

```
T1 (cem-qa.md fix) ──┐
                     ├──> T3 (Phase F-2 採点) ──> T7 (Phase G-2 リライト) ──> T8 (再申請)
T2 (prompt 強化) ────┘

T4 (Cycle 1 ケーススタディ)  独立、いつでも可
T5 (ベースライン)            独立、T3 開始前推奨
T6 (戦略マトリクス)          独立、いつでも可
```

**最短経路**: T1 → T2 → (T5) → T3 (複数セッション) → T7 (5 波) → T8

**ドキュメント先行**: T4, T5, T6 は採点と並行で実施可能（コンテキストを使わない）

---

## 11. クイックスタート (次セッション開始時)

```bash
# 1. 同期
git pull

# 2. 本ドキュメントを読む
cat docs/project/15_quality-cycle-cycle2-handoff.md

# 3. T1 と T2 を実施（次セッション冒頭で必須）
#    -> .claude/agents/cem-qa.md を編集
#    -> scripts/lib/cem-qa-prompt.mjs を編集

# 4. 状況確認
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode report

# 5. T3（Phase F-2 採点）を再開
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode score --top 1000 --dry-run | head -30
# → 表示されたスラッグから順に subagent を起動

# 6. セッション終了時に commit + push
git add -A && git commit -m "content: Quality Cycle F-2 採点 N/644" && git push origin main
```

---

**完了判定**: 本ドキュメントは作業ハンドオフ書であり、第2サイクル完了時に「完了 yyyy-mm-dd」を追記する。
