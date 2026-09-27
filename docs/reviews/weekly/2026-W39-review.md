# 週次レビュー 2026-W39

作成日: 2026-09-26
対象期間: 2026-09-21 〜 2026-09-27（事業レビューと計測ダイジェストは前の完了週 2026-09-14〜09-20＝W38 窓）

前週: 2026-W38-review.md（本レビュー確定で削除。未完の申し送りは末尾へ転記済み）

---

## サマリー

- 計画タスク達成率: 2/8（25%）。Must 3 件は 1 件完了・1 件一部・1 件未達
- 主な成果: GSC の登録済み比率が 41.8%（09-07）→ **79.9%**（09-23・1,434 件中 1,146）へ回復し、#485 が自動クローズ。YouTube の recorded_but_gone 6 件も 0 に解消
- 事業（W38 窓 09-14〜20）: 自然検索 2,130 人（1級 848・総監 174・建設部門 64・RCCM 3）、Google クリック 136、note CTA 89。note 台帳の販売は 0 件（最終売上 09-12・網羅性は未確認）、ココナラは注文 0・相談 0
- 要注意: 09-17〜23 の自然検索が 1,328 人（前週比 −37.8%）。09-19〜23 の 5 連休で日次が約 400 → 約 180 人に落ちた形で、季節要因の可能性が高い（1 週で施策判断しない）
- EXP-007 を no-effect で終了（投稿当たりの反応は 3 枠中 2 枠で不変、送客は判定不能）。実験枠が 1 つ空いた
- 購入者に届かない note は 0 本（575/575 実査・7.2 日前）。ココナラ room 18351970 の評価未送信 1 件（期限 10/6・DN-0312）

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| #485 index coverage の切り分け | Must | ✅ | 09-23 の検査で登録済み 79.9%。「検出 - 未登録」723 → 233。#485 自動クローズ |
| EXP-007 / EXP-008 の裁定 | Must | 🟡 | EXP-007 は本レビューで終了（no-effect）。EXP-008 は 09-26 に中間観察と記事サイドバー撤去を記録し、判定は 10/20 |
| backlog 40 件の分類整理と S4 是正 | Must | 🔴 | カード 80 件（分類率 100%）。S4 定期は 1 → 2 件、S10（ID 再利用）4 件が新たに出た |
| note 本文/タグ drift 解消 | Should | 🟡 | タグ drift 136 → **0**、メタ drift 70 → 0。本文 drift は 254 → 257、アセット drift 269 → 331 |
| #478 の復旧確認 | Should | 🟡 | psi-audit は復旧。代わりに index-coverage（51 日）・cloudflare-metrics・cloudflare-config-audit・scheduled-publish の 4 本が不健全で open 継続 |
| 常時緑 2 件の検証ゲート差し替え | Should | 🔴 | 未着手 → DN-0340 に起票 |
| インターフェアリングフロートの title 改善 | Could | 🔴 | 未着手 → DN-0338 に起票 |
| X 下書き 096〜103 の日付書式修正 | Could | 🔴 | 8 パック判定不能のまま（DN-0220 の配信で扱う） |

## 成果ハイライト

1. GSC の登録済みが 1,146 件（79.9%）へ回復。前回（09-07）は新規 1,275 本の統合直後で 41.8% だった
2. note のタグ drift とメタ drift が 0 になり、再公開待ちは本文 257 本（DN-0277）とアセット 331 本（DN-0269）に絞られた
3. 管理画面を 8 領域で再編し、資格一覧・商品ラインナップ・年間ロードマップを正本（exam-calendar）から出す形に揃えた
4. 実務記事「公共土木工事の検査」「公共工事の会計検査」を事実照合つきで新設（非受験層の入口・EXP-012 の送客元）
5. A8 に note を副サイト（006）として分け、転職記事 13 本のリンクを差し替え。サイト / note 別の成果が取れる形になった

## 開発活動

