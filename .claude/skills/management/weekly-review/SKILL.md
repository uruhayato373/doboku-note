---
name: weekly-review
description: >
  前週の成果・KPI・学びを振り返るレビューを生成する。Use when user asks to [週次レビュー, 先週の振り返り, /weekly-review].
---

今週の実績を調査し、成果・課題・学びを記録する週次レビューを生成する。

## 引数

```
/weekly-review [YYYY-Www]
```

- 週番号（任意）: ISO 8601 週番号（例: `2026-W10`）。省略時は今週。

## 概要

サブエージェントで並列に実績データを収集し、計画との差分を分析し、成果・課題・学びを構造化して記録する。

> **出力方式: md ファイル保存（GitHub Issue は使わない）**
> CLAUDE.md §8 準拠で、レビューは `docs/reviews/weekly/YYYY-Www-review.md` に保存する（旧「Issue 一本化」方式は廃止）。
> 本スキル内に残る `gh issue list` などの参照はレガシーであり、open Umbrella が無ければスキップしてよい。
> なお、サブエージェントは Bash 不可（記憶 `feedback_agent_bash.md`）なため、データ収集は親が Bash で実行し、抽出済みテキストを分析に使う。

## 手順

### Phase 1: 実績収集（並列サブエージェント）

#### Agent A: 開発活動

```
調査項目:
- git log --since="7 days ago" --oneline
- git log --since="7 days ago" --stat --format="" | tail -1
- git diff --stat

出力形式:
- 「開発した機能・修正」を箇条書き
- 「変更規模」（コミット数、ファイル数）
```

#### Agent B: コンテンツ実績

```
調査項目:
- docs/ 配下で今週新規作成・更新されたファイル
- カテゴリ別のページ数変動
- note 公開状態ドリフト: `npm run verify-note-status` を実行（noteId 保有 article.md の
  frontmatter noteStatus ↔ ライブ公開状態を note 公開 API で突合・creds 不要）。
  ドリフト（ライブ=published / frontmatter=draft）があれば `-- --fix` で是正してコミット。
  ※予約投稿は go-live がサーバ側後刻で writeback できず draft 取り残しが起きるため週次で自己修復する
- IG 公開状態ドリフト: `npm run verify-ig-status` を実行（posted.json/status.json ↔ ライブ
  グリッド＋プランナーを突合・read-only・★ドリフトで exit 2）。★が出たら次セッションで
  `/ig-reconcile` を実行して posted.json backfill / 未公開を予約（真実源 `docs/reference/ig-publish-reconcile.md`）。
  ※Playwright + ログイン済みプロファイル必須＝ローカル実行限定。クラウド週次では実行不可なのでサーフェスのみ

出力形式:
- 「今週追加したページ」
- 「更新したページ」
- 「note 公開状態ドリフト是正（N 本）」（あれば）
```

#### Agent C: NSM / パフォーマンス指標 + 実験進捗

