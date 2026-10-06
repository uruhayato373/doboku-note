# 週間計画 — 2026-W41（10/05〜10/11）

**今週の成果**: 2級土木 二次（10/25・残り19日）の買い場を切らさず、技術士 筆記合格発表（11/4）の準備を前倒しし、期日を過ぎた運営者作業（KDP Select・ココナラ休止・GSC 登録）と DN-0398 の回帰を片付ける。

**参照**: [monthly.md](./monthly.md)（9月版のまま。10月の `/monthly-review` 未実施）／ タスクの詳細・完了条件・検証は [backlog.md](./backlog.md) の各 ID を見る（ここには複製しない）

---

## 実行タスク

担当の読み方: **当方（クラウド可）**＝ログイン不要でリポジトリと公開 API・公式ページだけで終わる。**運営者**・**当方（ローカル）**＝note・ココナラ・KDP・GSC UI・Instagram のブラウザログインか手元のキーチェーンが要る（下の手動キューと定常運用）。上から着手する。

| ID | 今週の出口 | 担当 |
|---|---|---|
| DN-0398 | **「落ちる答案」2本の題名の回帰を直す** — 10/1 の PR #798（`--adopt-live`）で 9/30 の修正が題名と H1 だけ戻り、HEAD の 1級・2級「落ちる答案」の `title:` と H1 に「添削する側から見た4つの型」が残っている。2本を「元発注者の視点で見た4つの型」へ直す。出口＝カード記載の grep（`git -c core.quotepath=false grep -l -E` で「添削する側」「採点する立場」「発注者・添削視点」の3語を `content` から探す）が 0 件、`npm run check-note-republish` に題名 drift の2本が出る（反映は 10/11 日曜 03:00 の Mac note-sync）、`npm run check-note-price-consistency` が通る。公開 API（`nfea4a39cf108`・`na5e045a1c6f8`）の題名確認は反映後。期日 10/11 | 当方（クラウド可） |
| DN-0445 | **2級の無料 note 2本の原稿**（残り3週間の手順／R8 二次の出題予想）を `noteStatus: draft` で作る。事実は `config/exam-calendar.json`・既存の 2級予想模試・出題分析から引き、日付は直書きしない。出口＝2本が `note-fact-checker` の指摘0、`npm run check-note-structure` で新規2本が CRITICAL 0、末尾に有料側（想定工事バンク・全3テーマ添削）への導線が1か所。3本目「添削で直った答案の実例」は顧客原稿がリポジトリ外なので今週は作らない。公開（`note-publish`）は運営者のログイン後 | 当方（クラウド可） |
| DN-0248 | **技術士 口頭の無料導入2本の残りのうち、リポジトリで終わる分**。(1) 総監の成績の評価区分（A/B/C）を日本技術士会の公式（成績通知の見方）で照合し、`content/note/技術士総監/筆記合格発表後にやること-無料/article.md` の「公式の区分ではない」の断りを維持するか公式表記へ直すかを出典 URL つきで決める。(3) 告知の `content/sns/x/campaigns/2026-11-pe-oral.json`（11/4 から 1 日 1 本以内・発表日は `exam-calendar.json` の writtenResult を参照）を作る。出口＝`npm run check-x-campaign-plan` が新ファイルを含めて exit 0。(2) 11/4 当日の公開は運営者。期日 10/26 | 当方（クラウド可） |
| DN-0537 | **2級直前向けの Instagram 予約案の一覧**（ログイン不要の部分）。`content/sns/instagram/video-packs/civil-construction-2/` の経験記述・学科記述・聞き流しまとめから、10/24 までの枠へ前倒しするテーマを選び、テーマ ID・配信日・年度や時期に依存する表現の有無を1行ずつ DN-0537 の進捗へ書く（1回9件以内）。出口＝一覧がカードにあり、年度依存の有無が全行に書かれている。Facebook ログイン復旧・`/ig-reconcile`・予約は下の手動キュー | 当方（クラウド可） |
| DN-0486 | **active 資格の要対応を1件減らす（RCCM）**。令和8年度 受験の手引き（`https://www.rccm-cpd.com/rccm/jukentebiki/juken-no-tebiki26.pdf`）の本文を読み、`config/exam-formats.json` の rccm の `verification.unresolved`（過去問を公式に公開しない判断が手引き未読）を照合して解消し、`checkedBy: self`・`checkedAt` を更新する。出口＝`npm run exam-ssot-status` で RCCM の行が消え要対応が 57→56、`npm run check-exam-calendar` が通る。測量士・測量士補の次年度日程は gsi.go.jp がクラウドから届かない（接続不可を確認済み）ので運営者の端末で確認する | 当方（クラウド可） |

## 定常運用（surfacer から pull・backlog ID なし）

