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

- **scripts/quality-cycle.mjs に新フラグ追加**（commit `c2cc91c8`）
  - `--max <N>`: rewrite モードの 1 セッション処理上限
  - `--min-weighted <X.X>`: rewrite モードのスコア下限
  - `--flagship-only`: rewrite を flagship 100 内に限定
  - rewrite モードのデフォルト動作を「全 644 件対象」「state が rewritten/verified/approved のものはスキップ」に変更
- **cem-qa 採点済**: 30 / 644 件
  - Cycle 1 で採点した 20 件
  - Cycle 2 で本セッションに採点した 10 件（isms-iso27001, iso-14000, correlation-analysis, generative-ai, employment-insurance, product-safety, alps-treated-water, environmental-basic-plan, zero-trust, firewall-ids）
  - データは `data/quality-scores.json` に保存済
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
node scripts/quality-cycle.mjs --mode report

# 期待出力:
#   Total keyword pages : 644
#   Tier 2 scored       : 30 （または前回までの累計）
#   Score distribution  : 上記サンプル分

# 2. 残スラッグの一覧
node scripts/quality-cycle.mjs --mode score --top 1000 --dry-run | head -20
# 評価対象の先頭 N 件が出る（既評価はスキップされる）
```

### 5.2 採点の進め方（推奨）

**1 セッションあたりの目標: 30-50 件**（main context 余力次第）

1. **モデル選択**: Sonnet（haiku より概して概念理解が安定する。verbose 性は同程度）
   - もし haiku のままで進めるなら、プロンプトに「**JSON 1行のみ。reasoning 禁止**」を強調
2. **バッチサイズ**: 5 件並列（duration_ms 平均 ~30 秒）
3. **保存タイミング**: 5-10 件ごとに `data/quality-scores.json` に追記
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
const path = 'data/quality-scores.json';
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
node scripts/quality-cycle.mjs --mode rewrite --threshold 2.5 --max 50 --dry-run
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
// scripts/quality-cycle.mjs の screen mode を改良
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
| `data/mechanical-screen.json` | 全 644 件の機械的指標（Phase F 出力） | screen mode 実行時 |
| `data/quality-scores.json` | Tier 2 採点結果（30 件） | score / verify 実行時 |
| `data/flagship-100.json` | 上位 100 件 | flagship mode 実行時 |
| `data/quality-cycle-state.json` | 各ページの state 履歴 | rewrite / verify / approve 時 |
| `data/review-queue.md` | 人間レビュー待ちリスト | review mode 実行時 |

### 8.2 ロジックを持つファイル

| パス | 役割 |
|---|---|
| `scripts/quality-cycle.mjs` | オーケストレータ（screen / score / rewrite / verify / review / report / flagship） |
| `scripts/lib/quality-state.mjs` | data/*.json の I/O |
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

## 9. 次セッション開始時のクイックスタート

```bash
# 1. 現状確認
git pull
node scripts/quality-cycle.mjs --mode report

# 2. このドキュメントを読む
cat docs/project/15_quality-cycle-cycle2-handoff.md

# 3. cem-qa.md の weighted 計算式を修正（任意・推奨）
# .claude/agents/cem-qa.md を編集

# 4. 採点を再開（Sonnet 推奨、batch 5、目標 50 件）
node scripts/quality-cycle.mjs --mode score --top 1000 --dry-run | head -30
# → 表示されたスラッグから順に subagent を起動

# 5. 5-10 件ごとに data/quality-scores.json を保存
# 6. セッション終了時に commit + push
```

---

**完了判定**: 本ドキュメントは作業ハンドオフ書であり、第2サイクル完了時に「完了 yyyy-mm-dd」を追記する。