- コミット数（develop・09-19 以降・マージ除く）: 547（うち `[skip ci]` の自動記録 67）。content/site の新規 MDX 6 本
- 主な変更: 管理画面の領域別再編と資格一覧・商品ラインナップ、計画系（年間 → 月間 → 週間を `[時期:]` で導出）、Brain チャネル撤退、A8 の note 副サイト化、ココナラ作成系 3 件の「指導」化、handoff 全件の抽出 → 削除

## コンテンツ実績

| カテゴリ | 今週 | 先週 | 増減 |
|---|---|---|---|
| content/site 新規 MDX | 6 | 1,275（統合週） | 通常ペースへ戻る |
| note 公開記事（noteStatus 運用） | 918 | 865 | +53 |
| GSC 検査 URL（登録済み） | 1,434（1,146） | 1,516（634） | 登録 +512 |
| 品質 census | 未採点 +55・薄層逆戻り 0・スコア低下 0 | — | — |

- **note 公開状態ドリフト是正（1 本）**: 会員限定「添削練習01 工事概要の具体性」がライブ公開済みなのに reserved のまま → published に是正（ops の membership-drip FAIL の原因。コミット待ち）
- **note 再公開ドリフト**: 本文 257 本 / タグ 0 本 / メタ 0 本 / アセット 331 本 / 未初期化 7 本（301 等価 360 本は再公開不要）
- note 構成監査（check-note-structure）: **CRITICAL 0**・HIGH 53（実検査 917 本 / 対象 918・取得失敗 1）。HIGH の内訳は BOUNDARY_SHIFT 54 件中、コンクリート主任技士 実務立場別小論文集 32・診断士 記述式 8・主任技士 小論文 5・建設部門 鉄道/電力土木 各 3、会員マガジンの TAG_SHORT/MEMBERSHIP 各 21。「無料プローブがライブの無料本文に無い」＝原稿改稿後の未再公開の可能性が高く（偽陽性の型もある）、本文 drift の再公開と合わせて確かめる（全文 `.tmp/note-structure-audit.md`）
- note 未着: **0 本**（実査 575/575・取得失敗 0・09-19 測定）
- ココナラブログ: 15/15 実検査・違反 0・下書き 0
- **ココナラ 評価未送信 1 件**: coconala-tensaku-4theme（room 18351970）。snapshot 0.7 日前・7/7 タブ。残り 3 テーマの添削後に評価を返す（期限 10/6）→ DN-0312
- 競合再スキャン: DUE なし（最短 note 27 日前）
- **GSC/GA4 UI 取得（月次）**: GSC-UI は 09-24 に完全取得（10 取得・6 ゼロ・失敗 0）。**GA4-UI は 57 日前の 3 ユニット全失敗のまま**（csv-menu-ambiguous / report-not-found ×2）→ DN-0135 の 18 行目
- GSC 自動化: DUE なし（表示実績のある未登録 38 件・最後のリクエスト 1 日前）
- GA4 設定ドリフト: なし（event_label・cta_placement）
- 壊れた内部リンク: ERROR 0（2,161 ファイル / 6,103 参照）
- A8 成果取込: DUE なし（4 日前）。**未登録プログラムの疑い 5 件**（不足 click 8・確定額 0）が継続 → DN-0330
- 教材からの展開: 27 教材・930 論点、原典待ち 16・未確認 1・確認後の変更 43 → DN-0224

## NSM（オーガニック検索流入）

クリーンな 7 日 WoW（GA4・日本・Organic Search、`ga4-channel-organic-*`）:

| 指標 | 前週（09-10〜16） | 今週（09-17〜23） | 増減 |
|---|--:|--:|--:|
| Organic Search activeUsers（★NSM） | 2,136 | 1,328 | −37.8% |
| sessions | 3,072 | 1,911 | −37.8% |
| engagementRate | 70.1% | 69.6% | −0.5pt |

GSC（`gsc-date-*`・09-08〜14 → 09-15〜21・太平洋時間）:

