---
name: project_book_to_guide_expansion
description: "市販書籍OCR(commercial-book)を公開ガイドへ展開する手順と罠(2026-09-10〜12・建設部門書き方5本・主任技士・土木)。書籍OCR27冊の登録状況(経路D)と再スキャン要ページ"
metadata:
  type: project
---

2026-09-10、『技術士論文の書き方』（`pe-essay-writing-guide`）を建設部門の書き方ガイド群へ展開した。
hub `pe-secondary-essay-guide` はそのまま、薄い節を新規スポーク 5 本（setsumon-bunkai／aimai-hyougen-sahou／
suikou-checklist／shiken-toujitsu-tejun／keyword-note-tsukurikata）へ深め、`gyoumu-keireki-hyou` に 4 段階棚卸しの
H2 を追加。サイトで commercial-book id を `sources` に宣言した最初の記事群（commit 0f7fc2526〜3564a28eb）。

**手順（再利用できる型）**: 親が transcript を読んで方法を理解 → 執筆エージェント（guide-rewriter・新規起草モード）には
transcript を渡さず、親の言葉で 30 字以内の語句だけの brief を渡す → H2 は原本の章順でなく受験者の時間軸で組み、
ラベル名・項目数を原本と揃えない → 例題はサイトの過去問記事から → guide-qa → guide-fact-checker（制度数値）→
`check-reference-sources:deep`（40 字逐語 0 件）→ 1 記事 1 コミット。5 本で Sonnet/Opus 合計約 1.4M トークン。

**Why:** 商用書籍は逐語 1 文・図・章立ての流用も不可（reference-sources-policy.md）。writer に原文を見せなければ
構造的に漏れない。
**How to apply:** 同じ本から総監へは展開しない（有料 note『記述式の書き方』と衝突・Red Line #3）。原本にある
「三分割展開法」は JES の登録商標なので語ごと使わない。原本の制度数値（H31 時点）は使わず一次資料へ。
QA の「である調混在」は評価者により厳しさが違うので、ですます基調＋体言止めで通す。

2026-09-11 に標準化 → `.claude/knowledge/reference/content-taxonomy.md` §7（原本 class × 展開先の表と標準手順）。backlog カードはそこを指す。

**textbook 深掘りの分業（2026-09-12・主任技士 前半 4 章で実測）**: Reader（sonnet・原本 OCR 1 章＋既存記事→語句だけの gap brief・約 150〜210k）→ 親（brief を取捨し自分の言葉で writer brief。数値は「使ってよい規格値」を列挙し、それ以外は「（要確認）」を付けさせる）→ Writer（sonnet・原本は渡さない・260〜340k）→ Evaluator＋fact-check を 1 体に統合（sonnet・WebSearch・190〜220k）→ 親が Edit＋deep 照合＋baseline 返済＋commit。1 章あたり Sonnet 約 0.7M・Opus 約 40k。**Writer に commit させない**（1 体が勝手に commit し、deep の逐語 1 件〔JIS の呼び方の語順〕と単位換算ミス〔0.2 %＝200×10⁻⁶〕を含んだまま HEAD に載った→amend で是正）。QA で毎回出る指摘＝設問の数値の写し・市販書名の参考資料・段落 200 字超・出所の無い管理値。
2026-09-12 後半 4 章（製品・構造設計・製造 QC・施工）も同じ分業で完了＝主任技士テキスト 8 章すべて sources 宣言済み（DN-0187/0188 完了）。追加の罠: **`wc -m` はこの環境では bytes を返す**（字数は Python len で測る。前半の「現状 11k 字」等は 3 倍過大だった）／親の brief に書いた規格値が誤っていることがある（混和材の計量許容差 ±3 % → 正 ±2 %。QA が一次資料で捕まえた）／JIS の規格名称をそのまま参考資料に書くと原本と 40 字以上一致する（表記を短縮）／指示に「git 禁止」を書いても、指示書ファイルを Read させる方式なら守られた。

**2026-09-12 土木へ横展開（DN-0196〜0203）**: 専門土木 8 章（新規・主根拠はサイトの過去問記事）、法規 3・安全 3（市販書の「場面→条文→判断」法）、技士 6 章、実務 4 本、2 級ガイドの 1 級横断リンク、概念図 16＋15 枚。学び: (1) 過去問記事の解説自体に転記ミスが混ざっている（水抜き孔の向き・大型機械 2 m・泥水圧の目的・推進ジャッキの部位・RCD 降雨・バケット高さ）ので、Writer が過去問解説を「正」として写すと誤りが伝染する → QA の「過去問との整合」軸で捕まえ、過去問側も同時に直す。(2) 法規は 2024〜2025 年改正（営業所技術者・金額基準・専任特例・拘禁刑・施行令の条番号ずれ）が多く、書籍も過去問も古い → e-Gov API（`laws.e-gov.go.jp/api/1/lawdata/<法令番号>`）で親が直接照合するのが速い。(3) 技士テキストは ですます調、1 級 textbook は である調、実務は ですます調 — Writer 指示に文体を明記しないと混在する。(4) QA の WebSearch 予算はセッション共有で枯渇する（6 体並列で 200 回上限）→ 一次資料の URL は親が先に確認して渡す。