```
調査方法 (2 段階):

> **大原則（誤読防止）**: 計測は CI/CD 供給が正。`fetch-metrics.yml`（毎週金 06:00 JST）が
> GA4/GSC を取得し `.claude/state/metrics/{ga4,gsc}/` に commit、`psi-audit.yml` が PSI を
> 日次 commit する。**コミット済みスナップショットを読むのが既定の取得元**であり、ローカル
> creds は設計上不要。「creds 未設定＝計測基盤未整備」と扱わない。会社 PC は社内プロキシで
> 外部 API（Google/Meta）が遮断されるため、ライブ fetch は基本通らない。
> 詳細・恒久ルール: `docs/reference/measurement-incidents.md`（2026-06-05 エントリ）

A. NSM 指標取得（既定 = スナップショット読み）:
- まず後述「スナップショット読み」でコミット済み JSON から WoW を算出するのが既定。
- creds + 外部到達性が両方ある環境（例: creds 入り macOS）に限り、任意で
  `node .claude/scripts/lib/metrics-reader.mjs`（markdown 出力）でライブ取得してもよい
  → GA4 と GSC から今週 vs 前週の NSM 関連メトリクス（Organic Search users（NSM）、
     全体 sessions、CTR、検索順位、トップクエリ）
- いずれの出力も「## NSM（オーガニック検索流入）」セクションとしてレビューに埋め込む

B. 実験進捗レポート:
- `.claude/state/experiments.json` を読み、status 別にグループ化:
  - running: 経過日数、baseline との gap（metrics-reader で再取得）
  - measuring: baseline vs current の前後比較
  - 今週 close したもの: result + learnings
- 各 running 実験について:
  - started_at から 10 日以上経過していれば「measure 実施推奨」を明記
  - baseline の metric が現状でどう動いたか数値表示
- 出力を「## 実験の進捗」セクションとして埋め込む

補助コマンド:
- `node .claude/scripts/lib/metrics-reader.mjs --json` で生データ
- 追加のディメンション別データ:
  - `npm run fetch-ga4-data -- --dimension page --days 7 --limit 20`
  - `npm run fetch-gsc-data -- --dimension page --days 7`

ライブ fetch（任意経路）の前提条件:
- .env.local に GOOGLE_SERVICE_ACCOUNT_KEY_PATH と GA4_PROPERTY_ID が設定されている
- サービスアカウントが GSC と GA4 の両方で閲覧者権限を持つ
- かつ外部 API に到達できる（会社 PC のプロキシ配下では不可）
- これらが揃わない環境（＝既定）では下記スナップショット読みを使う。creds 未設定を
  「計測基盤未整備」とは記録しない（基盤は CI 側で稼働している）

スナップショット読み（既定の取得元）:
- CI（`fetch-metrics.yml` が毎週金曜 06:00 JST に commit）が残した
  コミット済みスナップショットを読んで WoW を自前算出する:
  - GA4 NSM（推奨）: `.claude/state/metrics/ga4/ga4-channel-organic-*.json`（7日窓・JP・Organic Search のみ）の
    最新2ファイルをファイル名日付で sort → 各 rows の activeUsers を NSM として前週比を算出。
    **これがクリーンな7日 WoW**。`ga4-channel-organic-*` が無い場合のみ `ga4-channel-*.json`（28日窓）に
    フォールバックし、その場合は「28日ローリング比較」と明記する（クリーンな WoW ではない）。
  - GSC（推奨）: `.claude/state/metrics/gsc/gsc-date-*.json`（7日窓・日次）の最新2ファイルで
    日次 clicks/impressions を合計して前週比。無ければ `gsc-query-*.json`（28日窓）にフォールバックし
    「28日ローリング」と明記。GSC は3日遅延があるため直近数日は未確定（両週同条件なので方向は有効）。
  - PSI: `.claude/state/metrics/psi/psi-batch-*.json`（Agent C2 と同じ）を使う（ライブ PSI 呼び出し不要）
- スナップショットが2週分揃わない場合のみ「NSM セクション: スキップ」と記録

出力形式:
- A の markdown 出力をそのまま「## NSM（オーガニック検索流入）」に
- B を新規セクション「## 実験の進捗」として以下構造で:

## 実験の進捗

### Running ({n} 件)
| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|
| EXP-001 | title改善 | 12 日 | pos 7.4 → 4.2 | measure 推奨 |

### Measuring ({n} 件)
| ID | title | baseline | current | 効果判定 |

### 今週 close ({n} 件)
- EXP-XXX: {result} — {learnings}

コメント: 次サイクルで試すべき仮説を 1-2 個提示
```

#### Agent C2: PSI パフォーマンス推移

```
調査項目:
- .claude/state/metrics/psi/psi-batch-*.json の直近 7 日分（GitHub Actions psi-audit.yml が develop に毎日 [skip ci] で commit）
- .claude/config/psi-config.json のしきい値
- （廃止: `gh issue list --label performance,weekly-pdca` は GitHub Issue 廃止〔CLAUDE.md §8〕で無効。違反の追跡は上記 psi-batch JSON の時系列＋しきい値比較のみで行う）

分析項目:
- 今週の違反件数 vs 先週（psi-batch JSON の時系列から算出）
- 各 URL の Performance スコア・LCP の前週比
- 今週新規発生した違反 / 今週しきい値内に戻った違反

出力形式: 以下の「## PSI パフォーマンス推移」セクションに埋め込む
```

#### Agent C3: 収益カバレッジ ダッシュボード

