# 週間計画 — 2026-W38（09/14〜09/20）

**今週の成果**: NSM は2週連続の急伸（+43.5%）だったが、DN-0026・DN-0185 の計測記録は2週連続未着手のまま持ち越し、knip ratchet の再赤と台帳カードの誤復活（マージ由来）で台帳・CI 双方に歪みが出た週だった（W37 レビュー）。

**実験・Issue（backlog ID なし）**: EXP-007 は 09-15 に裁定し枠を解放、EXP-008 は 09-18 に `report-career-funnel` 再測定。Issue #485（index coverage 41.8%）は `/gsc-review` で切り分け、#457 は 38 日 open で close 判断待ち。

**参照**: [monthly.md](./monthly.md) ／ タスクの詳細・完了条件・検証は [backlog.md](./backlog.md) の各 ID を見る（ここには複製しない）

---

## 実行タスク

| ID | 今週の出口 | 担当 |
|---|---|---|
| DN-0185 | GSC の索引状況と GA4 `standards_data_download` の発火を記録する（2週連続未達を解消） | 当方 |
| DN-0026 | 28日窓（09-14成立）の GSC URL 検査を実施し、次記事着手可否を判断する | 当方 |
| DN-0220 | develop 統合済みの図解を既存 deploy 手順で本番反映し、SNS 公開/予約 SSOT へ接続する | 当方 |
| DN-0226 | knip ratchet の新規赤（`ps`/`powershell.exe`）を `ignoreBinaries` へ追加し baseline を締め直す | 当方 |

## 定常運用（surfacer から pull・backlog ID なし）

| surfacer | 今週の出口 |
|---|---|
| check-membership-drip | 予定日超過なし（WARN 0・基準日09-14 実測済み）。次回配信を期日通り実行する |
| check-note-republish | 本文 drift（257）の消化を続ける（並行編集で増減するため着手時に実測する） |
| x-queue-surfacer | 投入待ちなし（充足10/24）。096〜103の日付書式判定は DN-0220 の SNS 接続後に見直す |
| verify-ig-status（ig-reconcile） | snapshot が09-10で4日超過。再実行して published_UNrecorded/scheduled/anomaly を更新する |
| check-coconala-orders | 09-20に全7タブ・取引3件・DM4件を再取得。DM 10051134の再オープン確認とroom 18194267の納品・評価記録を運営者が閉じる |
| check-sales-freshness | 08月note表示71,640円に対し販売明細39,520円でFAIL。販売履歴のパスワード再確認後に `npm run note-sales-fetch -- --month 2026-08 --commit` を再実行する |
| note-traffic-fetch | 08月の全記事820件・PV 7,455・表示83,515を取得済み。資格別は未帰属記事があるためpartialとして事業レビューへ反映 |
| check-gsc-ui-due | ga4-ui が due（完全取得の記録なし）。`/google-search-growth` で取得する |
| check-doc-lifecycle | handoff 2件の棚卸し候補あり。`/doc-declutter` を回す |
| distill-proofread-learnings | 11週未実施。今週の校正学習を蒸留する |

## 手動キュー（ユーザー・別PC／時間差で可）

| ID | 出口 | 備考 |
|---|---|---|
| DN-0135 | 各行の実体解消 | 詳細・完了条件は backlog の DN-0135 の表を参照。片付いた行から消す。**#12 KDP Select 自動更新オフは期限 2026-10-06** |
| DN-0120 | A8 9月分の取り込みと転職アフィリ継続の再判定 | 期日09-16。会社PCはプロキシで到達不能・Macで `/a8-report` |
| DN-0227 | YouTube 公開照合 `recorded_but_gone` 6件の切り分け | 認証が要るため Mac か CI（verify-yt-status.yml） |
| DN-0224 | 教材原典待ち17論点の復旧を再開する | 別PCで原本入手・再撮影後に再照合。詳細は[実装計画](../plans/DN-0224-source-recovery.md) |

## 今後の確定予定（KDP）

| 週 | ID | 出口 |
|---|---|---|
| 2026-W39（09/21〜09/27） | DN-0260 | `h-01` の出版前確認後、`node scripts/kdp-publish.mjs --id h-01 --publish-only --commit-publish` で審査へ提出し、`node scripts/kdp-publish.mjs --sync-status` で LIVE・ASIN を確認して Kindle カタログへ記録する |
| 2026-W40（09/28〜10/04） | 定常運用 | `npm run kdp-report -- --month 2026-09` で9月推計を取得し、h-01を含む書籍別行のcatalog紐付けを確認する |
| 2026-W42（10/12〜10/18） | 定常運用 | 10/16以降に9月を再取得して確定値へ更新し、書籍別にdoboku-note分だけを月次事業レビューのKDPロイヤリティへ反映する |

## 今週やらないこと

- **DN-0184**（YouTube/SNS 人物テンプレートの複数ポーズ実装）— 大規模改修。今週は計測debt（DN-0026/DN-0185）を優先する
- **DN-0206 / DN-0207 / DN-0208**（技術士建設部門・一次のコンテンツ拡充）— 新規制作より台帳・CI の歪み是正と計測記録を優先する週
- **DN-0231**（partial clone + git maintenance）— Mac 側の作業。今週は計測 debt を優先する
