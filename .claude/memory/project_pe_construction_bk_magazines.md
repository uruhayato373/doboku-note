---
name: project_pe_construction_bk_magazines
description: 建設部門BKシリーズの正典への入口、公開時の事故と旧履歴の未確認事項。
metadata: 
  node_type: memory
  type: project
  originSessionId: 112b542a-e845-4e7d-b5d4-b01158d14385
---

# 建設部門 BK マガジン

2026年6月の制作・公開履歴から再利用する注意点を抽出したメモ。過去の「完了」「残」は現況を保証しない。日別の件数・価格・noteキー・commit列挙は、このファイルのGit履歴を参照する。

## 正典

- 商品設計・科目対応・著者訴求: [noteコンテンツ計画](../../content/note/技術士建設部門/noteコンテンツ計画.md)
- 実価格・マガジンURL・公開状態: [note-magazines.ts](../../src/lib/note-magazines.ts)。記事のnoteId/noteUrlは各原稿のfrontmatter。
- 公開実体・収録・価格の照合: [note-api-verification](../knowledge/reference/note-api-verification.md)
- 記事走査・梱包・導線: [content-channelsルール](../rules/content-channels.md)
- 作業手順: `/note-publish`、`/note-magazine-create`、`/note-magazine-add`、`/note-magazine-cover`、`/note-attach-pdf`。予想問題制作は `/pe-secondary-yosou`。

過去問の区分別article-*.mdと予想のテーマ別記事が混在する。article.mdだけの走査は選択科目を落とす。字数制限・合格科目・BK番号・価格はここに複製しない。

## 公開時の事故

- 公開やマガジン作成が成功してもURL/key取得だけ失敗する場合がある。再作成前に実在を照合して既存IDを回収する。URL未記録を未公開と扱わない。
- 新規マガジンの収録確認が一時的に0件となった。取得不能・反映待ちと欠落を分け、照合してから未収録分を再実行する。
- カバーは記事のeyecatchとは別。cover/coverRectangleが非nullでもdefault_magazine_headerなら既定画像のまま。
- 「印刷用PDF付き」という本文とライブ添付は別。添付後は有料境界とカード実在を確認する。本文更新による添付消失にも注意。
- 2026-06-16にPDF添付100件で停止した。現在の上限は未確認。カード未検出が続く場合は上限・取得不調を切り分け、done-logとライブから再開する。
- 同じnote認証プロファイルへの書き込みバッチは直列にする。公開済み判定を確認してから再開する。
- 著者の経験・合格科目を創作しない。外部factcheckが実施できなければ未確認と残す。字数は各答案を実測する。
- 必須IのA/B案は当時、設問(2)の最重要課題選択で分岐し、(1)の課題と(4)の倫理は共有可能とした。各案が単独で読めること・各案個別の字数判定が要点。現行writerと原稿を先に確認する。
- テーマ別PDFで用いた見出しアンカーは「予想問題」「フル模範解答」。旧アンカーを一律転用せず、現行原稿とspecの一致を確認する。

## 旧履歴の未確認事項

以下は6月の確認候補で、現在も未完とは断定しない。正典・原稿・ライブと突合し、残る実作業は [backlog](../todo/backlog.md) へ抽出する。

- BK-07建設環境のPDF残8本（R06 II2/III、R07 II1/II2/III、R08予想 II1/II2/III）。
- BK-01道路のnoteUrl未記録と予想の公開・収録・添付、BK-Iの価格ドリフト。
- bare `pe-construction-required` と `pe-construction-required-magazine` の旧重複疑い。
- frontmatter価格・writerテンプレ・カタログ/liveの整合。公開処理が読むpriceを一律削除しない。
- 道路予想の外部factcheck、テーマ分割後のカバー/PDF/spec/収録数の整合。
- II-1/II-2のテーマ別分割、II-2の防災施工テーマ拡張、他科目展開、writer/qaのforecast節との整合、価格・商品計画への反映。
- 電力土木・鉄道の予想追加、コンピテンシー解説リンクの形式統一。過年度予想の拡充は現在の販売方針に照らして再判断する。

関連: [[feedback_no_price_in_mdx_body]] [[feedback_note_article_three_set_dod]] [[feedback_note_prepublish_verify_not_proxy]] [[project_note_write_automation]] [[feedback_shared_index_commit_safety]] [[feedback_deploy_mechanics_parallel_safe]] [[feedback_platform_only_artifacts_destroyed_by_bulk_ops]]
