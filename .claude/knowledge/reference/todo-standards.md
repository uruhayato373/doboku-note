# TODO 管理標準 (v3-unified — doboku-note と共通のカード構文・語彙の正典)

`.claude/todo/` の層構成・カード構文・タグ語彙の**単一ソース (SSOT)**。
**この規約は doboku-note と stats47 で共通** (同文コピーを doboku-note
`.claude/knowledge/reference/todo-standards.md` に置く。改訂は両リポへ同じ差分を当てる)。
パーサの単一実装は stats47 = `.claude/scripts/lib/backlog-lib.cjs` /
doboku-note = `scripts/lib/backlog-lib.mjs` (admin・CI・検査はすべてこれを使う。別実装を作らない)。

> 背景 (2026-08-18 統一): stats47 は `### [ID]` + `- **status**:` フィールド行、doboku-note は
> tier 見出し + タグ行と、カード構文が完全に別物だった。同じ人間が両方を運用するのに
> 「種類」「実行」の軸が片方にしか無く、管理画面も別設計だった。doboku の v3 スキーマ
> (tier×種類×実行の直交軸・タグ行の機械契約) を共通形とし、stats47 拡張 3 点を両 lib に入れた。

---

## 1. 層モデル (ファイル構成)

| 層 | ファイル | 役割 | ある repo |
|---|---|---|---|
| **バックログ (マスタ)** | `backlog.md` | 優先度・時期を問わず未完了タスクの全量。**唯一の起票先** | 両方 |
| 週間 | `weekly.md` | 今週実行する分 (backlog からの pull コピー = 行き先) | 両方 |
| 月間 | `monthly.md` | 今月の重点とゴール (月初に backlog から pull) | 両方 |
| 年間 | `annual.md` | 年間スケジュール (試験カレンダー等の季節構造) | doboku のみ |
| 改善 | `improvements.md` | **stats47 固有層**。effect 判定つき施策の 6 列テーブル (ID/タイトル/Status/Due/Owner/Metric)。カード構文の対象外で、improvement-triage の排他 write + effect-verdict エンジンが判定を書く | stats47 のみ |

フローは `backlog → 月初 pull → monthly → weekly`。週次・月次計画はカードの ID を参照し、
本文・status を複製しない。**完了 = カード (行) の削除** — 記録は git 履歴が持つ。
完了サマリ・経緯 prose をバックログに書かない。

## 2. カード構文

```markdown
## 🔴 高 — 今月中に着手したい

### [FEAT-EXAMPLE-01] タスク名
タグ: [収益化] [種類:不具合] [実行:sweep] [検証:npm test] [起票:2026-08-01] [期日:2026-08-31]

本文 (次・完了条件・禁止など自由記述)。
```

- `## 🔴/🟡/🟢/🟣 …` = tier セクション。**セクション外の `###` はカードにならない**
  (orphan として検査が error にする)
- `### [ID] タスク名` = カード。`[ID]` は **両リポで必須**。形式は共通 `^[A-Z0-9]+(-[A-Z0-9]+)+$` で、
  stats47 は backlog-loop の ledger / verify が ID で結線するため、doboku-note は
  **monthly/weekly が本文を複製せず ID で参照し、`docs/` から実行タスクを指すため**
  (2026-08-18 に全 91 枚へ `DN-####` を付番して必須化。`DOBOKU_ID_PATTERN` = `^DN-\d{4}$`)。
  一度付けた番号は再利用しない (削除しても欠番のままにする)。欠落・形式違反・重複は
  `check-backlog-schema` が error にする
- 見出し直下の `タグ:` 行が機械契約。本文が始まる前の 1 行だけ読まれる
- コードフェンス内の `##`/`###`/`タグ:` は本文として扱われる (構造に化けない)

## 2-2. monthly / weekly は ID 参照ビュー (doboku-note・2026-08-18)

`monthly.md` と `weekly.md` は**タスク本文・状態・完了経緯を複製しない**。backlog の ID を選ぶ表だけを持つ。

