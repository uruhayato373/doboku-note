---
name: reference_wayback_past_exam_gotchas
description: "掲載終了した公式過去問をWayback保存版から取る手順と罠（CDX一覧・id_・brotli・JCTCの数字字形・正答ページHTML→PDF・CIC掲載の実地PDF・分野別過去問ページは要照合）"
metadata:
  type: reference
---

2026-10-09 に JCTC の掲載終了分 73 本（1級・2級土木、管工事）を保存版から取得して在庫台帳と Drive に載せた（commit a540730ef）。`/past-exam-archive` は会社PC前提で、この経路は書いていない。

- **一覧**: `https://web.archive.org/cdx/search/cdx?url=jctc.jp/kentei/&matchType=prefix&collapse=urlkey&fl=original,timestamp,statuscode,mimetype` で残っている全ファイルが出る。JCTC は `/kentei/{MMDD or YYMMDD}{d=土木|k=管工事|z=造園|e=電通|t=建機}[1|2]_{乱数}/`（qa/qb=1級学科A/B、1月・10月の qa=1級実地、doboku01/02=2級学科/実地、kan01/02=管1級A/B、kan2_g/z=管2級）、令和5年以降は `/wjctcp/wp-content/uploads/YYYY/MM/{日付}{種目}_{mondai[ab]|seitou}.pdf`。statuscode が `-`（revisit）や 301 の行は取れないことが多い
- **取得**: `https://web.archive.org/web/{timestamp}id_/{元URL}`。連続で叩くと接続拒否になるので 5 秒間隔。令和の PDF は `content-encoding: br` で返ることがあり、curl は解けない → 生で落として `brotli -d`
- **年度の判定**: ディレクトリ名でなく表紙で決める。JCTC の PDF は数字がグジャラート文字の位置に出る（U+0A83=1 … U+0A8B=9。「令和ઉ年度」=令和7年度）。同じ年度が 7 月と 8 月に二重掲載されていることがある（sha256 で重複を落とす）
- **正答**: 平成の公式正答は PDF でなく合格発表ページの `answer.html`（Shift_JIS、後年は UTF-8）。`gakujitu.html` は合格者番号で正答ではない。vault は .pdf だけなので Playwright の `page.pdf()` で印刷して原本にし、note に「正答ページ HTML を PDF に印刷」と書いた
- **Drive**: この Mac は Google Drive がマウント済みなので `node scripts/drive-vault-sync.mjs --group past-exam-source-pdf --commit` → `--verify --cloud` で済む（ブラウザ経由の drive-browser-transfer は不要）。check-past-exam-inventory の FAIL 2112 件（pe-* の手元にも台帳にも無い）は別件で、2026-10-09 時点で既にあった

- **CIC（総合資格の講座会社）の掲載**: 保存版に無い年度でも、1級土木の実地（第二次）の公式の問題 PDF は `https://www.cic-ct.co.jp/pdf/kakomon/civil/h29/29_1cj.pdf`（年度は h28/28_・h30/30_・r2/r2_ の形）、学科の**正答の表**は `…/h29/29_1cga.pdf` で取れる（2026-10-10）。学科の問題 PDF（問題A・B）は CIC にも無い（H26 問題A・H29 問題B は保存版にも無く、原本未確認のまま DN-0634）。最後の手段として第三者の転記（ads3d.com）で原問を確かめたときは、記事とコミットにその旨を書く
- **分野別の過去問ページは信じない**: 1級土木 第二次の `secondary-*-past-problems` は、別の年度の問題・その年度に存在しない問題・入れ替わった選択肢が混ざっていた（2026-10-10・DN-0633）。設問を引用・根拠にする前に、年度ごとのページ（`secondary-rXX`）か公式 PDF で確かめる

関連: [[project_ios_app_spec_v1_1]]・[[feedback_exam_pdf_cross_reference]]
