# 2026-05-17 CEM 品質サイクル Phase G-8 進行中（78/136 完了）

## 状況サマリ

- **対象**: 総監キーワード weighted < 2.5 の 136 件を G+D パターンでリライト
- **完了**: 78 件 (57.4%)、バッチ 1-25
- **残**: 58 件（次セッションで Phase 1 完遂 → Phase 2 verify）
- **進行スクリプト**: `/quality-cycle --profile cem --mode rewrite --threshold 2.5`
- **目標**: 全件 G+D 適用後、`--mode verify` で再採点して全件 ≥ 2.5 へ

## 今セッション実績

- **当初**: バッチ 1-15 で 48 件完了 (commit 9e025cd〜31024aa)
- **追加**: バッチ 16-25 で 30 件完了 (commit d97258〜8272a9e)
- **累計 commit 数**: 74 件（うち並行 commit 衝突で 4 件分が他 commit に同梱、データロスなし）
- **衝突 commit**: `cbf5191` / `0d30943` / `d45eaf34` / `4babda7`

## 次セッションの再開手順

### 1. 残対象の取得（58 件、リスト保存済）

```bash
# 保存済み
cat /tmp/cem-G8-remaining-58.txt
# または再 dry-run
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode rewrite --threshold 2.5 --dry-run
```

最初の 3 件は `pollution-control-manager` / `pops-convention` / `pqcdsme`。

### 2. バッチ単位の並列実行（3 件並列）

各 slug について `keyword-rewriter` サブエージェント（model: sonnet）を並列起動。プロンプト雛形（コンテキスト節約版、今セッションで実証済）:

```
CEM `<slug>` リライト。weak=mobile+reference, patterns=G+D, current=2.2.

**Read**: docs/project/02_コンテンツ/03_リライト方法論方針.md, docs/reference/content-principles.md §5/§9/§17/§18, .local/r2/posts/pe-comprehensive-management/<slug>/article.mdx

**Apply**: G+D。1ページ最大2パターン、散文中心、既存本文尊重。拡張は「総合技術監理における位置づけ」と「参考資料」の間に H2 追加。

**Frontmatter**: reviewStatus: needs-review, lastRewrittenAt: <new Date().toISOString()> UTC ISO 厳守, revisionCycle: +1 のみ。

**I/O**: writeMdxFile 経由、U+FFFD 確認。

**Must commit**: git add <ファイル> && git commit -m "site(cem): <slug> パターン G+D リライト（モバイル視認性・参考資料 §9 準拠化）"

**Output** (≤120字): === <slug> === G+D / 字数: 元→後 / commit: hash / 備考
```

**3 件目の自律選択方式**（今セッション後半で確立、衝突激減）:
3 件目の Agent には slug 指定せず、dry-run で「3 番目の slug」を自律選択させる。所要時間がバラついて並行 commit のタイミングが分散される効果。

### 3. バッチ後の state 更新（必須）

```bash
cat > /tmp/cem-rewrite-results-G8-W<N>.json <<EOF
[{"slug":"<slug>","wave":"G-8-W<N>","applied_patterns":["G","D"],"before_chars":N,"after_chars":N,"added_chars":N,"mojibake":false}, ...]
EOF
node .claude/skills/quality/quality-cycle/scripts-cem/log-rewrite.mjs /tmp/cem-rewrite-results-G8-W<N>.json
```

state 更新を怠ると次の dry-run で同じ slug が再対象になる。

### 4. 全件完了後の Phase 2: verify

詳細は元 plan `/Users/minamidaisuke/.claude/plans/misty-prancing-sunset.md` 参照。

- 対象: Phase G-8 でリライトした 136 件全て
- 並列度: cem-qa agent を 5-10 並列
- 単件 1-2 分、計 30-60 分
- merge-scores で `quality-scores.json` 更新

### 5. Phase 3: 集約

集計コード例:

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('.claude/state/quality-scores.json'));
const cs = JSON.parse(require('fs').readFileSync('.claude/state/quality-cycle-state.json'));
const g8 = Object.entries(cs.pages)
  .filter(([_,p]) => p.history?.some(h => h.wave?.startsWith('G-8')))
  .map(([slug]) => slug);
const after = g8.reduce((a,slug) => a + (s.pages[slug]?.weighted || 0), 0) / g8.length;
const passed = g8.filter(slug => (s.pages[slug]?.weighted || 0) >= 2.5).length;
console.log('Phase G-8 対象:', g8.length, '件');
console.log('Before avg: 2.20');
console.log('After avg:', after.toFixed(2));
console.log('≥2.5 達成:', passed, '/', g8.length);
"
```

memory `project_quality_cycle_phase_g8.md` を「完結」に書き換え、MEMORY.md の index 行も「完結」へ。

## 既知の注意点

### 並行 commit 衝突（構造的問題、4 回発生）

3 件並列起動で commit timing が一致すると片方の commit に他方の staged ファイルが同梱される。
- データロスはない（両ファイルの変更は commit に含まれる）
- commit message と内容に不一致が出るだけ
- `git log -p` で確認可能
- 速度優先で許容、回避策不要

### dry-run の `lastRewrittenAt` 判定ズレ

agent が JST ISO (`+09:00`) で書くと、4 時間 skip ロジックが効かない。**プロンプトで UTC ISO 厳守を必須**（今セッション以降の Agent prompt で明示済み）。

## ペース実績（今セッション）

- 1 バッチ = 3 件並列 ≒ 平均 3-5 分
- 25 バッチで 78 件、実時間 約 2 時間（応答間隔含む）
- 残 58 件 / 3 = 約 20 バッチ ≒ 約 1.5-2 時間目処（次セッション Phase 1 完遂）

## 関連

- 過去フェーズ: `project_quality_cycle_phase_g4.md` / `g5.md` / `g7.md`（memory）
- スキル: `/quality-cycle --profile cem` (`.claude/skills/quality/quality-cycle/SKILL.md`)
- Generator: `.claude/agents/keyword-rewriter.md`
- Evaluator: `.claude/agents/cem-qa.md`
- 拡張パターン真実源: `docs/project/02_コンテンツ/03_リライト方法論方針.md`
- 全体計画: `/Users/minamidaisuke/.claude/plans/misty-prancing-sunset.md`