| 指標 | 前週 | 今週 | 増減 |
|---|--:|--:|--:|
| clicks | 123 | 126 | +2.4% |
| impressions | 5,492 | 3,541 | −35.5% |
| CTR | 2.24% | 3.56% | +1.32pt |
| 平均順位（表示加重） | 17.2 | 16.6 | +0.6 |

### NSM トレンドの洞察

- GA4 日次（日本・全チャネル）は平日 09-14〜18 が 371〜443 人、09-19〜20 が 102〜119 人、祝日 09-21〜23 が 173〜191 人。連休の 3 日が窓に入ったことで説明できる落ち方で、engagementRate も保たれている。10/3 の週次で戻りを確かめる
- GSC はクリックが横ばいで表示だけ減った。連休と、GSC の窓（〜09-21）が GA4 より 2 日早い点を差し引いて読む
- 全世界の GA4 では Direct が 154 → 1,691 人（engagement 4%）、Referral が 27 → 318 人に跳ねた。日本フィルタ後は Direct 84 → 56 で、海外の bot 由来とみられる。NSM は日本フィルタなので影響なし
- 高表示・低 CTR: 「インターフェアリングフロートとは」（35 日で表示 1,215・CTR 0.16%・7.6 位）→ DN-0338

## 計測ダイジェスト

<!-- growth-digest:2026-W38 -->
## 計測ダイジェスト 2026-W38（2026-09-14〜2026-09-20・基線 2026-08-17〜2026-09-13 の週平均と比較）

入力: growth-pack=取得済み / monetization-coverage=取得済み / bing-webmaster=取得済み

| 流入元（GA4・日本） | セッション | 基線週平均 | 増減 | エンゲージ率 | キーイベント |
|---|--:|--:|--:|--:|--:|
| bing | 2,804 | 2,134 | +31.4% | 69.1% | 79 |
| google | 172 | 102.8 | +67.4% | 59.9% | 3 |
| direct | 114 | 359.8 | -68.3% | 47.4% | 3 |
| yahoo | 95 | 68.8 | +38.2% | 66.3% | 5 |
| referral | 90 | 113.3 | -20.5% | 63.3% | 1 |
| ai-assistant | 27 | 18.3 | +47.9% | 66.7% | 1 |
| organic-social | 10 | 16.5 | -39.4% | 50% | 0 |
| unassigned | 9 | 4 | +125% | 77.8% | 0 |
| organic-video | 8 | 0 | — | 0% | 0 |
| organic-other | 6 | 2.3 | +166.7% | 66.7% | 0 |

GSC（日本・web）: クリック 9（基線週平均 6.5・+38.5%）/ 表示 1,039 / CTR 0.87%

Bing 照合: GA4 の bing 自然検索セッション 2,804 / Bing Webmaster クリック 2,407（1.2 倍）

| イベント | 今週 | 基線週平均 | 増減 |
|---|--:|--:|--:|
| note_cta_click | 89 | 69 | +29% |
| affiliate_cta_click | 3 | 3 | 0% |
| coconala_cta_click | 1 | 1.8 | -42.9% |
| brain_cta_click | 0 | 0 | — |
| quiz_cta_click | 0 | 0 | — |
| note_cta_impression | 7,845 | 4,884.3 | +60.6% |
| affiliate_cta_impression | 6,423 | 5,337.8 | +20.3% |
| coconala_cta_impression | 0 | 0 | — |
| quiz_start | 2 | 0.8 | +166.7% |
| quiz_complete | 0 | 0 | — |
| standards_data_download | 0 | 0.3 | -100% |

google 流入の上昇: /exam/pe-comprehensive-management/past-exams/r08-primary（0.3→10） / /exam/civil-construction-1/secondary/r04（3→12） / /exam/civil-construction-1/secondary/experience-writing-examples（0.5→9） / /exam/civil-construction-1/secondary/experience-writing-guide（0.5→9） / /topics/concrete（0.5→5）
google 流入の下落: /docs/pe-comprehensive-management-pfi（12.3→0） / /（8.3→4） / (not set)（11.3→10）

