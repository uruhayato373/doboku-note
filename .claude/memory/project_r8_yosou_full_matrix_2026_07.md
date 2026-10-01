---
name: project_r8_yosou_full_matrix_2026_07
description: "総監R8予想の全6テーマ×14ペルソナ=84セル完全マトリクス+建設BK-09/10補完(2026-07-13公開・収録完了)。R8本試験の当日復元・的中の帰属ルール・直前期funnel施策・横断単品¥780統一を含む"
metadata:
  type: project
---

試験直前期(2026-07-12, 総監筆記7/19・建設7/20)の単品ニーズ対応。R8予想を「全予想テーマ×全ペルソナ」の完全マトリクス化。

**総監**: 従来は per-persona R8予想が①気候変動・②資源循環の2テーマのみ。**③老朽化インフラ・④災害復旧・⑤AI社会・⑥経済安全保障 を全14ペルソナに新規生成し 6テーマ×14=84セル完成**。各記事=A案/B案dual・各施策600字以内・price:¥780(既存①②は¥500据置)・note meta空+draft。設問の真実源=横断「総監記述式-R8予想問題集」6テーマ記事の`## 予想問題本文`。道路担当は横断記事内の既存フル論文を単品化(新規執筆なし・単一論文型)。ゼネコン/河川コンサルの既存①②はQA是正済(600字超5件圧縮・白書年次2020)。カバー画像は全56本 generate-note-covers 生成済(Mac動作可)。

**建設部門**: 11専門分野で唯一R8予想が欠けていた **BK-09電力土木・BK-10鉄道 を各II-1/II-2/III=6本新規生成**(テンプレ=BK-11トンネル)。factcheck(エネ基本計画/耐震分類/ASR/レール摩耗/条番号を一次照合=likely-wrong 0)＋QA(forecast 6軸=6本ready)通過。

**品質ゲート**: 全数で charcount --strict(600字)/check-essay-heading-structure/note-lint/cover-fit/site-UTM＋白書WebSearch照合を通過。マトリクス整合性検査(noteMagazine一致・MD5重複)で汚染0・重複0を確認。

**重要な運用知見(並行書込み汚染)**: cem-essay-writer を高並行(8-9本)で走らせると writeMdxFile の一時パス衝突で**別ペルソナの内容が混入する事故**が発生(下水道⑤にゼネコン⑤内容が上書きされ、gate-passのままcommitされた)。対策=バッチcommit前に必ず**noteMagazine==dir persona 一致＋MD5重複なし**を検査する整合性ガードを通す(本セッションで是正済)。並行は≤6推奨。詳細は [[feedback_workflow_orchestration_gotchas]] と併読。

**2026-07-13 実施済(Mac実機・このMacで完遂)**: (1)**note全62本公開**=総監56(hashtags59本先行生成→テーマ別ウェーブyosou-3/4/5/6×14＋canary)＋建設BK-09/10の6本。全数note-publish-magazine --commitの偽成功ガード(noteId実在照合)通過＋`verify-note-status`で301本ドリフト0確認。建設カバーは未生成だったのでgenerate-note-covers(sharp・Mac安全)で6枚先行生成。(2)**マガジン収録**=全16マガジンにyosou収録(note-magazine-add --commit・API実体検証)。標準11ペルソナ11件/道路担当12件/ゼネコン・河川コンサル9件(yosou-1/2未公開のため)/BK-09,10各18件。※ツールバグ修正: note-magazine-add の magazineMeta 探索が6ページ止まりで後方マガジン(ゼネコン等)未解決→20ページに拡張(commit fed9e902b)。(3)**note-magazines.ts更新**=実収録数で正確に(標準11/道路12/ゼネコン河川9・BK-09/10を¥1,980→¥2,980/18記事)・旧「横断集約」文言削除・r8-forecastに全14ペルソナ相互導線追記・type-checkクリーン。

**残作業**: (A)**印刷用PDF=Windows専用が確定**。magazine-to-pdf.mjsはMac対応フラグ(--no-sandbox等)入りだが、ユーザーのChrome常駐下でheadless print-to-pdfが`ETIMEDOUT`ハング(実測)→[[feedback_workflow_orchestration_gotchas]]通りWindows必須。BK-09/10 specにR08-yosou 3本ずつ追記済(問題=`## 予想問題`→`## 予想の根拠`/解答=`## フル模範解答`→`## 採点者が見る`)。Windowsで`magazine-to-pdf --spec ... --in-place`→`note-attach-pdf`。総監essay本文にはPDF節なし(建設のみ)。(B)sales-tracking productId追記(未実施)。(C)deploy(develop→main)でnote-magazines.ts説明がLive反映。(D)/doc-sync=決定2026 evergreen純化docの陳腐化点検(方針反転済)。SSOT=docs/note/技術士総監/総監マガジン構成_決定2026.md・docs/note/技術士建設部門/noteコンテンツ計画.md。関連: [[project_kettei2026_r8_evergreen]](旧「per-persona R8廃止」は撤回済で本作業はその延長)