```
目的: 高流入ページに note 有料マガジン / アフィリエイトの収益導線が張れているかを
機械突合し、「高流入なのに無導線」のギャップを surface する（手作業監査の自動化）。

調査方法（オフライン・コミット済みスナップショット読み）:
- `npm run report-monetization-coverage` を実行（tsx, 外部 API 不要）。
  - 入力: 最新 `.claude/state/metrics/ga4/ga4-page-*.json`（流入）+ `ga4-cta-clicks-*.json`（クリック, あれば）
  - 配置の真実源: `src/lib/magazine-placement.ts`（note）/ `src/app/docs/[...slug]/page.tsx`（アフィリ）
  - 出力: `.claude/state/metrics/monetization/coverage-latest.md`（+ coverage-*.json）
- いずれも CI（`fetch-metrics.yml`）が page 次元と CTA クリックを毎週 commit するため、
  ライブ fetch は不要。creds 未設定でも成立する。

分析項目:
- 「要対応ギャップ（高流入 × 無導線）」の件数と顔ぶれ（≥15 users で収益導線ゼロ）
- 上位ページの note CTA / アフィリ カバレッジと CTR（クリック未蓄積時は n.d.）
- CTR が著しく低い高流入ページ（クリックデータが揃ってから）

出力形式: `coverage-latest.md` の内容をそのまま「## 収益カバレッジ ダッシュボード」
セクションとして埋め込む。ギャップがあれば「## 課題・ブロッカー」にも 1 行で起票する。
```

#### Agent D: 計画との差分

```
調査項目:
- .claude/state/weekly-reports/ の当週計画ファイルを読み込み
- 計画タスクの完了/未達を判定

出力形式:
- 「計画タスク vs 実績」の対照表
```

#### Agent F: 校正サイクル進捗

> **⚠️ 廃止・実行スキップ（2026-07-03）**: この節が依拠する `/exam-keyword-cycle` は 2026-05-15 に退役（`/quality-cycle` へ一本化）。`.claude/state/exam-keyword-cycles/` は 2026-05-14 で凍結、`select-next-question.mjs`・`sync-umbrella.mjs` は不在、後継 `quality-cycle` は別 state（`quality-cycle-state.json` 等）を使うため読み替え不可。**週次実行時は本節（Agent F）を丸ごとスキップすること。** 全面除去＋references分割は棚卸し提案（PR 説明参照）で判断待ち。

```
目的: /exam-keyword-cycle の実施状況をトラッキングし、年度別カバレッジ・未カバー過去問・次週の候補を可視化する

調査項目:
- .claude/state/exam-keyword-cycles/logs/index.json（過去サイクルの履歴）
- .claude/state/exam-keyword-cycles/progress.json（カバー状況 + umbrella_issues の Issue 番号）
- src/config/exam-question-keywords.json（過去問カタログ）
- 今週実施分の抽出: index.json.cycles の date が直近 7 日以内のもの
- 年度別 Umbrella Issue の状態: `gh issue view <番号> --json state,body`

分析項目:
- 今週のサイクル数・対象キーワード数・PR リンク
- 年度別カバレッジ率（covered[exam] の設問数 / catalog[exam] の設問数）
- 未カバーバックログ件数
- 次週の推奨 3 件（select-next-question.mjs を 3 回分シミュレートするか、若番順上位 3 件）
- 年度別 Umbrella Issue の進捗と停滞検知

次週候補の取得方法:
  node .claude/skills/quality/exam-keyword-cycle/scripts/select-next-question.mjs --pretty

**Umbrella 同期**: 今週サイクルが 1 件以上あれば、レビュー末尾で `sync-umbrella.mjs --all` を呼び出して Umbrella の checkbox・進捗・完了サイクルリストを最新化する（`/exam-keyword-cycle` 側でも毎サイクル呼ぶが、週次でも安全網として実行）。

次週候補 3 件を親 Umbrella `<!-- sync marker: next-candidates -->` セクションに反映（親 Umbrella の body を編集、または本週の [PDCA] Issue に記載）。

出力形式: 「## 過去問起点の校正サイクル」セクションに以下を埋め込む

## 過去問起点の校正サイクル

> **⚠️ 廃止・出力省略（2026-07-03）**: Agent F 廃止（前掲の Agent F バナー参照・/exam-keyword-cycle 退役）に伴い、**本セクションは週次レポートから丸ごと省略すること**（空欄で埋めない）。

### 今週のサイクル実施
| 日付 | 過去問 | 対象キーワード | PR |
|---|---|---|---|
| YYYY-MM-DD | R07 Ⅰ-1-N | N 件 | #N |

### 年度別 Umbrella
<!-- progress.json.umbrella_issues から Issue 番号・状態・進捗% を surface -->

| 年度 | Umbrella | 状態 | 進捗 | 先週比 |
|---|---|---|---|---|
| R07-primary | #36 | open | N/40 (N%) | +M |
| R06-primary | #37 | open | N/40 (N%) | +M |
| R05-primary | #38 | open | N/40 (N%) | +M |
| R04-primary | #39 | open | N/40 (N%) | +M |
| R03-primary | #40 | open | N/40 (N%) | +M |
| **全体** | **#41 (親)** | **open** | **N/200 (N%)** | **+M** |

### 次週の候補
1. R07 Ⅰ-1-X（未カバー最優先）
2. R07 Ⅰ-1-Y
3. R06 Ⅰ-1-Z

注意:
- 今週のサイクルが 0 件なら「今週の実施: なし」と記録し、次週候補のみ surface
- カバー率 100% の年度は「全問カバー済み」と明記し、年度 Umbrella を close する（次年度 Umbrella を generate-umbrella.mjs で作成）
```