### トリアージ対象 8 件（候補 36・抑止 0・表示上限で見送り SEO 0 / 収益 27）

| ID | 区分 | 内容 | 期待効果/週 | 推奨 |
|---|---|---|--:|---|
| OPP-797f94e448 | 実験 | EXP-007（X を1日1本→3本へ増量（型×時間帯スロット A/B/C の設計））: next_check_date 2026-09-15 を超過 | — | verdict / defer |
| OPP-cdeb596eb5 | 実験 | EXP-008（キャリア（転職アフィリエイト）を悩み起点の hub→5柱→ツールへ再設計）: 要人手 2 件: deploy から 28 日後に npm run report-career-funnel を再実行し、凍結した基線と比較する / A8 の月次成果を取り込む（npm run a8-ui:fetch -- --month YYYY-MM／要ログイン）。確定 3 件未満では案件の勝敗を決めない | — | verdict / defer |
| OPP-2ee0d7aa00 | SEO | 「インターフェアリングフロートとは」は平均 7.6 位なのに CTR 0.16%（期待 3%） | 6.9 searchClicks | backlog |
| OPP-07ad782c8d | SEO | 「スクレープドーザ」は平均 6.3 位なのに CTR 0%（期待 4%） | 0.6 searchClicks | backlog |
| OPP-09ce18f721 | SEO | 「中国地方整備局 共通仕様書」で 2 ページが競合（/standards/chugoku/local / /standards/chugoku/local/part-01） | 0.2 searchClicks | backlog |
| OPP-4d4eb6bc94 | 収益導線 | 配置 sidebar は表示 12916（28 日）で CTR 0.02%（配置の中央値 0.23%） | 7.1 ctaClicks | experiment / backlog |
| OPP-abef5fbc86 | 収益導線 | /exam/civil-construction-1/guide/exam-overview の CTA クリック率 0.28%（サイト平均 0.7%） | 1.2 ctaClicks | backlog / experiment |
| OPP-3061b036bb | 収益導線 | /exam/pe-comprehensive-management/past-exams/r08-primary の CTA クリック率 0.32%（サイト平均 0.7%） | 1 ctaClicks | backlog / experiment |

全件を `npm run growth-triage -- list` で確認し、`apply --decisions <file> --commit` で backlog / 実験 / watchword / 束ね / 却下 / 保留に振り分ける。

## 計測→改善トリアージ

未処分 0 件（10 判断・判断ファイル `.tmp/growth-triage-2026-W38.json`）。

| OPP | 区分 | 処分 | 行き先・理由 |
|---|---|---|---|
| OPP-797f94e448 | 実験 | verdict（no-effect） | EXP-007 を終了。いいね中央値は朝 1→1・夜 1→1・昼 0.5→1、送客は基線が無く判定不能。X 本数は現状維持を既定に |
| OPP-cdeb596eb5 | 実験 | defer（〜10-20） | EXP-008 の 28 日判定待ち。A8 取込は #570（認証切れ）復旧後 |
| OPP-2ee0d7aa00 | SEO | backlog | DN-0338（ネットワーク式工程表の title・description をフロート定義の検索意図へ） |
| OPP-07ad782c8d | SEO | reject | 0.6 クリック/週。rank-watch で監視のみの一般語 |
| OPP-09ce18f721 | SEO | reject | 0.2 クリック/週。重点資格外の実務参考領域 |
| OPP-4d4eb6bc94 | 収益導線 | bundle | EXP-008（記事サイドバーの転職広告は 09-26 に撤去済み） |
| OPP-abef5fbc86 | 収益導線 | bundle | DN-0250（1級二次直前・直後の CTA 切替で扱う） |
| OPP-3061b036bb | 収益導線 | bundle | DN-0248（総監 R8 択一の閲覧者へは筆記合格発表後の口頭試験導線で扱う） |
| 申し送り | — | backlog | DN-0339（IG 照合ドリフト）・DN-0340（backlog の ID 再利用と常時緑の是正） |