## 統合: R8 本試験の当日復元と暫定→確定（旧 r8_exam_restoration_2026_07・2026-07-19）
- 公開済み: サイト `r08-primary`（択一40問・暫定解答＋Callout 明記）／`r08-secondary`（記述I-2 地方創生・問題文全文＋4ステップ骨子）。note 無料3本＝R8解答速報 `nfa8998e22a52`／R8本試験模範解答例 `nfe8bc37ce88e`（全14立場を本文掲載＋目次＋各立場セクション内にPDF〔`note-attach-file --anchor "（○○版）"`〕）／R8設問(3)国家施策全集 `nce1ea1317eab`（図のアウトプット a〜r 全18項目に21施策）。X/IG に暫定解答速報を投稿済み。E-01（解答再現 ¥1,980）は集客最優先で無料公開に変更（2026-07-19 ユーザー決定）、有料深掘りは E-02「私はこう書いた」に集約。
- **残（重要）:** 公式正答公表後（engineer.or.jp）に暫定→確定更新＝`r08-primary` の `**正答（暫定）：X**`・冒頭 warning Callout・R8解答速報（食い違う問は解説も是正し X/IG に訂正フォロー検討）／公式PDF公開後に `r08-primary`/`r08-secondary` の frontmatter へ `source_pdf:` 追記／deploy は `/deploy`。模範解答例→解答速報の1エッジのみ意図的に見送り（14PDF付き記事の全置換でPDF再消去を避けるため）。更新は `note-update-body --note <id> --article <path> --commit`（フラグは `--article`）。

## 統合: 的中の信頼性資産化（旧 r8_hit_trust_assetization・2026-07-20）
- **的中したのは設問(3)国家施策バンク（¥2,980・6/1公開・`m91516dfc27ac`）の「地方創生・東京一極集中」回。R8予想問題集（6テーマ・¥3,480）に地方創生は無い→「予想問題集が的中」は購入者が検証できる虚偽帰属で禁止**（表現ガイド note-funnel-architecture.md・ogp-prompts.md 変更履歴）。
- 実施済み: note-magazines.ts・R8関連記事の的中注記・author.ts bio・llms.txt・SNS bio 文案・ココナラ bio、画像面は OGP/note カバーに時事非依存の資格クレジット（`ogp-templates.mjs` の `AUTHOR_CREDENTIAL_OGP/G2`）を全面再生成、新記事「白書連動分析の的中プロセス」（無料・外した側も開示）。note プロフィール（`settings/profile` の `editBiography`・140字）・ココナラ profile は実機反映済み。
- 残: X 的中投稿（draft 080・7/21以降1本・凍結歴アカのため bio 更新と同日に X 実機で手動）・IG bio 貼付（107字・手動）・main への deploy。知見: `note-append-cta` は直後ブロックのスタイルを継承（段落が続くアンカーを選ぶ）／ABORT 後は下書きに挿入が残る→`--save-only`／設問3バンク序章は live が有料記事設定でドリフト（`--keep-boundary`）／tankan topCta「本番直前の総仕上げ」は試験後に陳腐化＝R9 シフト要判断（新記事は `topCtaExcludeDirs` で回避）。

## 統合: 直前期 funnel と横断単品¥780（旧 tankan_chokuzen_funnel_2026_06）
- 診断（2026-06-21・総監の本命パック失速）: 時期/価格/動線の故障でなく、直前ヒーロー（R8予想問題集¥3,480/コアパック¥5,480）を前面化していないことと完全パックを直前に値上げしたこと。直前総仕上げロードマップ `n97e01a94e650`・総監もくじ `n3ed4c77ceed6` 冒頭・上位リード磁石に R8予想カードを live 反映済み。ファネル監査 `audit-note-funnel --live` の D5（tankan・civil・pe-construction）は全て0達成。
- ライブ記事のリスト中間へのリンク追加は `li.insertAdjacentHTML('afterend', …)`＋`InputEvent('input')` が安定（execCommand の ul 全体置換は h3 巻き込み崩れ）→専用ツール `npm run note-append-list-links -- --spec <json> [--commit]`。`wire-note-funnel-cta` は先頭 BOM で `^---` 非マッチ→NO-FM スキップするため BOM 除去。`note-append-cta` は連続起動でブラウザ競合・ハング→1本ずつ・各実行で API 実査。新規公開は `note-publish.mjs --article`（frontmatter に noteUrl 空欄を用意しないと公開後の自動反映が効かない）。
- **横断単品¥780統一**（2026-06-21）: 総監の単品129本のうち売れるのは横断系（R8予想/設問3/計算/トレードオフ）だけでペルソナ98本は同ペルソナ¥2,480マガジンが上位互換で全期間単品ゼロ→横断23本を live ¥780化（R8予想¥700→/設問3¥300→/トレードオフ¥500→/計算¥300→）、ペルソナは不変。**序章2本（設問3序章 `n3eb135ebdff7`・トレードオフ無料リード `ndb524ed63c92`）は¥100で保護＝マガジン sweep が掴むので `--exclude` 必須。**ツール `note-article-price-sweep.mjs --magazines <m> --exclude <序章key> --price 780 --commit`（マガジン非所属は `--notes <key>`）。罠: 価格セッターの全選択は Mac で `Meta+A`（`Control+A` は78000化バグ）。価格 SSOT は article.md frontmatter `price:`＋note-magazines.ts＋noteコンテンツ計画.md。
