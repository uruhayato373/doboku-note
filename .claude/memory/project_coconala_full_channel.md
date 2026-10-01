---
name: project_coconala_full_channel
description: ココナラ現況(2026-09-23: 出品20件・季節商品でRCCM/技術士口頭/主任技士へ拡張・PDFは note×1.1 の価格ルール)とPlaywright全自動化の要点。判断の正典は 09 §D7
metadata: 
  node_type: memory
  type: project
  originSessionId: a1c62d15-dacd-41eb-a645-76e5bdac863b
---

ココナラ（アカウント dobokunote・profile users/6197366）。

**2026-09-23 現況（最新・以下の7月記述より優先）**: 出品20件（土木二次13＋RCCM4＋技術士口頭2＋総監1）。受注は累計3件（全て1級模試系）で、市場は伸びているのに上位集中＝露出と信用が壁。方針は「人の作業の受け皿＋試験の季節で単発PDFを埋める」（判断の正典 = docs/strategy/09_販売チャネル競合分析.md §D7、決定ログ = content/note/1級・2級土木/ココナラ展開キット.md §2）。**価格ルール（ユーザー決定）**: PDF 商品は note で同じ中身を最安で買う価格 ×1.1 を ¥500/¥1,000 刻みで切り上げ（ココナラで note より安く売らない）。過去受注はカタログ priceHistory で受注日時点の定価と突合。**同じ日に新規出品を5件以上は通らなかった**（原因未確認・翌日1件ずつ）。主任技士2件（cce-essay/cce-takuitsu）は draft のまま翌日出品待ち（2026-09-23 時点）。価格入りサムネを使っているので改定時は thumb 再生成＋`--replace-image`（複数画像の商品はギャラリーを入れ直す）。

---

以下は 2026-07 立ち上げ時の記録（件数・価格は古い）。

2026-07-18 に本格展開。1級・2級土木の**9商品がライブ**（サービス2＋コンテンツPDF7）：

- **S1** 合格診断 ¥1,500（4317349）／**S2** 添削2テーマ ¥6,000（4317375）
- **C1** 1級出題分析PDF ¥2,500（4317573）／**C2** 1級完成答案集 ¥3,500（4317580）
- **S3** 経験記述 答案作成（ヒアリング→文章化）¥8,000（4317796・provisionFormat 1）
- **C3** 2級完成答案集 ¥3,000（4317722）／**C4** 1級過去問模範答案 ¥3,000（4317726）／**C5** 2級過去問模範答案 ¥3,000（4317729）／**C6** 1級学科記述 ¥2,500（4317734）／**C7** 2級学科記述 ¥2,500（4317736）
- **C8** 1級二次予想模試 ¥2,500（4317886）／**C9** 2級二次予想模試 ¥2,000（4317889）＝計12商品（S1/S2/S3＋C1-C9）

**納品オペ完備（2026-07-18・購入監査で欠落7件を是正）**: kit §4c「トークルーム定型文集」＝初回挨拶＋シート送付(S1/S2/S3)・C系PDF送付・満枠断り・書き直し受付・**S1診断返却テンプレ(A/B/C＋ワースト3・書き換え文なし)**。drafter に**診断モード(`--mode shindan`)追加**（S1・書き換え文を出さないガードで S2 との線引き）＝3モード(添削/作成/診断)。/coconala-order を4分岐(S1診断/S2添削/S3作成/C系PDF即送付)に。書き直し1回=再実行→status:revised。