#### Agent E: 校正学習の蒸留

```
目的: 今週の校正作業から新ルール・原則精緻化・ユーザー嗜好・ワークフロー改善を抽出
      次週以降の校正品質を底上げする継続改善ループを週次で回す

実行方法:
- /distill-proofread-learnings --since "7d" を呼び出す
  （スキル実体: .claude/skills/management/distill-proofread-learnings/SKILL.md）
- 分析対象: git log で直近 7 日の `.local/r2/posts/` 配下の MDX/SVG コミット
- 出力: .claude/state/proofread-learnings/YYYY-MM-DD.md

出力形式: 「## 校正学習の蒸留」セクションに以下を埋め込む:

## 校正学習の蒸留

### 今週の抽出結果
- 既存原則の適用: N 件（学習対象外）
- 新規ルール候補: N 件
- 既存原則の精緻化: N 件
- ユーザー嗜好: N 件
- ワークフロー改善: N 件

### 採択候補（ユーザー承認待ち）
| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|
| 1 | 新規ルール | ... | content-principles.md §X |

### 学習ログ
- `.claude/state/proofread-learnings/YYYY-MM-DD.md` に詳細記録

注意:
- 2 回以上適用されたパターンのみ新規ルール候補に昇格（偶然排除）
- 本エージェントは候補を surface するのみ。適用はユーザー承認後に別途実行
- 候補がなければ「今週の学習候補: なし」と記録して次週へ
```

#### Agent G: Umbrella Issue 棚卸し

> **⚠️ 廃止・実行スキップ（2026-07-03）**: 本節は GitHub Issue（Umbrella）を前提とするが、**GitHub Issue は廃止済み**（CLAUDE.md §8「GitHub Issue は使わない・タスク管理は `docs/todo/`」、真実源 `docs/reference/information-architecture.md`）。`gh issue list` は現運用で空/無効。**週次実行時は本節（Agent G）をスキップし、タスク棚卸しは Agent H（handoff/doc ライフサイクル）＋ `docs/todo/` に委ねること。** 全面除去は棚卸し提案で判断待ち。