## 統合: 書籍 OCR 登録（旧 book_ocr_route_d・2026-09-09〜10）
- 参考文献27冊 6,958/7,053ページを経路D（Sonnet 第1読＋Tesseract 突合＋対象ページ第2読）と旧経路の割当（`book_ocr_align_legacy.py`）で登録済み。Drive vault `原資料PDF/書籍/<id>/ocr/part-NN.md`＋台帳、完了は book-manifest の `ocrStatus=complete`。手順 runbook `.claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/README`（1冊=1 Workflow・並行2本・利用制限で止まったら `resumeFromRunId`・途中成果物 `.tmp/ocr/<本>/` はローカルのみ）。
- **再スキャンが要る:** pe-cem-essay-guide（16版面中9で指の隠れ・既存文字起こしに推測埋め）、civil1-primary-workbook-2021（上端欠け・二重写り約60p・〔判読不能〕204箇所は埋めず）、concrete-chief-textbook-2024 p0059（露出失敗）。品質の薄い箇所: 総監標準テキスト115pは内挿、construction-claude-code-guide p0002〜0011 は同一表紙画像（原本欠陥）、マンガ本は Tesseract 突合が12pのみ。未着手で保留: 人事/働き方改革/IT/経営学/行政書士の39 PDF（サイトの守備範囲外）。

**2026-10-08 コンクリート5冊の網羅→展開で分かったこと**: (1) 網羅の候補表は `npm run audit-reference-book-coverage`（PR #927）→ 本ごとに Evaluator が意味判定 → 記事ごとの brief。**Evaluator が本の言葉で書いた brief の見出し・項目順を Writer がそのまま使うと、本の章の構成（取り上げる種類・順・「利点と問題点」の切り口・理由づけの順）が再現される**（主任技士の配合設計で QA が 高 で差し戻し）。Writer には「brief の見出しは仮・言葉も順も組み直す」と明記する。(2) 親が `cd` で worktree に入っている間に起動・動作したサブエージェントは相対パスを worktree 側へ書く（診断士の調査記事の追記が PR 用 worktree に入った）。worktree へは cd せず `git -C` を使い、サブエージェントには絶対パスを渡す。(3) 文字起こしの第1読はサブエージェントが著作権を理由に辞退することがある（2体続けて辞退した15ページは親が直接転記した。運営者の指示「残りもやって」の下）。

**2026-10-09 残り 21 冊を workflow で一括判定・展開して分かったこと**: 判定 21 冊（31 体）→ 展開 約 170 記事（新規約 35・1 記事＝執筆→QA→修正→コミット）→ 写真 52 枚（生成→fidelity 監査→記録→コミット）。(1) 同時 3 体の順番待ちは**後の段を先に回す**（先着順だと全記事の執筆が並び、コミットが半日出ない）。(2) コミットは記事ごとに `.tmp/book-coverage/commit-article.sh`（mkdir の排他・trailer `Book-Coverage: <書籍 id>`・**静的インデックスは一時の作業ツリーで作り直す**＝メインで回すと書きかけが入り CI の generated-indexes が落ちる・図の 10KB 上限も先に検査）。(3) 新規記事の案は本ごとに出るので、**展開の前に記事ごとに束ね、同じ主題の新規案を 1 本にまとめる**（経審 3 本が重複していた）。1 記事に 40 件集まったら主題で分ける（振り分けると棚の割り当てが変わり、対象から漏れる記事が出る＝`--status` の未展開で拾った）。(4) QA が「元の表記へ戻せ」と言い textlint（prh）が止める衝突が 3 回 → prh を正と手順書に明記。(5) 週の利用上限でサブエージェントが一斉に止まったら、書きかけを WIP ブランチへ退避して push し、メインツリーを戻す（develop に QA 前の原稿を入れない）。上限は同日中に解けたこともある。(6) 記事の `sources` に書籍 id を足すと、展開前からあった長い逐語一致（最大 552 字）が検査に見えるようになる（DN-0580）。公式の設問文・法令名の一致は書籍の写しではない（DN-0617）。(7) 写真は図と同じ被写体なら入れない（7 枚を見送った）。作り直しで器械の種類が変わったら alt も直す。 (8) 残作業を挙げる前に、同じ資格のほかの本の判定結果（gap の数・partial の展開状況）で、その本を展開する価値があるかを確かめる（2026-10-10、総監は 3 冊で gap 0 なのに、再スキャンが要る論文の本を残りに挙げ、運営者の指摘で見送った）。

**2026-10-10〜11 コンクリート 5 冊の判定し直し→展開で全 27 冊の展開が完了（範囲内 26 冊＝展開済み 24・展開不要 2。pe-cem-essay-guide は見送り）**: (1) `--status` は判定し直す前の展開コミットまで数えていた → 判定日を付けたときの HEAD を `judgedHead` に残してそれより後だけ数える（DN-0659）。完了は `--status` で確かめる。(2) worktree で回すと、別セッションが共有の pre-commit フックを更新した時点で「ツリーの版が古い」とコミットが止まり、Workflow のコミット担当は git を触れないので 6 本が未コミットのまま終わる → 止まったら親が `git -C <wt> merge origin/develop` してから `book-coverage-commit.mjs` を手で回す。push の非 fast-forward も同じく次の回で拾える。(3) 判定の書籍が古い試験形式（診断士の問題A は 2018 年度で廃止・2019 年度から構造物の診断の 1 題・3 時間）を持っていてもサイトのほうが古かった。brief に親の注記で現行形式を書いてから Writer を回す。サイトから案内を外したマガジンは `magazine-cta-baseline.json` に理由付きで登録しないと CI（magazine-cta-reachability）が止まる。