| surfacer | 今週の出口 |
|---|---|
| check-coconala-orders | **当方（ローカル）** snapshot が 8.7 日前（上限 7 日）で検査不成立。`npm run coconala-orders`（要ココナラのログイン）で取り直す。room 18351970 は 9/28 に5テーマを納品済み・評価送信済み。DM 新着が無ければ orders.json を closed にし、期日超過の DN-0312 を削除する |
| x-queue-surfacer | **当方（ローカル）** `107-civil2-coconala-2026-10`（10/7〜10/14・2本・あと1日）と `095-pe-first-stage-2026-10`（10/11〜・21本・あと5日）が DUE。X セッションのある端末で `x-schedule-guard` 緑 → `publish-x` → `x-sync-status` で昇格数を実査。判定不能の 096〜103 は DN-0220 側 |
| check-note-republish | 本文 drift 3（総監コスト2・主任技士 R8予想50問）・メタ drift 40・アセット drift 336。10/11 日曜の Mac note-sync に載る。DN-0398 の題名2本が加わる |
| check-note-delivery-due | **当方（ローカル）** live 実査が 17 日前（上限 14）。`npm run check-note-attachments:live` で 575 件を取り直し、不足 0 を確かめる。note のログイン済みプロファイルとシステムの Chrome が要る（`launchNoteContext` が note.com/settings/account を開く）ので、クラウドでは動かない（10/6 に実行して確認） |
| verify-ig-status（ig-reconcile） | **当方（ローカル）** snapshot が 9/19（17 日前・上限 7）。DN-0537 のログイン復旧後に再実行する |
| check-experiment-due | EXP-009・EXP-011 は next_check_date 10/1 を超過。**運営者** Mac の `note-sales-fetch`（sales.json は 10/2 まで）を取り込んでから `/nsm-experiment measure`（取り込み前は欠測と明記）。EXP-008 は 10/20 判定（A8 成果取込と `report-career-funnel` が要人手）、EXP-014・EXP-015 は 10/26 |
| KDP 定常運用 | **当方（ローカル）** `npm run kdp-report -- --month 2026-09` で9月推計を取得（要 KDP ログイン）。書籍別行の catalog 紐付けを確認する |

## 手動キュー（ユーザー・別PC／時間差で可）

| ID | 出口 | 備考 |
|---|---|---|
| DN-0135 | #12 KDP Select 自動更新オフ（A-00〜A-06）を KDP 管理画面で実施 | **期限は今日 2026-10-06**（独占明け）。10/6 を過ぎて自動更新されなければ制約は消える。他の行は backlog の表を参照 |
| DN-0310 | ココナラへ再ログインし、`node scripts/coconala-pause.mjs --service coconala-tensaku-4theme --commit` と `--service coconala-sakusei-4theme --commit` で 1級の受付を休止。続けて経験記述ブログ 12 本へ `coconala-blog-publish --update --commit` | **判断期日は今日 2026-10-06**。受付停止の決定は 10/4 済み（カタログは paused）。残りはライブ反映だけ |
| DN-0502 | GSC（sc-domain:doboku-note.com）で技術士一次の主要 10 URL をインデックス登録リクエスト | 期日 10/4 を超過。11/22 の試験前に検索の入口を開ける。URL 一覧はカードにある |
| — | `/weekly-review`（2026-W40 分・`check-weekly-review-due` が未作成）→ `/monthly-review`（2026-09 分）の順に実行 | ローカルの対話セッション。月次の中で今月の `[時期:]` の付け直しと `npm run roll-backlog-when -- --write` を行う。`check-backlog-due` も月初の棚卸しが未実施で、期日超過に DN-0312・DN-0502 が出ている |
| DN-0537 | Facebook ログインを復旧（`npm run auth:status -- --service instagram`）→ `/ig-reconcile` で 9/20 以降の実体を確認 → 上の予約案を承認 → `publish-ig-bs` を dry-run 先行で予約 | 2級 10/25 まで 2 週間余り。ココナラ・KDP の再ログインと同じ日にまとめる |
| DN-0262 | KDP で再認証してから `node scripts/kdp-batch.mjs j-02 j-11 j-12 j-13 j-14 j-15 i-04 i-01`。第2弾（i-02 ほか10冊）は 10/7 以降 | 期日 10/17。2級の J 系を先に出して 10/25 前に LIVE にする。手順の詳細はカード |
| DN-0344 | 技術士 口頭「全部門共通版」の価格（¥1,980 仮置き）と表示する資格ブランドの2点を決める | 期日 11/3。決まれば `examKeyOf` の修正と PR #776 のマージは当方（クラウド可）で進める |

## 今週やらないこと

- **2級本試験（10/25）の後に着手する分**（DN-0442・DN-0478・DN-0538・DN-0544・DN-0514）— 試験前に棚や文言を触ると直前の受注を損なう
- **技術士一次の速報と計測待ち**（DN-0500 の令和8年度4ページは試験後・DN-0503 と DN-0532〜0534 は 11/2 以降の 28 日比較）— 今週できる手は尽きている
- **DN-0220・DN-0224・DN-0346**（図解ロールアウト・原典待ちの復旧・ココナラ市場スキャン）— 大きめの継続作業か別 PC・メモリが要る作業。試験前の 2級と技術士の準備を優先する
