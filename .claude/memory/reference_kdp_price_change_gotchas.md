---
name: reference_kdp_price_change_gotchas
description: "KDP の罠。価格改定(70%帯¥1,650・日本35%・AI申告必須・偽成功)・.svg拡張子のJPEGで処理失敗・kdp-publish 自動化の仕様"
metadata:
  type: reference
---
2026-09-23 の Kindle 価格改定（3段階）で実測した KDP の罠。

- **70% 帯は ¥250〜¥1,650**（KDP 価格ページの告知。旧 ¥1,250）。¥1,250 の本は 70% のまま ¥1,650 まで上げられる（未判断）。
- **日本の 70% は KDP セレクト登録が条件**。外れるとプランのラジオは 70% のまま Amazon.co.jp 行だけ 35%。d-00/d-03 は note 併売のため早期解除を申請しており、9/23 時点で日本 35%。`catalog.royalty` は日本の実効レートとして扱う。
- **AI 生成コンテンツ申告が必須化**（`require_generative_ai_questionnaire_affirmation=true`）。2026-07 提出の既刊は未回答のまま残り、価格改定の出版が「この項目は必須です」で弾かれる。`--set-price --commit` が自動で埋める。d-00 は埋めた後もエラーが残り、該当欄は未特定。
- 旧 `--set-price` は本文の「保存」で成功判定し、「下書きとして保存」ボタンに一致して**失敗を成功と誤報**した（PR #581 で「価格ページを離れた＋エラー表示なし」に修正）。直前の報告は本棚の表示価格で裏取りする。
- 本棚は先頭10冊しか DOM に無い。内部ID（title-setup）は ASIN で本棚検索した行のリンクから取る（`--sync-status` が catalog.draftAsin を補完）。
- ブラウザ操作は空きメモリ 2GB 未満でガードが止める。本棚1枚程度なら `DOBOKU_PW_MIN_FREE_MB=1200`。

関連: [[feedback_kindle_dup_prevention]] [[project_kindle_publishing_launch]]

---

## 「ファイルの処理中に問題」の真因=.svg拡張子のJPEG／KDP出版自動化

**2026-07-20 b-heisei が KDP で2日間「ファイルの処理中に問題が見つかりました」で出版不能→真因特定・恒久修正**。真因＝`scripts/build-pe1-kindle.mjs` の画像取込で、拡張子正規化regexが `.svg` を含まず（`/\.(webp|png|jpg|jpeg)$/i`）、**ソースがサイトの figure-*.svg のとき sharp で JPEG 化しつつファイル名を .svg のまま同梱**していた（中身JPEG・名前.svg が15個）。KDP変換は拡張子.svgを見てSVG(XML)解析を試み中身がJPEGで失敗。**epubcheck は OPF media-type=image/jpeg と実体JPEGが一致するため素通り**（epubcheck 0/0 でも KDP は落ちる典型）。修正＝regexに `svg` 追加（`/\.(svg|webp|png|jpg|jpeg)$/i`）→再ビルドで.svg 0件→KDP処理完了・原稿チェック通過を実機確認。

**切り分け手法（有効）**: 通る本(d-01 LIVE)のEPUBと通らない本(b-heisei)を新規テストドラフトにアップロードして比較→d-01完了/b-heisei失敗で「本固有のEPUB問題」と確定→内部 `unzip` で `find -iname '*.svg'` の件数差(15 vs 0)から容疑者特定→`file` コマンドで実体がJPEGと判明。**KDPアップロード検証は「正常にアップロード」表示で早合点せず、"ファイルの処理が完了しました。原稿チェックが完了しました" まで待つ**（処理は数十秒かかり、途中でエラーに変わる）。

**影響範囲**: b-heisei のみ（平成総監 h2x-primary 記事が site .svg 図を参照）。他 B/C/D/F/E 本は .svg 参照なしでクリーン（dist 各epubを `unzip -l | grep -c .svg` で確認済）。今後 site の figure-*.svg を参照する記事を Kindle 化する本は同修正済ビルダーで安全。関連 [[project_kindle_publishing_launch]]。

**KDP出版の自動化（2026-07-20 システム化・PR #416 base=develop）**: `/kdp-publish` スキル＋`kdp-operator` エージェント（Orchestrator）＋`scripts/kdp-publish.mjs`（Playwright・永続プロファイル `.local/playwright-kdp-profile`・channel:chrome）。SSOT=`.claude/config/kdp-memo.json` の `defaults`（共通申告/カテゴリー経路/account）＋読取り一元化 `scripts/lib/kdp-common.mjs`（gen-kdp-memo と共用＝二重定義解消）。フラグ: `--id <id>`（新規提出・下書きまで）／`--commit-publish`（出版）／`--sync-status`／`--list-drafts`／`--delete-drafts <ASIN>`（下書きassert）／`--dump --page`／`--diag-category`。**draftAsin を catalog に永続化して重複作成防止**。**原稿判定は「ファイルの処理が完了しました/原稿チェックが完了しました」文言まで待つ**（表紙の「正常にアップロード」で早合点しない）。カテゴリー末端は**「場所」パネルのチェックボックス**（技術士系: Kindle本>資格・検定・就職>工学・技術・環境>☑技術士／A・E系: >建築・土木>☑〔未検証・要 --diag-category〕）。**AI設問で画像=AI生成を選ぶとツール名必須（defaults.aiDeclaration.imageTool）**。CAPTCHA/ログイン/最終「出版」承認は人。未実装=既刊差し替え `--update-manuscript`（手順予約のみ）。`defaults.accountEmail`=null（assert スキップ・検出値をログ）。
