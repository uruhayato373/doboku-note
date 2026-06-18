# 総監 無料記事 コアパックCTA ライブ反映（再投稿バッチA）

> [!done]
> **2026-06-18 バッチA完了**：無料18本に コアパックCTA を `note-append-cta.mjs --commit` で末尾追記→**18/18 ライブAPI実体検証OK**（body+embedded に `m6e7de5e4ea3d`）。ロードマップは既済。**残=計算問題集（有料¥980・別フロー）＋R8予想有料6本（batch B）のみ**。自動化は `npm run note-append-cta`（update-mode.md 参照）。

2026-06-18 の note 導線監査で判明：総監 公開無料記事 20本中 **19本がコアパック直販CTAをライブで欠落**（ソースは正しいが 6/16 配線後に再投稿していない drift）。末尾もくじCTAはライブ生存。冒頭パックCTAは既存記事に後付け不可（edit画面 paste 無音失敗）なので、**末尾に type 追記**で反映する。

> [!warning]
> 実行は **手作業**（`note-edit-session` は編集画面を開くだけ＝保存は人手、bot検知回避のため自動化しない）。browser-use 自動経路は Mac 前提＋`disable-model-invocation`。**全消去→paste は禁止**（空更新事故）。追記は **type 方式・URL は単独行**（OGPカード化）。

## 追記する文面（全記事共通・価格は書かない＝カードが実価格表示）

```
総監の記述式を本気で仕上げるなら、書き方の「型」・設問(3)の「弾薬」・本番の「演習」を1セットにした「コアパック」が入口に最適です。

https://note.com/dobokunote/m/m6e7de5e4ea3d
```

URL 行は **行末で Enter → 4秒待つ**とリンクカードになる。本文・既存もくじCTAは触らない。

## 手順（1記事ずつ）

1. `npm run note-edit-session -- <noteId>` で編集画面を開く（初回のみ画面でログイン。以降は永続プロファイルで自動ログイン）
2. 本文の**末尾（もくじCTAの後）**にカーソル → 上の文面を入力 → URL 行で Enter → カード化を確認
3. 右上 **「公開に進む」→「更新する」**（2段）。ハッシュタグ・価格は触らない
4. 数十秒後、`curl -s --ssl-no-revoke "https://note.com/api/v3/notes/<noteId>"` を `m6e7de5e4ea3d` で grep して反映を実体確認（偽成功回避）

## 対象19本（優先度順）

| 優先 | 記事 | noteId | 編集URL | 現ライブ |
|---|---|---|---|---|
| ★最優先 | 計算問題パターン集(45view) | ne190c3ef2fca | editor.note.com/notes/ne190c3ef2fca/edit | 導線ゼロ（もくじも無し） |
| 高 | キーワード集2026変更点(54view) | n3923cbfb651b | …/n3923cbfb651b/edit | もくじのみ |
| 高 | 白書R7完全対応集(23view) | n60efbccd728b | …/n60efbccd728b/edit | もくじのみ |
| 高 | 公務員技術者の定年後資格戦略(23view) | nbdfe9446f887 | …/nbdfe9446f887/edit | 完全のみ |
| 中 | トレードオフ思考 | n1b325d339f59 | …/n1b325d339f59/edit | もくじのみ |
| 中 | 総監択一式17年分分析 | n3bcb87efddad | …/n3bcb87efddad/edit | もくじのみ |
| 中 | 4フェーズ学習法 | n6f9854578518 | …/n6f9854578518/edit | もくじのみ |
| 中 | R8予想問題 | n8e92e4673a99 | …/n8e92e4673a99/edit | もくじのみ |
| 中 | キーワード集が点にならない理由 | n14c71f3b4d72 | …/n14c71f3b4d72/edit | もくじのみ |
| 中 | 一般部門との違い | n7fb7f92f7841 | …/n7fb7f92f7841/edit | 完全のみ |
| 中 | 公務員が総監を取るメリット | n279ac7c6fe6a | …/n279ac7c6fe6a/edit | もくじのみ |
| 中 | 公務員の総監学習設計 | nc7d70c92b8b0 | …/nc7d70c92b8b0/edit | 完全のみ |
| 中 | 出題傾向変遷マップ | nc360aaa381b0 | …/nc360aaa381b0/edit | もくじのみ |
| 中 | 発注者業務を5管理に翻訳 | nd34fa843e977 | …/nd34fa843e977/edit | もくじのみ |
| 中 | 発注者視点の記述式の組み立て | nced3f11b7641 | …/nced3f11b7641/edit | もくじのみ |
| 中 | 総監をAIで勉強する | n89da1120ccaa | …/n89da1120ccaa/edit | もくじのみ |
| 中 | 自治体技術職員の択一盲点 | nb2acfecc2df7 | …/nb2acfecc2df7/edit | もくじのみ |
| 中 | 自治体技術職員の資格地図 | nb052deac97b1 | …/nb052deac97b1/edit | 完全のみ |
| 中 | 道路担当の記述式テーマ選び | n6a992fc189c8 | …/n6a992fc189c8/edit | もくじのみ |

## バッチB（R8予想 有料6本）— 完了（2026-06-18）

> [!done]
> R8予想6本（経済安保/資源循環/気候変動適応/老朽化/AI社会/災害復旧）に **コアパックCTAを無料プレビュー内（R8集カード直後）へアンカー挿入** → `note-append-cta --after m6854c7437d4d --commit`。**6/6 paywall完全保持**（価格700・can_read False・有料5400-6500字ゲート維持）＋コアパック反映＋R8集カード保全をAPI検証。境界は「予想問題」H2直前に再設定＋`boundaryBeforeExam`ゲートで保護。

## 残：計算問題集（¥300・ne190c3ef2fca）— 手動対応に保留

別構造（境界基準が「パターン」H2・`--boundary-h2 'パターン'`で対応可）だが、(1)有料設定画面の検出が不安定で `更新する` 未到達、(2)テスト中断で**末尾にコアパックの残骸下書き(has_draft:True)** が蓄積。**ライブ公開版は無傷**（価格300・ゲート維持・コアパック未反映）。手動（note-edit-session）で残骸下書きを破棄→精読ガイドカード直後にコアパック配置が安全。低優先（既に精読ガイド導線あり）。

真実源: [[../reference/note-funnel-architecture.md]]・memory `project_note_live_cta_drift`・自動化=`npm run note-append-cta`（[[../../.claude/skills/social/publish-note/references/update-mode.md]]）
