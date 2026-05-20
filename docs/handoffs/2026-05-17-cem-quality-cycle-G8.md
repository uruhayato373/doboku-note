# 2026-05-17 CEM 品質サイクル Phase G-8 セッション 2 完了

## 状況サマリ

- **対象**: 総監キーワード weighted < 2.5 の 136 件を G+D パターンでリライト + cem-qa verify
- **Phase 1 (rewrite)**: ✓ 完遂（116 件が state 上で完了確認、残 20 件分は frontmatter ベースで処理済）
- **Phase 2 (verify)**: 30/116 完了（残 86 件は次セッション）
- **Phase 3 (集約)**: 進行中、最終 memory 反映は Phase 2 完遂後

## Phase 2 verify 効果（今セッション 30 件）

| 指標 | 数値 |
|---|---|
| Before 平均 weighted | 2.20 |
| **After 平均 weighted** | **2.65 (+0.45)** |
| ≥2.5 達成率 | 20/30 (67%) |
| <2.0 不合格 | 1 件 (design-for-environment、参考資料民間欠落) |
| 満点 (3.00) | 9 件 |

> [!important] 満点達成済（G+D 効果が十分発揮）
> - circular-economy / decision-tree-analysis / ecosystem-services
> - foreign-trainee-program / carbon-pricing / eco-action-21
> - design-review / emergency / employee-benefits / environmental-accounting

## 次セッションでの再開手順

> [!todo]+ 着手起点
> 「Phase 2 残 86 件の verify」から開始。`cem-qa` サブエージェントを並列 5 件で起動 → wave ごとに `merge-scores.mjs` + `state.json` の `status: 'verified'` 更新を繰り返す。完了後に Phase 3 集約。詳細手順は下記。

### Phase 2 残 86 件の verify

```bash
# 次の verify 対象を確認
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode verify --dry-run | head -10
```

各 slug について `cem-qa` サブエージェント (model: sonnet) を並列 5 件で起動。プロンプト雛形:

```
CEM `<slug>` を 5 軸採点。

**Read**: docs/project/02_コンテンツ/02_採点ルーブリック方針.md, .claude/agents/cem-qa.md, .local/r2/posts/pe-comprehensive-management/<slug>/article.mdx

**採点**: structure/mobile/principle/reference/linking 各 0-3 点、weighted (0.30/0.25/0.20/0.15/0.10)、0軸あれば 1.0 クランプ。

**出力 (JSON 1 行のみ)**:
{"slug":"<slug>","scores":{"structure":N,"mobile":N,"principle":N,"reference":N,"linking":N},"weak_axes":[...],"qualitative_comment":"<60字>"}
```

### 各 wave 完了後

```bash
# 結果を集約 JSON にして
cat > /tmp/cem-verify-results-G8-V<N>.json <<EOF
[<5 件分の JSON>]
EOF

# scores.json に反映
node .claude/skills/quality/quality-cycle/scripts-cem/merge-scores.mjs /tmp/cem-verify-results-G8-V<N>.json

# state.json で status を 'verified' に更新
node -e "
const fs = require('fs');
const p = '.claude/state/quality-cycle-state.json';
const s = JSON.parse(fs.readFileSync(p));
const v = [/* 5 slug */];
for (const slug of v) if (s.pages[slug]) s.pages[slug].status = 'verified';
fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
"
```

### Phase 3: 最終集約

```bash
# 全体集計
node -e "
const s = JSON.parse(require('fs').readFileSync('.claude/state/quality-scores.json'));
const cs = JSON.parse(require('fs').readFileSync('.claude/state/quality-cycle-state.json'));
const g8 = Object.entries(cs.pages).filter(([_,p]) => p.history?.some(h => h.wave?.startsWith('G-8'))).map(([slug]) => slug);
const scored = g8.filter(slug => s.pages[slug]?.scored_at);
const after = scored.reduce((a,slug) => a + (s.pages[slug]?.weighted || 0), 0) / scored.length;
const passed = scored.filter(slug => (s.pages[slug]?.weighted || 0) >= 2.5).length;
console.log('After avg:', after.toFixed(2), '≥2.5達成:', passed, '/', scored.length);
"
```

集計後 `project_quality_cycle_phase_g8.md` を「完結」状態に更新、MEMORY.md index 行も更新、commit。

## 既知の注意点

> [!warning] state.json と scores.json の不整合
> - verify モードは state.status を見るが、cem-qa agent は scores.json を更新するのみ
> - merge-scores.mjs 実行後に手動で state.status を 'verified' にする処理が必須
> - これを怠ると同じ slug を再 verify 対象として出してくる

> [!warning] scores.json の古い weighted
> - dry-run の filter (`weighted < threshold`) は scores.json の古い値を参照
> - merge-scores 後は scored_at が新しくなるが、weighted も最新化される
> - Phase G-8 で書いた slug が再 rewrite 対象として出続けることはない

> [!warning] 並列 commit 衝突（Phase 1 で 4-5 回発生）
> データロスはないが commit message と内容が不一致になることがある。

## ペース実績

> [!note] 実績ベースの所要時間
> - 1 wave = 5 件並列、約 1-2 分
> - 30 件 verify で約 12 分（応答間隔含む）
> - 残 86 件は約 17-18 wave、35-50 分目処

## 関連

> [!note] 参照リンク
> - 全体 Plan: `/Users/minamidaisuke/.claude/plans/misty-prancing-sunset.md`
> - スキル: `/quality-cycle --profile cem` (`.claude/skills/quality/quality-cycle/SKILL.md`)
> - Evaluator: `.claude/agents/cem-qa.md`
> - Generator: `.claude/agents/keyword-rewriter.md`
> - ルーブリック真実源: `docs/project/02_コンテンツ/02_採点ルーブリック方針.md`