```
目的: `docs/reference/information-architecture.md` で定義した
      「md は Why / Issue は実行タスク」の分離ルールを週次で drift 検出する。
      open Umbrella Issue の進捗・停滞・完了漏れを surface する

調査項目:
- gh issue list --label umbrella --state open --json number,title,body,updatedAt,labels
- gh issue list --label umbrella --state closed --search "closed:>{7日前}" --json number,title,closedAt
- 各 open Issue の body 内チェックリスト集計: [ ] / [x] の数
- updatedAt が 14 日以上前の Issue（停滞）
- checklist が全 [x] なのに open のまま（close 漏れ）
- body 内の「関連ロードマップ」リンクが docs/project/ に実在するか（孤立 Umbrella 検出）

出力形式: 「## GitHub Umbrella Issue 棚卸し」セクションに以下を埋め込む

## GitHub Umbrella Issue 棚卸し

> **⚠️ 廃止・出力省略（2026-07-03）**: Agent G 廃止（GitHub Issue 廃止・CLAUDE.md §8）に伴い、**本セクションは週次レポートから丸ごと省略すること**（空欄で埋めない）。タスク棚卸しは Agent H＋`docs/todo/` に委ねる。

### Open Umbrella ({n} 件)
| # | タイトル | 進捗 | 最終更新 | 状態 |
|---|---|---|---|---|
| #27 | [Umbrella] exam-keyword-cycle Phase 3 & 補強候補 | 0/6 | 2026-04-20 | 正常 |

- 進捗: checklist の [x] / 全 checkbox 数
- 状態: 正常 / 停滞（14d+ 更新なし） / close 漏れ（全 [x]） / 孤立（ロードマップ欠落）

### 今週 close された Umbrella ({n} 件)
- #N: タイトル — 後継 Umbrella があればリンク

### アクション提案
- 停滞 Umbrella: 着手 or 中止判定が必要
- close 漏れ: Issue を close し、対応する md の「追跡 Issue」行を更新
- 孤立: ロードマップ md を作成 or Umbrella を close

注意:
- Open Umbrella が 0 件なら「追跡中の Umbrella なし」と記録し、次節をスキップ
- 本エージェントは surface のみ。close や close 漏れ修正はユーザー判断
- PSI 違反 Issue（`performance` / `auto-generated`）や個別 Issue は本エージェントの対象外
```

#### Agent H: handoff/doc ライフサイクル棚卸し（surface）

```
目的: docs/handoffs/ に active handoff が溜まるのを週次で検出する。
      機械 surfacer の候補を列挙し、タスク抽出・退避を促す。判定も適用もしない。

調査項目:
- node scripts/check-doc-lifecycle.mjs --json   （age>=14d / orphan / tracked / 本文の PR#・SHA 言及）
- 各候補が docs/todo/ から参照されているか
  （tracked=あり → 生きたタスクは backlog 済みで ARCHIVE 候補 /
   tracked=なし → backlog へのタスク抽出漏れの疑い）

出力形式: 「## ドキュメント棚卸し（handoff 退避候補）」セクションに以下を埋め込む

## ドキュメント棚卸し（handoff 退避候補）

### active handoff 候補（{m} 件）
| handoff | 経過 | tracked(todo) | 完了シグナル(PR/SHA) | 推奨 |
|---|---|---|---|---|
| 2026-MM-DD-xxx.md | 21d | あり | #123 | /doc-declutter で退避判定 |

- 既定方針: handoff は「extract→即 ARCHIVE」（残作業があっても KEEP しない・handoffs/ は溜めない。真実源=information-architecture.md「handoff のライフサイクル」）
- tracked=あり: 生きたタスクは backlog 済み → そのまま ARCHIVE 候補
- tracked=なし: backlog へタスク抽出してから ARCHIVE（抽出漏れ注意）

### アクション提案
- 候補が 1 件以上 → 次のローカルセッションで `/doc-declutter` を実行（外部実体を検証して抽出/退避）

注意:
- 本エージェントは surface のみ。archive/抽出/commit はしない（判定・適用は doc-curator + /doc-declutter）
- 候補 0 件なら「棚卸し不要」と記録し次節をスキップ
- _archive 内は対象外（check-doc-lifecycle が既に除外済み）
```

#### Agent I: SNS 予約キュー投入 surfacer（X カウントダウン）

```
目的: docs/sns/x/draft/ のコミット済み下書きで「X 予約キューへ未投入のまま go-live が近い」
      ものを週次で検出し、次バッチの投入を促す。直前カウントダウンのように週次小分けで投入する
      運用（§11 凍結回避＝一括投入しない）で、投入忘れ＝予約キューの穴を防ぐ。

調査項目:
- node scripts/x-queue-surfacer.mjs   （オフライン・status.json + tweets.md 読みのみ。
  ルーチンのリモート checkout でもローカル creds 無しで動く）
  - 既存予約の充足ライン（covered_until）と、lookahead（既定 8 日）内に go-live を迎える
    未投入下書きを DUE / OVERDUE で列挙する

出力形式: スクリプト出力（📮 ヘッダ + 表 + 投入手順）をそのまま「## SNS 予約キュー投入（X）」
セクションに埋め込む。DUE/OVERDUE が 1 件以上あれば「## 来週への申し送り」にも 1 行起票する。

注意:
- 本エージェントは surface のみ。実際の投入は次のローカルセッションで
  x-schedule-guard --queue 緑 → publish-x → x-sync-status の手順で人手（クラウドルーチンは
  ローカル Playwright プロファイルを持たないため投入できない）。
- 「✅ 投入待ちなし」なら本節は 1 行で記録して次へ。
```

