---
name: project_civil_niji_gakka_line
description: 1級2級土木「二次学科記述ライン」note有料5SKU=全13記事を公開・配線完了（2026-07-04）
metadata: 
  node_type: memory
  type: project
  originSessionId: 007dd616-fdf1-4d4b-ba54-ea6e058032e8
---

1級・2級土木 第2次検定 学科記述（問題2〜11）の買い切りラインを 2026-07-04 に note 公開・配線完了。全13記事＋5SKU が live。main/develop 両方へ push 済み（sync・deploy 済み）。

**公開物**（すべて published:true・SKU=src/lib/note-magazines.ts）:
- `civil-1-gakka-kijutsu` ¥2,480 セット = 有料マガジン `mcfe1059b3335`（5記事 各¥580）
- `civil-2-gakka-kijutsu` ¥1,980 セット = 有料マガジン `m9a09a8982734`（5記事 各¥480）
- `civil-1-anki-note` ¥980 / `civil-2-anki-note` ¥580 = 単一記事（¥980=**na84b001e827e** / ¥580=**n793523a059e5**・2026-07-04 に理想構成で作り直し。旧 nb91888d4dbd0/n365390b15ab7 は削除済）。構成=導入→目次(使い方直前)→使い方+付属PDF見本画像(キャプション付・土工=無料のみ)→土工(無料)→有料→末尾にA5赤シートPDF本体
- `civil-1-niji-marugoto-pack` ¥11,800 = 有料マガジン `md29a34906314`（経験記述101＋学科5＋暗記1＋無料索引1＝108記事バンドル。索引 n824a4ea20acf は無料=landingUrl）。バンドル機構は [[reference_note_paid_magazine_bundle]]

**有料境界**: 学科記述=`出る順①`直前（1級施工計画・環境のみ`施工計画・出る順①`）。無料=導入＋出題マトリクス＋出る順ランキング。暗記=`(2.)コンクリート工`直前（無料=使い方＋第1分野）。frontmatter `paidBoundary`。

**この作業で入れた道具**: `scripts/generate-anki-pdf.mjs`（package.json `generate-anki-pdf`・Playwright page.pdf でMac動作 [[feedback_workflow_concurrency_and_mac_pdf]]・`--sample`で無料第1分野のみの見本PNG=有料答え流出なし）／`note-attach-file.mjs` に `--boundary-regex`（後方互換）／`note-publish.mjs` account gate 堅牢化。

**noteエディタ自動化の重要な罠（2026-07-04）**:
- **`Control+End` は Windows専用**。`note-attach-file.mjs` が本文末尾移動にこれを使い Mac で無効→PDFが本文冒頭(無料ゾーン)に入り有料PDF無料流出。JSで contenteditable 末尾へ caret 移動に修正済（コミット済）。
- **noteのリッチエディタは既存ブロックの削除/移動に強く抵抗**（custom attr を剥がす・画像ブロックの scripted 削除が効かない）。構成変更は「旧note破棄→新規公開で理想順に組む」が確実。**挿入(見出し直前/末尾)は堅牢**（native h2 に range→Enter→ArrowUp→座標で+menu）。
- **公開記事はエディタから削除できない**（エディタ右上・・・は「変更履歴」のみ）。**記事管理ダッシュボード note.com/notes のカード・・・→削除→削除する** で消す。マガジン収録も自動で外れる。
- 見本画像は `generate-anki-pdf --sample`（無料第1分野のみ・PNG）。PDF添付/境界は `note-attach-file --boundary-regex`。カバーは `generate-magazine-covers`/`generate-magazine-sidebar-banners` に civil-1/2-gakka・anki・marugoto エントリ追加（1級青#155293/2級緑#1C5038/pack紺#123a63+金#f0c040）。
- **目次(table-of-contents)は本文先頭に置くと導入段落を分断する**。note-update-body Phase4.5 / note-publish Phase6.5 は「最初の h2 直前」へ挿入するよう是正済（native h2 に range→Enter→ArrowUp→caret に最も近い +menu を座標クリック→#toc-setting）。API 実査の不変条件＝`pos(intro) < pos(<table-of-contents) < pos(first <h2)`。
- **有料境界の「ラインをこの場所に変更」(`[data-np-target="1"]`)は note 再描画で detach**し、Playwright の `page.click`（stability 待ち）が "not stable / detached" で 30s タイムアウトする（2級 コンクリート工/品質管理で再現）。`page.evaluate(()=>el.click())` の **DOM native click** で stability 待ちを回避（React ハンドラは native click で発火）。note-update-body/note-publish 両方に適用済。

**2026-07-05 冒頭マガジンカード回遊を全学科ラインへ配線（総監の冒頭カード方式を横展開）**: 監査 `audit-note-funnel` は magazines/ 配下（有料単品）をスコープ外にするため、学科ライン13本は本文マガジンリンクがゼロだった（paywall の native「マガジンで買う」は購入直前まで不可視）。対応:
- **学科13本ソース＋live に冒頭 cta:pack-top カード配線**（1級学科5+暗記→`mcfe1059b3335`／2級学科5+暗記→`m9a09a8982734`）。**2級暗記 n793523a059e5 は `magazines_for_buy` すら空の孤島だった**のを解消。note-append-cta --before-first-h2 --keep-boundary で12本 live 反映・API 実査 VERIFIED（commit c0462cdf4）。3点セット欠落(hashtags.txt×3)補完＋太字内全角括弧を **A**（B）へ是正も同時。
- **2級無料10本の冒頭カードが1級パック(m8290970a7f05)を指すセグメント違反**を是正。config `exams.civil.topCtaOverrides`（dirPrefix `2級土木/`→2級バンク `m8554e87ca6ec`）新設、wire/audit を override 対応（commit cbdc4eae0）。**noteのOGPカードは自動削除不可**（[[note-ogp-card-no-delete]]・4方法失敗）ため swap 不可→ユーザー承認で**2級バンクカードを上に追加**（append）＝2級読者が正しい商品に到達。10本 live VERIFIED。旧1級カードは残存（republish で自動消滅）。audit --live D1-D5=0。
- **まるごとパックLP n824a4ea20acf 全体公開化は保留**: 記事タイプ radio は「無料」表示だが API `is_limited:true`・primary ボタンが「試し読みエリアを設定」（有料概念）＝状態が曖昧で自動 toggle 危険。カードは draft に auto-save 済（未 published）。**手動 UI で全体公開推奨**。

**残**: (1) 2級には まるごとパック無し（設計上1級のみ） (2) deploy でサイトCTA発火 (3) 2級無料10本の旧1級カード手動削除 or republish（任意） (4) まるごとLP手動で全体公開＋draftのカードを publish。3コミット未push。初回テストの孤児下書き nef46a4046273 は削除済み。関連: [[project_civil_membership_design]] [[reference_note_paid_magazine_bundle]] [[note-ogp-card-no-delete]]
