# Phase 3〜4 と出力フォーマット（レポート本文の全節）

`SKILL.md` の Phase 3（保存）・3.5（バックログの関門）・4（申し送りの振り分け）と、レポート本文の節ごとの雛形を書くときに読む。

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

### Phase 3.5: バックログの関門（必須・運営者に諮る）

`npm run backlog-gate -- --weekly` で対象を出し、次の 3 つを片付ける。結果は「## バックログの関門」節に書く（管理画面 戦略 ＞ レビューの手順チェックリストがこの節で実施を確かめる）。

1. **今決められる判断待ち（🟣）を全件**（`[時期:]` が来月以降のカードは判断材料がそろう時期が決まっているので、その月まで諮らない）、1 件ずつ「背景 1〜2 行・選択肢・おすすめと理由」にまとめて運営者に諮る（AskUserQuestion は 1 回 4 問までなので、4 件ずつ区切って全件を回す）。答えで台帳を直す: やる → `[時期:]` を付けて 🟡（期日があれば 🔴）へ移す／やらない → `node scripts/backlog-edit.mjs --delete <ID>`／保留 → そのまま（次の週次で再び諮る）。
2. **期日切れ**は、終わっていれば削除、続けるなら期日を直す。
3. **直近 7 日の起票**の重要度と `[時期:]` が妥当かを確かめ、ずれていれば直す。
4. **開いてから 7 日を超えた automation-failure Issue**（`gh issue list --label automation-failure --state open --json number,title,createdAt`）は、その場で原因を直すか、`[種類:不具合]` のカードにして Issue 本文にカード番号を書く。Issue は復旧で自動クローズするが、原因が直らない限り開いたままで、backlog の選定（不具合優先）に乗らない（2026-09-27 時点で #478 workflow-health ほか 4 件が滞留）。

### Phase 4: 申し送りの振り分け → 週次計画の自動生成

**1. 申し送りの振り分け（必須）**: `.claude/todo/weekly.md` を書く `/plan-weekly` はレビューを読まないので、申し送りはレビューに書いただけでは台帳へ届かない（W37 で 5 件が行き場を失った・DN-0230）。「来週への申し送り」の**各項目の末尾に振り分け先を書く**。先は次の 4 つのどれか。

| 振り分け先 | 書式 | 使うとき |
|---|---|---|
| backlog 起票 | `→ 振り分け: DN-0301` | 単発で完了がある作業。**先に backlog へ起票してから ID を書く**（既存カードならその ID） |
| weekly 定常運用 | `→ 振り分け: 定常` | 反復する運用（drift 消化・転記など）。backlog には置かない（todo-standards §1-2） |
| Issue | `→ 振り分け: #485` | open の `automation-failure` Issue で追う障害 |
| 実験 | `→ 振り分け: EXP-007` | experiments.json の実験の裁定・再計測 |

pre-commit の `scripts/check-handoff-extraction.mjs` が 2026-W39 以降のレビューで次を検査する。各項目に振り分け先があるか。DN-ID が backlog（または dispatch-log の完了記録）にあるか。EXP-ID が experiments.json にあるか。旧週のレビューと計画を削除するときも、削除される申し送りの各項目に上記の居場所があるか、新しい週次ファイルへ同じ文面で転記されているかを見る。無ければ commit を止める。

**2. 週間計画**: 振り分け後、**続けて `/plan-weekly` を実行**して翌週の `.claude/todo/weekly.md` を書き直す（週間計画の正本はこの 1 ファイル。候補は `[時期:]` が今月を含むカードで、申し送りで起票・振り分けた DN もここへ入る）。（重い戦略版の `/weekly-plan` は 2026-11-01 に退役した。）

## 出力フォーマット（md 本文）

ファイル名は `docs/reviews/weekly/YYYY-Www-review.md`。先頭に H1 `# 週次レビュー YYYY-Www` と作成日・対象期間を置き、以降に下記セクションを順に並べる。

> **分量バジェット**（真実源: [docs-markdown-style.md](../../../../knowledge/reference/docs-markdown-style.md)「長さの既定」）:
> **サマリーは成果・要注意・数値の要点だけ**を数行で。**各セクションは判断に使う点だけ**を載せる。
> **表は判断に要る行＋「他 N 件」**。エージェントの出力をそのまま貼らず、要点に落として書く。
> 該当ゼロのセクションは「なし」の 1 行で閉じる（空の見出しを並べない）。
> **検出と表示は別**: 違反・ドリフト・候補は全件把握したうえで、載せきれない分は件数と参照先（JSON パス等）を必ず書く。黙って落とさない。

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

## 計測ダイジェスト

<!-- Agent G の `npm run growth-digest -- --print` の出力をそのまま貼る（先頭のマーカーを残す）。 -->

## 計測→改善トリアージ

<!-- Phase 2.5 の結果。| OPP | 区分 | 処分 | 行き先（DN/EXP）・理由 | の表。未処分 0 件で終える。 -->

## 実験の進捗

<!-- Agent C が data/business/experiments.json から running/measuring/今週 close を自動生成。
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

<!-- Agent C2 が data/psi/batch/ と npm run psi-audit:check の出力から自動生成
     （GitHub Issue は廃止済み・追跡は psi-batch JSON の時系列＋しきい値比較のみ）。
     今週の違反件数、スコア前週比、新規/解消した違反、field(CrUX) coverage を記録。 -->

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

## SNS 流入と投稿実績

<!-- Agent F が `ga4.source-medium-sns`（最新2件）で source 別 WoW、
     `data/business/weekly/` 最新の sns セクション、`.claude/state/yt-verify/latest.json` の
     ドリフト counts を埋め込む。初週/未生成時はその旨を明記。source 急落・YT ドリフトは
     「## 来週への申し送り」にも 1 行起票。IG/X の公開ドリフトは Agent B / Agent I 側で扱い重複させない。 -->

## 校正学習の蒸留

<!-- Agent E が /distill-proofread-learnings --since "7d" を呼び出して生成。
     今週の校正作業（content/site/ 配下の MDX/SVG 差分＋ユーザー指示）から、
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

## SNS 予約キュー投入（X）

<!-- Agent I が `npm run x-queue-surfacer` の出力をそのまま埋め込む。
     未投入のまま go-live が近い X 下書き（直前カウントダウン等）を DUE/OVERDUE で列挙。
     1 件以上あれば「## 来週への申し送り」にも投入タスクを 1 行起票する。 -->

## その他パフォーマンス（必要に応じて）

ページ別 PV・内部リンク導線・リファラーなど、NSM 以外で注目すべき指標があれば記録。

## 点検と Issue
- check-workflow-health: … → 振り分け: DN-xxxx
- #NNN … → 振り分け: 定常（理由）

## 課題・ブロッカー
1. ...

## 学び
- ...

## バックログの関門

判断待ち N 件 → やる A（ID）／やらない B（ID）／保留 C（ID）。期日切れ N 件の処置。直近 7 日の起票で直したもの。7 日超の Issue → 直した／カード（ID）。

## 来週への申し送り
- ... → 振り分け: DN-#### ／ 定常 ／ #Issue ／ EXP-###（Phase 4。1 項目 1 行）
```