### Phase 2: 分析・統合

1. **達成率**: 計画タスクの完了率
2. **成果ハイライト**: 今週のトップ成果
3. **課題・ブロッカー**: 未達タスクの原因分析
4. **学び**: 発見・改善点

### Phase 3: 出力（md ファイル保存）

下の「出力フォーマット」に従い、すべてのセクションを 1 本の markdown としてまとめ、**`docs/reviews/weekly/YYYY-Www-review.md`** に保存する（`writeMdxFile` 経由は不要、通常の md なので Write でよい）。

ファイル先頭は H1 + 作成日 + 対象期間（既存 `2026-W21-review.md` と同形式）:

```markdown
# 週次レビュー YYYY-Www

作成日: YYYY-MM-DD
対象期間: YYYY-MM-DD 〜 YYYY-MM-DD

---

（以降、下記「出力フォーマット」のセクション 1〜N を順に埋め込む）
```

**重要**:
- 保存先は `docs/reviews/weekly/`（zone A = docs/。`.claude/state/*.md` は新規作成禁止）
- 既存の同名ファイルがあれば上書きせず内容を統合してから Write する
- 前週レビューへの相対リンク `[YYYY-W(N-1)-review.md](./YYYY-W(N-1)-review.md)` を冒頭に入れると追跡しやすい
- GitHub Issue は作成しない（CLAUDE.md §8 準拠）

### Phase 4: 週次計画の自動生成

レビュー完了後、**自動的に `/weekly-plan` を実行**して翌週の計画を `docs/reviews/weekly/YYYY-Www.md` に保存する（review 本体とは別ファイル。`weekly-plan` 側の出力先に従う）。レビューの「来週への申し送り」が計画の入力になる。

## 出力フォーマット（md 本文）

ファイル名は `docs/reviews/weekly/YYYY-Www-review.md`。先頭に H1 `# 週次レビュー YYYY-Www` と作成日・対象期間を置き、以降に下記セクションを順に並べる。