## 実験の進捗

`check-experiment-due`: DUE 2 件（EXP-007 MEASURE_DUE → 本レビューで終了 / EXP-008 PENDING 2 件 → 10/20 判定）。

### Running（5 件）

| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|
| EXP-008 | キャリア hub 再設計 | 36 日 | 広告 CTR 0.26% → 0.05%（中間・08-20〜09-16）、A8 発生 1・確定 0 | 10/20 判定。サイドバー撤去後の変化を同じ判定で見る |
| EXP-009 | RCCM 問題III note 販売 | 10 日 | 実売未計測 | 10/1 計測 |
| EXP-010 | note CTA rel=noreferrer 撤去 | 10 日 | — | 11/1 計測 |
| EXP-011 | 直前パック・全部パック | 10 日 | — | 10/1 計測 |
| EXP-012 | 業務経験 → 資格カード | — | — | 10/23 計測（GA4 到達確認は DN-0304） |

### Measuring

- なし（EXP-007 を終了）

### 今週 close（1 件）

- EXP-007: **no-effect** — 1 日 3 本化で投稿当たりの反応は 3 枠中 2 枠で変わらず、フォロワーは 91 → 100。サイト送客は計測できず、note 収益の X 経由は 0.2%。本数は現状維持を既定とし、再挑戦は投稿 URL の記録（DN-0276）とクリック基線を揃えてから

### 次サイクルへの仮説

- 空いた実験枠は、直前期に売上が動く資格課題へ使う。1級二次（10/4）後の「自己採点 → 合格発表までにやること」導線（DN-0250）は、試験後の検索に合わせた前後比較ができる
- 建設部門 steel-concrete-exam-themes は 28 日 26 人で note CTA のクリック 0、MagazineCard は 174 行中 167・169 行目の末尾だけ。年度別過去問 → 模範解答へ進む位置に置くと動くか（読者の次の行動と照らして月次で判断）

## PSI パフォーマンス推移

field（CrUX）の取得: **0 / 293 result**（mobile・desktop とも url・origin の両方で無し）。実害判定は不能のまま（DN-0228）。lab は直近 5 日の中央値で見る。

| strategy | Perf 中央値（直近 5 日 / その前） | LCP 中央値 | 最も遅い URL（lab LCP 中央値） | 判定 |
|---|---|---|---|---|
| mobile | 73 / 73 | 4,966ms / 4,969ms | `/exam/civil-construction-1/guide/strategy` 7,651ms | lab 横ばい・field 不能 |
| desktop | 99 / 100 | 755ms / 713ms | `/search` 1,138ms | lab 横ばい・field 不能 |

- 新規発生・解消: lab 中央値に回帰なし。最新バッチ（09-25 desktop）は 22 件中 3 件が取得失敗（14%・ゲート 20% 未満）
- 洞察: 数値に変化は無く、判断の材料は field 待ち。mobile の LCP は目標 2,500ms を中央値で約 2 倍超えている状態が続く

## 収益カバレッジ ダッシュボード

- 売上: `check-sales-freshness` ✓（実検査 303 件・転記 09-20・**最終売上 09-12**）。2026-08 は明細 26 件 ¥71,640 = note 表示 ¥71,640。2026-09 は台帳 13 件 ¥41,080（09-12 まで）
- KDP: ✓ 期限内（2026-08 確定・LIVE 46 冊を照合）
- 流入のあるページ 359（28 日）・**高流入（≥15 users）で収益導線ゼロ 0**・note 導線ゼロ 0
- 配置別 CTR（28 日）: article-body 6.59% が最高。sidebar 0.02%（表示 12,916）・article-sidebar 0.13% が最低帯（sidebar は EXP-008 で撤去済み）
- note CTA クリックの ID 解決 275 / 307（89.6%）
- ココナラ CTA は 28 日で表示 0（coconala_cta_impression）。サイトからココナラへの送客は計測上ほぼ無い
- 「業務経験 → 資格」カード（EXP-012）の表示・クリック: 未取得（DN-0304 で GA4 到達を確認中）