**模試 C8/C9（唯一の未対抗セグメント参入）**: 競合監査で模試が最大の未対抗領域と判明（建築版¥18,000×1,730件・土木版ほぼ空白）。源=C6/C7学科記述論点＋C1分析からbuild-once生成（新規事実ゼロゲート・引用値は全て源記事にリテラル実在・過去問設問の逐語転載なし・経験記述は記入欄のみ）。build-coconala-content-pdf.mjs に `generated:true`（源=`.claude/config/coconala/assets/moshi-src/`）。**Red Line #10 例外運用**（模試=静的1回分／会員フロー=毎月更新ドリップで差別化・監視条件つき・非抵触を装わない）。**`--image` は bare 名で可**（`resolveImagePath`＝`.claude/config/coconala/assets/` へ解決・存在は fail-fast 検査。旧: cwd 相対で ENOENT→下書き作成後クラッシュ→orphan draft 事故を恒久対策）。**orphan draft 掃除**＝`npm run coconala-delete-draft -- --id <n> [--commit]`（4重ガード G0 カタログ在籍拒否/G1 URL一致/G2 タイトル空/G3「下書きを削除」導線＝公開商品には出ない・dry-run既定）。編集ページ正URL=`/mypage/services/{id}`（`/edit`は404）。2026-07-18 に orphan 3件（4317883/4317565/4317338）削除済＝公開12件のみ。
- C系は全て provision_format=3（PDF納品）。冗長回避で組合せ大全/想定工事バンク/完全攻略/暗記ノート/一次(KDPロック)は除外
- **プロフィール完成**: カバー（差別化バナー）＋アバター（サイト author-avatar.png）＋自己紹介（技術士〈建設・総監〉を持つ元自治体土木の差別化・`coconala-profile.mjs`＋account.json profile）

**Playwright 全自動化**（会社PC不可・Macローカル・`.local/playwright-coconala-profile`）: `/coconala-publish`＝`coconala-publish.mjs`(新規)/`coconala-edit.mjs`(修正・`--image`で画像アップロード・カタログ書き戻し)/`coconala-discover.mjs`(偵察)＋共有`lib/coconala-{session,form}.mjs`。SoT=カタログ`src/lib/coconala-services.ts`（価格/状態/URL）＋`.claude/config/coconala-listings.json`（本文/カテゴリ/genreFacets/provisionFormat）。運用真実源=`docs/reference/coconala-operations.md`。

**2チャンネル戦略**（競合1,073件実測・[[reference_competitors_civil]]）: note＝体系自習・会員（旗艦）／ココナラ＝急ぎ・単発の別セグメント。ココナラは第3チャネル＋会員の価格アンカー。

**フォームの罠（実機確定）**: タイトルは25字未満＋末尾「ます」は固定サフィックス自動付与（form lib が末尾ます剥がし・二重回避）／価格は¥500刻みselect（¥2,480等は不可・ガード有）／キャッチ15〜30字必須／カテゴリ3段(12/254/764)＋ジャンルfacet(256)必須／公開ボタンは新規「公開する」既存「更新する」。

**Red Line #2 再定義（2026-07-18・旧「代筆をしない」→「捏造をしない」）**: 禁止の本質は捏造（経験していない工事・事実の創作）。本人の実工事をヒアリングで文章化する答案作成（S3）は捏造でない（履歴書作成と同型）。安全＝宣誓チェック＋事実は本人回答から＋欠落は〇〇＋納品はドラフト（本人確認必須）＋合格保証しない。drafter に作成モード（`/keiken-tensaku --mode sakusei`）＝ヒアリング→答案ドラフト（ドライランで捏造ガード実証）。SSOT 7ファイル統一改訂。公開中 S1/S2文面・note記事も「代筆」→「捏造」に live 更新済み。

**C系コンテンツPDFの鉄則**: note記事を再利用する際 `strip-note-funnel.mjs` で note URL・CTA・商品誘導文を機械除去→`build-coconala-content-pdf.mjs`が`pdftotext`で **note.com/URL 0件を検証**（外部誘導禁止＝アカウント防衛）。**KDP安全**＝二次経験記述はKindle Selectロック無し・一次過去問PDFはSelect独占中で対象外。代筆はしない（Red Line #2）。

残: 2級版C3/C4は売れ行き次第で横展開（backlog・spec既存）。deploy（/links反映）はユーザー判断。関連 [[reference_note_pdf_product_publish]]・[[feedback_gemini_cost_confirm]]（商品画像はGemini API＝.env.local GEMINI_API_KEY）。