```markdown
## サマリー
- 計画タスク達成率: N/M（N%）
- 主な成果: ...

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|

## 成果ハイライト
1. ...

## 開発活動
- コミット数: N
- 主な変更: ...

## コンテンツ実績

| カテゴリ | 今週 | 先週 | 増減 |
|---|---|---|---|

## NSM（オーガニック検索流入）

<!-- Agent C の metrics-reader.mjs 出力をここに埋め込む。
     GA4 週次（Organic Search users ★NSM、全体 users/sessions、チャネル別）と
     GSC 週次（clicks/impressions/CTR/平均順位、トップクエリ）の前週比較表。 -->

### NSM トレンドの洞察
- Organic Search users の増減: ...（コンテンツ追加・SEO 改善・試験シーズン影響などの要因）
- 注目クエリ: 順位上位だが CTR が低い → title/description 改善候補

## 実験の進捗

<!-- Agent C が .claude/state/experiments.json から running/measuring/今週 close を自動生成。
     running 実験の baseline → current 比較、measure 推奨の警告、
     close 実験の learnings を出力。 -->

### Running
| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|

### Measuring
| ID | title | baseline | current | 効果判定 |
|---|---|---|---|---|

### 今週 close

- なし

### 次サイクルへの仮説
- （Agent C が running/closed の学びから提示）

## PSI パフォーマンス推移

<!-- Agent C2 が .claude/state/metrics/psi/ と open/closed Issues から自動生成。
     今週の違反件数、スコア前週比、新規/解消した違反を記録。 -->

### Core Web Vitals 前週比

| URL | Perf | LCP | CLS | 違反状態 |
|---|---|---|---|---|

### 今週の変動

- **新規発生**: （件数）件 — 例: `/docs/xxx` で LCP 4.2s (Issue #N)
- **解消**: （件数）件 — 例: `/docs/yyy` Perf 62→78 (Issue #N closed)
- **継続放置**: （件数）件 — 7 日以上 open の Issue 一覧

### 洞察
- 改善が見える領域・退行した領域・次週の焦点

## 収益カバレッジ ダッシュボード

<!-- Agent C3 が `npm run report-monetization-coverage` の出力（coverage-latest.md）を
     そのまま埋め込む。高流入 × 無導線のギャップ、上位ページの note/アフィリ カバレッジと
     CTR（クリック未蓄積時は n.d.）。ギャップは「## 課題・ブロッカー」にも 1 行起票。 -->

## 過去問起点の校正サイクル

<!-- ⚠️ 廃止（2026-07-03）: Agent F 廃止（/exam-keyword-cycle 退役）につき本セクションは省略する。
     Agent F が .claude/state/exam-keyword-cycles/logs/index.json と
     .claude/state/exam-keyword-cycles/progress.json から自動生成していたが state は 2026-05-14 凍結。 -->

### 今週のサイクル実施
| 日付 | 過去問 | 対象キーワード | PR |
|---|---|---|---|

### カバレッジ
| 年度 | カバー / 全問 | 進捗 |
|---|---|---|

### 次週の候補
1. （select-next-question.mjs の出力）

## 校正学習の蒸留

<!-- Agent E が /distill-proofread-learnings --since "7d" を呼び出して生成。
     今週の校正作業（.local/r2/posts/ 配下の MDX/SVG 差分＋ユーザー指示）から、
     content-principles.md や関連スキルに反映すべき新ルール・精緻化・嗜好・
     ワークフロー改善を抽出する。 -->

### 今週の抽出結果
- 既存原則の適用: N 件（学習対象外）
- 新規ルール候補: N 件
- 既存原則の精緻化: N 件
- ユーザー嗜好: N 件
- ワークフロー改善: N 件

### 採択候補（ユーザー承認待ち）
| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|

### 学習ログ
- `.claude/state/proofread-learnings/YYYY-MM-DD.md` に詳細記録

## GitHub Umbrella Issue 棚卸し

<!-- Agent G が gh issue list --label umbrella で取得した open / 今週 close された
     Umbrella Issue の進捗・停滞・close 漏れ・孤立を surface する。
     docs-issue-separation.md ルールの drift 検出用。 -->

### Open Umbrella

| # | タイトル | 進捗 | 最終更新 | 状態 |
|---|---|---|---|---|

### 今週 close された Umbrella
- なし

### アクション提案
- （停滞・close 漏れ・孤立が surface されていれば対応指示）

## SNS 予約キュー投入（X）

<!-- Agent I が `node scripts/x-queue-surfacer.mjs` の出力をそのまま埋め込む。
     未投入のまま go-live が近い X 下書き（直前カウントダウン等）を DUE/OVERDUE で列挙。
     1 件以上あれば「## 来週への申し送り」にも投入タスクを 1 行起票する。 -->

## その他パフォーマンス（必要に応じて）

ページ別 PV・内部リンク導線・リファラーなど、NSM 以外で注目すべき指標があれば記録。

## 課題・ブロッカー
1. ...

## 学び
- ...

## 来週への申し送り
- ...
```

## 運用ルール

- **毎週金曜 PM に実行**（同日 06:00 JST の fetch-metrics 完了後）
- レビューは `docs/reviews/weekly/YYYY-Www-review.md` に保存（GitHub Issue は使わない）
- レビュー完了後に `/weekly-plan` が自動実行され、翌週の計画を `docs/reviews/weekly/YYYY-Www.md` に保存する
- 未完了アクションは「来週への申し送り」→ 次週計画へ引き継ぐ
- 履歴は `docs/reviews/weekly/` 配下の md と git history で参照（旧 Issue 一本化方式・W16 以前の旧 md archive は廃止済み）

## 参照

- `.claude/skills/management/weekly-plan/SKILL.md` — 週次計画
- `.claude/skills/management/nsm-experiment/SKILL.md` — 実験ライフサイクル管理
- `.claude/scripts/lib/metrics-reader.mjs` — NSM 週次メトリクス取得（本スキル Agent C の中核）
- `scripts/x-queue-surfacer.mjs` — X 予約キューの未投入下書き surfacer（本スキル Agent I の中核。`npm run x-queue-surfacer`）
- `.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs` — GSC 個別取得（ページ別・フィルタ付き）
- `.claude/scripts/fetch-ga4-data.mjs` — GA4 個別取得（ディメンション・メトリクス指定）
- `.claude/skills/management/nsm-experiment/references/definition.md` — NSM 定義の真実源