## SNS 流入と投稿実績

| source（GA4・日本） | 前週 users（09-10〜16） | 今週 users（09-17〜23） | 増減 |
|---|--:|--:|--:|
| note / referral | 12 | 26 | +117% |
| x / social | 3 | 11 | +267% |
| youtube / video | 8 | 0 | −100% |

- 合計 23 → 37 人。自然検索（1,328 人）と比べて 2 桁小さい
- YouTube 公開照合（09-24）: 200 件中 videoId 7・ok 7、recorded_but_gone **0**（前週 6 → 解消）・not_public 0・pending_overdue 0
- Instagram 照合（CI・09-19）: 公開済み未記録 48・異常 45・Reels 未投稿 42 → DN-0339

## 公開ページの目視確認

run 35923550088（09-23）: note 30 ページ × 5 幅（300 枚）・YouTube 2 本（26 枚）を取得、breakpoint drift なし。

- YouTube（26 枚を目視）: 崩れ・記号の露出・サムネの切れ・価格の食い違いは無し。Shorts は幅 1,050px 以上で「Video unavailable」と出る（390〜960px は通常の再生待ち）。未ログインのヘッドレス取得による表示の可能性が高く、断定しない（様子見）
- note（300 枚）: 目視の集約が本レビュー作成時点で終わらず**未確認**。指摘 0 件とは扱わない → 次の週次で同じ run の画像を見直す

## 校正学習の蒸留

今週の `content/site` の校正コミットは 25 本（実務記事 2 本の事実照合反映、RCCM・1級の断定表現の是正、長文分割など）。`/distill-proofread-learnings` の本実行と `.claude/state/proofread-learnings/2026-09-26.md` の出力は今回行っていない（未実行）。

### 採択候補（ユーザー承認待ち・2 回以上の適用を確認したもの）

| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|
| 1 | 既存原則の精緻化 | 1 文が長い出典脚注・本文の分割（c8a211b48 の 143 字 → 3 文、6f48dacd7 の会計検査記事） | content-principles.md（文長の上限を数値で持つか） |
| 2 | 既存原則の適用 | 制度・法令・給与の数値が一次資料で裏取りできないときは定性表現にする（a8b0af961・6ad4da37b） | 既存（外部仕様を断定しない）の適用例。新ルール化は不要 |

## SNS 予約キュー投入（X）

✅ 投入待ちなし（最終予約記録 10/31・lookahead 8 日）。ただし見出しの日付を読めない下書き 8 パック（096〜103・図解系・未投入 57 件）が 2 週続けて判定不能。

## ドキュメント棚卸し（handoff 抽出→削除候補）

- `docs/handoffs/` は全件抽出 → 削除済み（ディレクトリ無し）。棚卸し不要
- デッドコード在庫（knip）: 増加なし。返済 1（Unused exported types 20 → 19）→ baseline の締め直しが必要（未使用ファイル 44 横ばい）

## backlog 消化サマリ

- **消化**: done 22 件 / swept 0（blocked 0・fail 0）
- **残量**: カード 80 件（🔴24 🟡32 🟢18 🟣6）・前週 40 件から +40（計画系の再編で年間の重点カードが加わったのが主因）
- **分類率**: `[種類:]` 付与 80 / 80（改善 38・不具合 11・制作 19・意思決定 10・定期 2）
- **モデル別**: claude-code 22 / 失敗・手戻り 0
- **台帳の健全性**: S2（🟢/🟣 に沈んだ不具合）2・S4（定期）2・S9 0・**S10（ID 再利用）4**
- **完了の疑い**: 赤 → 緑 1（DN-0186 `resources:cloud`・実査が必要）・常時緑 2（check-content-expansion / check-video-content）・実行不能 1（quality:audit:ci が 180 秒でタイムアウト）
- **外部書き込みの孤児**: 0（対象 run 10 本・実検査 10 本・取得失敗 0）
- **品質 census の delta**: 新規未採点 55・薄層逆戻り 0・スコア低下 0
- **収益カバレッジ**: 上記のとおりギャップ 0

