# 2026-05-17 CEM 品質サイクル Phase G-8 進行中

## 状況サマリ

- **対象**: 総監キーワード weighted < 2.5 の 136 件を G+D パターンでリライト
- **完了**: 48 件 (35.3%)、バッチ 1-15
- **残**: 88 件（次セッションで再開）
- **進行スクリプト**: `/quality-cycle --profile cem --mode rewrite --threshold 2.5`
- **目標**: 全件 G+D 適用後、`--mode verify` で再採点して全件 ≥ 2.5 へ

## 次セッションの再開手順

### 1. 残対象の確認

```bash
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode rewrite --threshold 2.5 --dry-run | head -10
```

最初の 3 件を取得してバッチ開始。残 88 件のリストは `/tmp/cem-G8-remaining-targets.txt` か、再 dry-run で取得可能。

### 2. バッチ単位の並列実行（3 件並列）

各 slug について `keyword-rewriter` サブエージェントを並列起動。プロンプト雛形：

```
CEM `<slug>` リライト。weak=mobile+reference, patterns=G+D, current=2.2.

**Read**: `docs/project/02_コンテンツ/03_リライト方法論方針.md`, `docs/reference/content-principles.md` §5/§9/§17/§18, `.local/r2/posts/pe-comprehensive-management/<slug>/article.mdx`

**Apply**: G+D。1 ページ最大 2 パターン、散文中心、既存本文尊重。拡張は「総合技術監理における位置づけ」と「参考資料」の間に H2 追加。

**Frontmatter**: `reviewStatus: needs-review`, `lastRewrittenAt: <new Date().toISOString()>` UTC ISO, `revisionCycle: +1` のみ。

**I/O**: `writeMdxFile` 経由、U+FFFD 確認。

**Must commit**:
git add .local/r2/posts/pe-comprehensive-management/<slug>/article.mdx
git commit -m "site(cem): <slug> パターン G+D リライト（モバイル視認性・参考資料 §9 準拠化）"

**Output** (≤120字):
=== <slug> === G+D / 字数: 元→後 / commit: hash / 備考: <要点>
```

### 3. バッチ後の state 更新（必須）

agent は state ファイルを更新しないので、バッチ完了ごとに手動で:

```bash
cat > /tmp/cem-rewrite-results-G8-W<N>.json <<EOF
[
  {"slug":"<slug>","wave":"G-8-W<N>","applied_patterns":["G","D"],"before_chars":<N>,"after_chars":<N>,"added_chars":<N>,"mojibake":false},
  ...
]
EOF
node .claude/skills/quality/quality-cycle/scripts-cem/log-rewrite.mjs /tmp/cem-rewrite-results-G8-W<N>.json
```

state を更新しないと次の dry-run で同じ slug が再対象になる。

### 4. 全件完了後の verify モード

```bash
# 全件 keyword-rewriter 終了後、cem-qa で再採点
/quality-cycle --profile cem --mode verify
```

期待値: 平均 weighted 2.2 → 2.7 前後、< 2.5 のページゼロ化。

## 既知の注意点

### 並行 commit 衝突（構造的問題）

3 件並列起動で 2 件の commit timing が一致すると、片方の commit に他方の staged ファイルが同梱される。今セッションで 3 件発生:

- `cbf51919d`: employee-benefits commit に end-of-pipe を巻き込み
- `0d30943ce`: esg-environmental-assessment commit に evaluation-bias を巻き込み
- `d45eaf343`: extreme-events commit に fmea を巻き込み

**データロスはない**（両ファイルの変更は commit に含まれる）。commit message と実際の内容に不一致が出るだけ。`git log -p` で確認可能。

回避策（採用しなかった）: 並列度を 1 に下げる → 時間 3 倍。速度優先で許容。

### dry-run の `lastRewrittenAt` 判定ズレ

agent が `lastRewrittenAt` を JST ISO 形式（`+09:00`）で書くと、UTC 比較ロジック (`MIN_REWRITE_INTERVAL_MINUTES=240`) が一致せず、4 時間 skip が効かないケースあり。今回はバッチ 2 で 2 件再対象として出現したが、log-rewrite で state 更新したため以降は無問題。

agent prompt で `<new Date().toISOString()>` UTC 厳守を明示で再発防止済み。

### state ファイルの真実源

- `state`: `.claude/state/quality-cycle-state.json`（log-rewrite で更新）
- `scores`: `.claude/state/quality-scores.json`（verify モードで更新）
- rewrite モードは両方を見て candidate を絞り込む。state 更新を怠ると同じ slug を何度もリライトする

## 今セッションのペース実績

- 1 バッチ = 3 件並列 ≒ 平均 3-5 分
- 15 バッチで 48 件、実時間 約 70 分（ユーザー応答間隔含む）
- 残 88 件 / 3 = 29 バッチ ≒ 約 2-2.5 時間（次セッション目処）

## 関連

- 過去フェーズ: `project_quality_cycle_phase_g4.md` / `g5.md` / `g7.md`（memory）
- スキル: `/quality-cycle --profile cem` (`.claude/skills/quality/quality-cycle/SKILL.md`)
- Generator: `.claude/agents/keyword-rewriter.md`
- Evaluator: `.claude/agents/cem-qa.md`
- 拡張パターン真実源: `docs/project/02_コンテンツ/03_リライト方法論方針.md`