```markdown
## 選択タスク

| ID | 今月の出口 | 期限 |
|---|---|---|
| DN-0001 | 本番反映と目視確認まで | 2026-09-05 |
```

- monthly: 成果目標は 3 つまで、選択タスクは 8〜12 件を目安
- weekly: 実行タスク 3〜5 件、手動キューを含めても 8 件を超えない
- 状態・詳細手順・検証コマンドは backlog 本文を参照する
- 完了項目は weekly に残さず、週次レビューと git 履歴へ任せる
- 「今週やらないこと」は戦略上重要な除外だけ最大 3 件
- 管理画面は ID を backlog 索引と join し、タイトル・tier・種類・担当・期日を表示する。参照切れ ID は赤く出す
- `docs/` から実行タスクを指すときも同じ `DN-####` を使う
  (真実源 → [information-architecture.md](./information-architecture.md)「docs/ と .claude/todo の関係」)

## 3. タグ語彙 (両リポ共通)

| 軸 | 語彙 | 意味 |
|---|---|---|
| **tier** (見出し) | 🔴 高 / 🟡 中 / 🟢 低 / 🟣 判断待ち | 緊急度のみ。**🟣 は「やるかどうかの意思決定が未了」であって、ユーザー作業待ちの置き場ではない** (待ち先は `[実行:]` が表す) |
| **カテゴリ** (先頭の裸 token) | コンテンツ品質 / UI・UX / 収益化 / エージェント・SSOT / SNS・マーケ / インフラ・計測 | ドメイン |
| **`[種類:X]`** | 不具合 / 改善 / 意思決定 / 制作 / 定期 | tier・カテゴリと直交する軸。決定規則は §4 |
| **`[実行:X]`** | sweep / 機械 / 対話 / ユーザー / windows / 別環境 | 誰が完了まで持てるか。自動処理が単独で回せるのは `sweep`・`機械` のみ |
| `[検証:cmd]` | 任意 | 完了を判定できる決定的コマンド (自動処理の gate 第一候補) |
| `[起票:YYYY-MM-DD]` | 任意 | 鮮度測定 |
| `[期日:YYYY-MM-DD]` | 任意 | 期限。超過は admin がバッジで出す |
| `[Codex候補]` | flag | バルク処理向き |
| `[進行中]` | flag | 作業中 (人または別 run)。**自動処理はこのカードに触らない** |

- 未知のタグキー・語彙外の値は検査が error にする (パースは寛容・リントは厳格)。
- タグ無し / `[実行:]` 無しのカード = **分類待ち**。検査がファイル単位の集計 warning で
  surface し、curator (stats47 = `todo-curator` / doboku = `backlog-curator`) が漸次付与する。
  起票時に迷ったら tier は 🟡 に置き、タグは後から足してよい (起票の摩擦を上げない)。

## 4. 種類の決定規則 (上から順に、最初に当たったものを採る)

1. 期日で反復発火するか (毎週・毎月・四半期) → `定期`。**これが付いたら backlog に置くべきでない合図**
   (backlog は「いつかやる」のマスタ。反復は monthly/weekly か定期 checker の担当)
2. 成果物が「決めたこと」そのもので、決まるまで着手できないか → `意思決定`。**このとき tier は 🟣**
3. 約束・仕様に対して現状が壊れている／欠けているか → `不具合`
4. 新しい成果物 (記事・図・書籍・投稿・商品) が増えるか → `制作`
5. それ以外 (動いているものをより良くする) → `改善`

選定の優先順は**不具合が第 1 キー・tier が第 2 キー** (今も損失が出ているものを先に出す)。

## 5. 残す条件と削除条件

- 完了、撤退、superseded は**カードごと削除**する。履歴は git、効果の詳細は improvement log を参照。
- レビュー由来のカードには「次または実行順」「停止条件または禁止事項」「完了条件」を本文に付ける。
  恒久知識は rules・strategy・コード近傍 README へ移し、経緯を複製しない。
