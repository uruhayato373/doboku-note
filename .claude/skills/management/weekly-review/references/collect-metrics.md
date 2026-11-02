# Phase 1 の収集（NSM・実験・PSI・収益カバレッジ・SNS 流入・計測ダイジェスト）

`SKILL.md` の Phase 1 から、Agent C・C2・C3・F・G を書くときに読む。

#### Agent C: NSM / パフォーマンス指標 + 実験進捗

```
調査方法 (2 段階):

> **大原則（誤読防止）**: 計測は CI/CD 供給が正。`fetch-metrics.yml`（毎週金 06:00 JST）が
> GA4/GSC を取得し `data/{ga4,gsc}/reports/` に commit、`psi-audit.yml` が PSI を
> 日次 commit する。**コミット済みスナップショットを読むのが既定の取得元**であり、ローカル
> creds は設計上不要。「creds 未設定＝計測基盤未整備」と扱わない。会社 PC は社内プロキシで
> 外部 API（Google/Meta）が遮断されるため、ライブ fetch は基本通らない。
> 詳細・恒久ルール: `.claude/knowledge/reference/measurement-incidents.md`（2026-06-05 エントリ）

A. NSM 指標取得（既定 = スナップショット読み）:
- まず後述「スナップショット読み」でコミット済み JSON から WoW を算出するのが既定。
- creds + 外部到達性が両方ある環境（例: creds 入り macOS）に限り、任意で
  `node .claude/scripts/lib/metrics-reader.mjs`（markdown 出力）でライブ取得してもよい
  → GA4 と GSC から今週 vs 前週の NSM 関連メトリクス（Organic Search users（NSM）、
     全体 sessions、CTR、検索順位、トップクエリ）
- いずれの出力も「## NSM（オーガニック検索流入）」セクションとしてレビューに埋め込む

B. 実験進捗レポート:
- **期限判定はまず `npm run check-experiment-due -- --json` を実行し、その結果を転記する**（2026-09-19 に check-experiments-due を統合・削除。判定の唯一の実装は `scripts/lib/experiment-due.mjs`）
  （LLM が経過日数を数え直さない。期限計算は決定的に決まる＝CLAUDE.md §5）。
  - `dueExperiments[]` … 再測定・裁定の期限が来ている実験。各要素の `reason` をそのまま出す
    （measure 期限超過 / next_check_date 未設定のまま滞留 / proposed のまま滞留）
  - `issues[]` … `pending_user_actions` が残っている実験。**due でなくても必ず出す**
    （例: 「deploy 後に LCP を再計測」＝deploy 待ちで宙吊りになっている申し送り）
  - なぜ機械化したか: 再測定の放置が EXP-002（70日→計測不能で cancelled）・EXP-003（42日）・
    EXP-005（proposed 4週）と 3 回実績化したため
- 続けて `data/business/experiments.json` を読み、status 別にグループ化:
  - running: 経過日数、baseline との gap（metrics-reader で再取得）
  - measuring: baseline vs current の前後比較
  - 今週 close したもの: result + learnings
- `kind: search-strategy` は上記の汎用metrics-reader比較から除外し、`npm run search-improvement -- status` と `check-experiment-due` の `review`（`search-improvement close`）に従う。
- その他の各 running 実験について baseline の metric が現状でどう動いたかを数値表示
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
  - GA4 NSM（推奨）: `ga4.channel-organic`（7日窓・JP・Organic Search のみ）の
    最新2ファイルをファイル名日付で sort → 各 rows の activeUsers を NSM として前週比を算出。
    **これがクリーンな7日 WoW**。`ga4.channel-organic` が無い場合のみ `ga4.channel`（28日窓）に
    フォールバックし、その場合は「28日ローリング比較」と明記する（クリーンな WoW ではない）。
  - GSC: 対象週と比較週の成長パック `gsc.totals` の無次元 `byProperty` 全体値を使う。期間・国・Web・確定データを揃え、取得失敗は欠測とする。page/query明細はAPIで行が省略される部分集計であり、全体値への代用や前週比の基準にしない。
  - PSI: `data/psi/batch/*.json`（Agent C2 と同じ）を使う（ライブ PSI 呼び出し不要）
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
- `npm run psi-audit:check` を実行し、**stderr の `field(CrUX) coverage: X/Y` と `field 判定不能の内訳` の行をそのまま転記する**（機械が `field_availability.url_level`/`origin_level` を数えた値。生 JSON を目視で読み直さない）
- data/psi/batch/*.json の直近 7 日分（GitHub Actions psi-audit.yml が develop に毎日 [skip ci] で commit）
- config/psi-config.json のしきい値
- （廃止: `gh issue list --label performance,weekly-pdca` は GitHub Issue 廃止〔CLAUDE.md §8〕で無効。違反の追跡は上記 psi-batch JSON の時系列＋しきい値比較のみで行う）

> **大原則（誤報防止）**: **実害は field_data(CrUX 実ユーザー p75) で判定し、lab は診断に使う**。
> lab は合成スロットリング値で日次の振れが大きく（同一ページが同一週内に 2,026〜7,201ms を往復）、
> **単発値・単発差分で CRITICAL を立てない**。field が FAST なら lab がどれだけ悪くても
> 「改善余地（Medium 以下）」であって障害ではない。lab の回帰は**直近 5 バッチの中央値**で見る。
> 真実源: `.claude/knowledge/reference/measurement-incidents.md`「2026-07-27: lab と field の判定原則」。
> 機械可読は `config/psi-config.json` の `judgment`。
> ※ 2026-07-27（W30）に lab の単発スパイクを CRITICAL と報告し、実際は field p75 822ms=FAST で
> 実害ゼロだった。1 週間分の優先順位が歪んだ。

> **field の読み方（DN-0158・2026-09-14 の教訓）**: `field_data` はキーが常に存在し、CrUX が
> 無いときは値だけ null になる。「キーがある＝データがある」と読まない。**非 null の件数**（上の
> `npm run psi-audit:check` 転記）で読み、0 件なら「field なし・実害判定不能」と書く。
> **field が無い期間は「復旧」「FAST」を書かない**。復旧を報告するときは、非 null になった
> バッチ名と URL 数を併記する（「直近 3 バッチ」のような件数だけの記述で終えない）。
> 真実源: `.claude/knowledge/reference/measurement-incidents.md`「2026-09-14: PSI field_data の
> キー存在を『field あり』と読んだ（W36 週次レビューの偽復旧）」。

> **実ユーザー計測（RUM・2026-09-27〜）**: CrUX が訪問不足で 0 件のあいだ、実害は自前の実ユーザー計測で判定する。
> `npm run report-web-vitals` を実行し、出力をそのまま転記する（ページの型×端末×指標ごとに良好率。良好 75% 以上＝良好・
> 不良 25% 超＝不良・件数 30 未満は判定しない）。**「不良」の組が出たら、その週に改善カードを起票する**（起点は
> 「週次レビュー（開始日〜終了日）」・対象はページの型・lab の `lcp_element` を原因の手がかりに添える）。既に同じ型の
> カードがあれば起票せず、そのカードに今週の良好率を 1 行足す。exit 2（記録なし・10 日超・カスタムディメンション未登録）は
> 「実害判定不能」と書き、原因（GA4 設定の反映 ga4-admin:apply の未実行など）を課題に 1 行残す。lab だけで起票しない原則は変えない。

分析項目:
- **実ユーザー計測の不良・要改善の組**（上の `report-web-vitals`）を先に見る＝実害の有無。CrUX の field が出ている URL はそれも併記する
- **field_data.LCP/INP/CLS の category**（FAST/AVERAGE/SLOW）
- lab の Performance / LCP は**直近 5 バッチ中央値**で前週比（単発バッチの外れ値は「スパイクあり・中央値横ばい」と 1 行添えるに留める）
- 違反 URL の **`lcp_element`**（何が LCP か）を必ず併記する。`<img loading="lazy">` なら
  `check-lcp-image-hints`（pre-commit・CI ゲート済み）が機械検出する
- 今週新規発生した違反 / 今週しきい値内に戻った違反

出力形式: 以下の「## PSI パフォーマンス推移」セクションに埋め込む。
**表には field と lab を並記し、どちらで判定したかを明示する**。
```

#### Agent C3: 収益カバレッジ ダッシュボード

```
目的: 高流入ページに note 有料マガジン / アフィリエイトの収益導線が張れているかを
機械突合し、「高流入なのに無導線」のギャップを surface する（手作業監査の自動化）。

**最初に売上の実数を出す**（2026-08-17 追加）。従来この週次は**実売上を一度も読んでいなかった**ため、
sales.json が 34 日止まっていたことに誰も気づかず、下流のガードレールが「売上は停止中」という
前提を1か月抱えたままだった。
- 売上転記の停滞・月次表示との食い違い（note-sales-fetch）と KDP ロイヤリティの取得停止は、土曜の収集の note-sales 段・kdp 段の検算 `sales-freshness`・`kdp-report-freshness`（runs.json の理由「検算 …」・DN-0847）が知らせる。落ちていれば**カバレッジの議論より先に**対象月・不足を報告する。カバレッジは流入 × 配線であって実売ではないので、転記が止まっていると収益の実態が欠けたまま議論が進む。KDP は note の sales.json と粒度が異なるため混ぜない。
- 月の受取額（手数料控除後）は下書きの「月の受取額」節（管理画面トップと同じ集計・今月の途中経過と前月・チャネルごとに確定／途中／推計／未取得）をそのまま載せる。未取得のチャネルがあれば、その取得（login-collectors の note・coconala・kdp）が今週動いたかを先に確かめる。
- Issue が無ければ `npm run sales-summary` の当月行（件数・金額）を 1 行で載せる。
  「異常なし」ではなく**実検査件数と最終転記日**を書くこと。

調査方法（オフライン・コミット済みスナップショット読み）:
- `npm run report-monetization-coverage` を実行（tsx, 外部 API 不要）。
  - 入力: 最新 `ga4.page`（流入）+ `ga4.cta-clicks`（クリック, あれば）
  - 現行の正規URLと旧URLは別行で照合する。`coverage` のGA4入力数・照合数・対象外数を確認し、入力0または照合0は集計不成立とする。
  - note配置は描画と共通の判定を使う。参照: `src/lib/magazine-placement.ts` / `src/components/docs/DocPage.tsx` / `src/components/ui/ArticleFooter/ArticleFooter.tsx`。
  - 出力: `data/analysis/monetization/coverage-latest.md`（+ coverage-*.json）
- 併せて最新 `ga4.key-events-by-page`（`npm run ci-data -- latest ga4.key-events-by-page` が「ファイル#枠」を返す。pagePath × sessions / keyEvents / sessionKeyEventRate・28 日）でキーイベント率の上位・高流入なのに 0 のページを、`ga4.cta-clicks` の `coconala_cta_impression` / `coconala_cta_click` でココナラ CTA の表示→クリック率を、`qualification_bridge_impression` / `qualification_bridge_click` で実務記事・共通仕様書の「業務経験 → 資格」カード（EXP-012）の表示→クリック率を 1 行ずつ載せる（立場別は `ga4.cta-clicks-by-label`。ファイルが無い・0 件は「未取得」と書き、0 と混ぜない）。
- いずれも CI（`fetch-metrics.yml`）が page 次元と CTA クリックを毎週 commit するため、
  ライブ fetch は不要。creds 未設定でも成立する。

分析項目:
- 「要対応ギャップ（高流入 × 無導線）」の件数と顔ぶれ（≥15 users で収益導線ゼロ）
- 上位ページの note CTA / アフィリ カバレッジと CTR（クリック未蓄積時は n.d.）
- CTR が著しく低い高流入ページ（クリックデータが揃ってから）

出力形式: `coverage-latest.md` の内容をそのまま「## 収益カバレッジ ダッシュボード」
セクションとして埋め込む。ギャップがあれば「## 課題・ブロッカー」にも 1 行で起票する。
```

#### Agent F: SNS 流入・投稿実績

```
目的: SNS（X / Instagram / YouTube）から doboku-note への流入と公開状態を週次で
可視化し、「投稿 → 計測 → 改善」ループの計測フェーズを閉じる。オフライン読みのみ
（ライブ fetch なし・creds 不要）。IG/X の公開ドリフトは Agent B / Agent I が既に
扱うため、ここでは重複させず「流入」と「YT 公開照合」に絞る。

調査方法（コミット済みスナップショット読み・全て CI 供給）:
- SNS 流入: `ga4.source-medium-sns` の最新 2 ファイルで
  source（x/instagram/youtube/note）別 WoW を出す。1 ファイルしか無い初週は絶対値のみ
  （delta は「前週データなし」と明記）。ファイル自体が無ければ「SNS 流入スナップショット
  未生成（fetch-metrics 次回金曜で生成）」と 1 行。
- 週次スナップショット: `data/business/weekly/` の最新 YYYY-Www.json の `sns` セクション
  （source 別 WoW・合計）も併記できる（上と同じ CI 由来）。
- YT 公開照合: SNS の保留に合わせて 2026-10-25 に CI（registry-reconcile.yml・verify-video-publication）から外した。
  照合の記録は更新されないので、保留の間は書かない（再開するときに作り直す）。

分析項目:
- source 別の週次増減（急落 source・新規に伸びた source を 1 行ずつ）
- SNS 合計流入の水準（organic との桁比較で「まだ小さいが単価/導線は効く」等の解釈は
  revenue-diagnosis メモに委ね、ここでは数字と増減のみ）
- YT 公開ドリフトの有無（★があれば「## 課題・ブロッカー」に 1 行起票）

出力形式: 「## SNS 流入と投稿実績」セクションに source 別 WoW 表＋YT 照合サマリを埋め込む。
異常（source 急落・YT ドリフト）は「## 来週への申し送り」にも 1 行で起票する。
```

#### Agent G: 計測ダイジェスト（GA4 × GSC × 収益導線・親が直接実行）

CI（金曜の `fetch-metrics.yml`）が前の完了週（月〜日・JST）と直前 28 日の基線で取った成長パックから、改善機会を
安定 ID（`OPP-…`）付きで抽出した**機会ダイジェスト**を読む。**土曜 W のレビューは digest W−1**（事業レビューと同じ窓）。

```bash
git pull --ff-only                        # CI が金曜に push した digest / pack / 自動計測を取り込む
npm run growth-digest -- --print          # レビュー本文へそのまま貼る（先頭の <!-- growth-digest:YYYY-Www --> を消さない）
npm run growth-triage -- list             # この週の未処分（Phase 2.5 で全件処分する）
```

- 出力をそのまま「## 計測ダイジェスト」節へ貼る。**要約・転記し直さない**（マーカーが月曜の guard の証跡）
- 入力が「欠測」と出た項目は 0 と読まない。計測の機会（measurement）として Phase 2.5 で処分する
- ダイジェストが無い・古い（CI 停止）なら「## 課題・ブロッカー」に書き、fetch-metrics の Issue を確認する
- 区分・閾値・表示上限の真実源: [growth-cycle.md](../../../../knowledge/reference/growth-cycle.md)