## automation-failure Issue の消化

- **自動化の失敗**: open 4 件（最古 #478・26 日前）
  - #478 workflow-health（26 日）: psi-audit は復旧。index-coverage.yml が最終成功 51 日前、cloudflare-metrics.yml と cloudflare-config-audit.yml は成功履歴なし、scheduled-publish.yml は完了 run なし
  - #636 cloudflare-metrics（2 日）: `zone-not-found`（トークンがゾーンを見られない）。DN-0317 の `CLOUDFLARE_ANALYTICS_API_TOKEN` 登録待ちと同根の可能性（未確認）
  - #571 ops（4 日）: coconala-analytics・cloudflare-metrics-freshness・afb-outcomes-freshness・membership-drip。membership-drip は本レビューの noteStatus 是正で解消見込み（コミット後の翌朝 run で確認）
  - #570 auth-state-a8（4 日）: A8 のセッション期限切れ。Mac で `auth:login` → `auth:export` が必要

## 事業レビュー（資格別・W38 窓 09-14〜20）

記録: `.claude/state/metrics/business/review-2026-09-26T05-18-27-353Z-78cb4d12-7bd6-4fa0-a08a-6264693d1a22.json`（provisional・snapshot `snapshot-2026-09-26T05-17-59-555Z-…`）。

| 資格 | 実測 | 未確認 | 判断 | 次の一手 |
|---|---|---|---|---|
| 1級土木 | 自然検索 848・Google 4・note CTA 29・演習開始 0／完了 0・ココナラ注文 0・相談 0 | note PV・販売（台帳 0 件は網羅性未確認）・ココナラ閲覧 | 二次（10/4）直前は完全攻略パックのライブを維持 | 10/1 に EXP-011 計測、10/5 に DN-0250 で CTA 切替 |
| 総監 | 自然検索 174・Google 2・note CTA 7 | note PV・販売 | 筆記発表までは既存導線を維持。R8 択一の流入（Google 0.3 → 10/週）は発表後の口頭導線へ | DN-0248（発表日に無料 2 本） |
| 建設部門 | 自然検索 64・Google 0・note CTA 3 | note PV・販売 | steel-concrete-exam-themes の CTA が末尾だけ（28 日 26 人・CTR 0%）。導線欠落とは断定しない | 月次で配置を判断 |
| RCCM | 自然検索 3・Google 0・note CTA 0・ココナラ注文 0 | note 実売・ガイド 8 本の索引状況 | 検索流入はまだ無い。評価は EXP-009 の実売で行う | 10/1 に EXP-009 計測 |

全体: 実受取・費用・作業時間は欠測（DN-0303）。KDP・ココナラ閲覧は週次へ按分しない。W36・W37 の暫定レビュー（provisional）は followups に残ったまま。

## 課題・ブロッカー

1. **note 販売の台帳が 09-12 で止まっている**（転記 09-20 は成功）。09-13〜20 の 0 件が実売か取得漏れかは未確認。月末の取得で確かめる
2. **automation-failure 4 件が未復旧**（Cloudflare 系 2・A8 認証・ops）。Cloudflare はトークン、A8 は Mac でのログインが要る
3. **PSI field が全件欠測のまま**（DN-0228）。実害判定の基盤が無い
4. **IG の照合ドリフト**（未記録 48・異常 45）が台帳に居場所が無かった → DN-0339
5. **backlog 80 件**・S10（ID 再利用）4 件。計画側が採番を再利用している疑い → DN-0340
6. 本文 drift 257 本とアセット drift 331 本はローカルの再公開待ち（DN-0277・DN-0269）

## 学び

