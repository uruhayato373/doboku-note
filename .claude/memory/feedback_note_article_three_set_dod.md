---
name: feedback_note_article_three_set_dod
description: "note記事1本の完成物=article.md+カバー+hashtags.txtの3点セット。公開前は代理指標でなく実不変条件を検証(画像参照突合・Phase2)・公開バッチのfail=0は偽成功しうる(noteId実在照合)・ライブ反映済み判定は末尾まで照合"
metadata:
  type: feedback
---

## 完成物は3点セット（DoD）
note 記事（docs/note/**/{記事dir}/）1本の完成物:
1. `article.md`（frontmatter の `cover:` ブロック必須＝カバー生成の入力）
2. カバー（2026-09-29 から `note-publish` が公開時に frontmatter `cover:` から最新デザインで生成して登録。手元確認は `node scripts/generate-note-covers.mjs "<記事dir一意部分文字列>"`。以後の差し替えは Mac の週次 note-cover-routine）
3. `hashtags.txt`（記事固有タグ先頭5-6＋ベース群、計70-90個。級整合: 2級=`#主任技術者`／`#監理技術者`は1級用で除外）

- **Why:** 2026-06-03 の2級土木集客クラスター第1バッチで完了条件を article.md 本文だけに置き、カバー・タグの生成を漏らした（frontmatter に `cover:` を書いて「カバー済」と錯覚）。仕組み化すべき類（[[feedback_prevention_over_patching]]）。
- **How to apply:** 新規作成時は着手前に3点をその記事の成果物として宣言。検証＝U+FFFD 0・全LF・note-lint OK（太字内全角括弧は **A**（B） 形式）・カバー目視（溢れ無）・有効アイコン名（pen/clock/doc/edit/calendar/chart/check/target/book/layers/bulb/flag/yen/map）。真実源は各集客クラスター SSOT の「note記事の完了定義(DoD)」節。X は別系統で1-3タグ（[[feedback_x_hashtag_count]]）。
- **機械ゲート化済み（2026-06-12）**: `.claude/scripts/check-note-3set.mjs` が「公開状態（frontmatter `noteUrl` 非空 OR `noteStatus` に publish）の article.md は `img/cover.png`＋`hashtags.txt` 必須／下書きは対象外」を検査（2026-09-29 からカバーは検査しない＝手元の PNG は Git 管理外で checkout ごとに有無が違い、note 上の状態は CI の check-note-cover-live が見る）。`scripts/note-lint.mjs`（pre-commit・既定=公開状態のみ）と `/note-prepublish-review` Phase 1 4e（`--require`=無条件）の2モード。真実源 content-principles.md §14-d。発覚契機＝公開済194本中2本が hashtags.txt 欠落で公開されていた（2026-06-12）。

## 公開前は代理指標でなく実不変条件を検証
2026-06-03 の総監依存3記事整備で、図版を `ls img/ | wc -l`（ファイル個数）で「揃っている」と誤判定し、本文 `![](img/figure-X.png)` の参照名と実ファイル名のズレ・欠落（roi-curve/keishin-chain 未作成・independence 名前不一致）を見落とした（png/svg ペアを2で割れば気づけた）。さらにファクトチェック（Phase2）を「ハードゲート通過=公開可」と等値して任意扱いにし、実害（R7合格者615→584、年収700-900→600-850、回収年数の基準不統一、図↔本文のケース番号ズレ）を放置しかけた。
- ファイル個数・Lint通過は SSR/事実性/図整合を保証しない。公開前は必ず `/note-prepublish-review`: Phase1 inline（画像=参照名→`test -f` 突合・pipe表0・U+FFFD0・太字内全角括弧0・404 RISK・hashtags）＋Phase2 エージェント（note-fact-checker=数値/出典の内部DB突合、note-figure-auditor=svg-policy採点）。図の数値は本文・キーワードページ・内部DB（exam-index 等）と突合。自分が作った/直した図も自己申告せず再監査で実証。キーワード解説ページ数の公式値は `keyword-relations.json` の `published_keywords`（2026-06=650）。関連: [[feedback_exam_pdf_cross_reference]] [[feedback_verify_your_excuses]]

## 公開バッチの `fail=0` は偽成功しうる（幻 noteId・2026-06-30）
`note-publish-magazine.mjs` の `[done] fail=0` を信用しない。成功判定が `fmHasUrl`（frontmatter に noteUrl があるか）だけで、`note-publish.mjs` の writeback はページから拾った URL の id を書くだけ＝公開が未完了でも**幻 noteId**（note API で 404 not_found）＋`noteStatus:published` を書き込みうる。2026-06-30 完全攻略パック 工事82-87 の6本が fail=0 のまま未公開で、マガジン収録時に初めて発覚（[[project_civil1_flagship_pack]]）。note-lint 等は URL の存在しか見ず実在を見ない。
- **二層ゲート（2026-07-01 実装・PR#314）**: ①`note-publish-magazine.mjs` は即時公開分について書き戻した noteId が `https://note.com/api/v3/notes/{id}` で実在するか照合し確定404なら fail 停止（予約投稿は go-live 後刻ゆえ検証しない）。②バッチ完了後・完了報告前に必ず `npm run verify-note-status`（fm=published ↔ ライブ404 を WARN 列挙する reconciler）で全件確証。
- WARN/幻 id を見つけたら該当 frontmatter の noteUrl/noteId/notePublishedAt を空へリセット→`--commit` で再公開→再照合。単発の実体検証は publish-note SKILL.md「偽成功の罠」が真実源。関連: [[feedback_publish_x_false_success]]

## 「ライブ反映済み」判定は冒頭だけでなく末尾・画像数・見出しまで
note の要再公開を「ライブに反映済み」として再公開台帳へ記録するとき、新文言がライブにあるかだけでなく**末尾ブロック・画像数・見出し構成**まで照合する。2026-09-23、ペルソナ選択ガイドを冒頭の新文言だけ確認して記録したら末尾の著者紹介と注意書きが欠けたままだった（週次検査の拡張で後に発覚）。台帳が in-sync になると要再公開から消え誰も気づかない。
- 記録前に `node scripts/check-note-live-headings.mjs <パス>`（見出し・画像・太字記号）と、原稿の各段落がライブ本文に含まれるかの全段落照合。取得できない（is_limited）記事は記録しない。関連: [[reference_note_update_body_gotchas]] [[reference_note_publish_price_field]]