- 期日を 14 日超過し、次アクション・担当・再開条件のいずれかが無いカードは削除する。
- 🟢 の trigger 待ちは trigger を本文に明記する。単なる「いつかやる」は残さない。
- 同じ成果を指す親子タスクは、受入条件を持つ親へ統合する。
- タイトルが残作業と乖離したら（緊急枠組みの消滅・実行者の変化・スコープ縮小で当初の粒度が
  実態に合わなくなったら）、本文を削るだけ（TRIM）では直らない。旧カードを削除し、
  残作業をそのまま言い表す新タイトル・新 tier で**新しい ID として再起票する**（RESEED）。
  旧 ID は欠番のまま再利用しない（ID 再利用禁止と同じ規律・§2）。適用は完了・達成の確認と
  同様に外部実体（コミット・ライブ状態・ファイル実在）で裏取りできた場合のみ行う
  (doboku-note の具体手順: `backlog-edit.mjs --delete` → `--next-id` → agent `backlog-curator`
  の RESEED verdict → skill `/backlog-sweep --audit`)。
- (stats47) 改善施策は `effect/pending` の期限まで improvements.md に保持し、判定後は詳細ログへ
  結果を残して行削除する。指標候補は一次統計・都道府県粒度・非重複を確認できたものだけ残す。

## 6. stats47 の担当 (排他 write)

| 対象 | 書き手 |
|---|---|
| `backlog.md` の起票・タグ付与・整形 | `todo-curator` (行削除はしない) |
| `backlog.md` の**行削除** | `backlog-loop` (CI)。gate 証拠が ledger に要る → stats47 側 rules `backlog-loop` |
| `improvements.md` | `improvement-triage` (排他) |
| `monthly.md` | `/monthly-plan` skill (Write 上書き) |
| `weekly.md` | `/weekly-plan` skill (Write 上書き) |

閲覧は管理画面 `npm run admin` → http://127.0.0.1:4747/todo (読み取り専用・層タブ + 優先度/種類/実行の
ファセット)。検査は `npm run docs:check` (`check-docs-governance.cjs` が backlog-lib で card を検査)。

## 7. 書き込み先の判断 (stats47)

- 単発のバグ修正・機能改修で PR が閉じるものは GitHub Issue (`bug` / `enhancement`) を優先する。
- セッション中に出た未完了タスクは `backlog.md` へカードとして直接起票する (一時ハンドオフ文書・
  受信箱ファイルは作らない。旧 `01_未整理タスク.md` は 2026-08-18 に backlog へ統合)。
- 本番デプロイ、R2 write、外部サービス変更は、カードに書かれていても別途ユーザー承認を得る。

## 8. Obsidian での一元編集

メイン vault `C:\Users\m004195\obsidian` の `projects/` に junction (Windows) / symlink (macOS) で
両リポの `.claude/todo/` を見せる (コピー・ミラーではないのでドリフトしない — vault 側 todo ミラーを
2026-07-27 に廃止した判断と両立する)。junction は vault の `.gitignore` 対象で、マシンごとに
vault の `.claude/scripts/todo/setup-todo-links.mjs` で張る。SSOT は常に各リポ側。

## 関連

- パーサ: `.claude/scripts/lib/backlog-lib.cjs` (+ `__tests__/backlog-lib.test.cjs`)
- 自動処理 (行削除・gate): stats47 側 rules `backlog-loop`
- 文書ガバナンス (検査コード DG050/055-059): stats47 側 rules `docs-vs-issues` /
  `.claude/scripts/lib/check-docs-governance.cjs`
- 管理画面: `apps/admin/app/todo/page.tsx` (アダプタ `apps/admin/lib/server/todo.ts`)
- doboku-note 側: `scripts/lib/backlog-lib.mjs` / `tools/admin-app/src/lib/todo.ts` /
  agent `todo-planner`・`backlog-curator` / skill `/backlog-sweep`