- index coverage は大量公開の 2 週後に 41.8% → 79.9% まで戻った。大型統合の直後に落ちるのは「未クロール」が主で、2〜3 週待って再検査してから切り分けてよい
- 連休は自然検索を約半分にする。週次の窓に祝日が入ったときは、日次で平日と休日を分けて見てから NSM の増減を読む
- 投稿本数を増やす実験は、送客の基線（投稿 URL とクリック）を先に持たないと判定できずに終わる（EXP-007）
- `growth-triage apply --commit` は `[領域:]` を付けられず必ず巻き戻る。台帳の必須タグを増やしたら起票ツールも同時に直す

## 来週への申し送り

- 10/1 に EXP-009（RCCM 問題III）と EXP-011（直前パック）を実売で計測する → 振り分け: EXP-009, EXP-011
- EXP-008 の 28 日判定（10/20）で、記事サイドバー撤去後の変化と A8 確定成果を見る → 振り分け: EXP-008
- ココナラ room 18351970 の残り 3 テーマを添削し、購入者評価を 10/6 までに返す → 振り分け: DN-0312
- 1級二次（10/4）後に CTA を切り替え、exam-overview の CTA 率（0.28%）も同時に見直す → 振り分け: DN-0250
- インターフェアリングフロートの title・description 改善 → 振り分け: DN-0338
- note 構成監査の BOUNDARY_SHIFT 54 件（コンクリート系 45 件中心）を本文 drift の再公開と合わせて実査する → 振り分け: DN-0277
- IG の照合ドリフト（未記録 48・異常 45）を /ig-reconcile で解消する → 振り分け: DN-0339
- backlog の ID 再利用 4 件・常時緑 2 本・growth-triage の `[領域:]` 対応 → 振り分け: DN-0340
- backlog の S2（沈んだ不具合 2）と S4（定期 2）を `/backlog-sweep --audit` で是正し、DN-0186 の赤 → 緑を実査する → 振り分け: 定常
- noteStatus 是正（添削練習01）と本レビューの台帳・計測記録をコミットし、翌朝の ops run で membership-drip の解消を確かめる → 振り分け: #571
- Cloudflare zone analytics の取得失敗（zone-not-found）を直す → 振り分け: #636
- A8 のセッション期限切れを Mac で復旧する → 振り分け: #570
- index-coverage・cloudflare-config-audit・scheduled-publish の workflow 不健全を確認する → 振り分け: #478
- GA4-UI の取得（57 日前に 3 ユニット全失敗）を正式レポート名で直す → 振り分け: DN-0135
- A8 の未登録プログラム候補 5 件を登録・照合する → 振り分け: DN-0330
- 教材の原典待ち 16 論点と確認後の変更 43 件 → 振り分け: DN-0224
- 9 月の note アクセス・販売を月末に取得し、09-13 以降の販売 0 件を確かめる → 振り分け: 定常
- knip の返済を `check-knip-ratchet -- --update-baseline` で締め直す → 振り分け: 定常
- 10/3 の週次で連休明けの自然検索の戻りを確認する → 振り分け: 定常
- note 公開ページ 300 枚の目視確認（今週は未完了）を次の週次で行う → 振り分け: 定常
- W38 持ち越し「backlog S4（定期混入カードL82）の是正、check-backlog-verify「常時緑」2件の検証ゲート差し替え」 → 振り分け: DN-0340
- W38 持ち越し「ローカルセッションでの反映が必要な項目: note本文/タグdrift解消、ココナラ実体snapshot再取得（18日超過）、GA4-UI再取得（50日超過・3ユニット失敗のまま）、X予約下書き8パックの見出し日付書式修正」（タグ drift とココナラ snapshot は解消済み。本文 drift は DN-0277、GA4-UI は DN-0135、X 下書きは DN-0220） → 振り分け: DN-0277, DN-0135, DN-0220
- W38 計画の持ち越し「backlog 40→の消化状況（S1不具合8件を優先）」（不具合は 11 件） → 振り分け: 定常
- W38 計画の持ち越し「ローカルセッション依存タスク（note drift解消、ココナラsnapshot再取得、GA4-UI再取得）の実施状況」 → 振り分け: DN-0277, DN-0135
