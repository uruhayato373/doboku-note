---
taskId: DN-0535
type: implementation-plan
createdAt: 2026-10-05
deleteOnComplete: true
---

# 主任技士 小論文の新マガジン17誌に POP カバーを付ける（Codex で画像生成）

## 目的

DN-0523 で公開した主任技士 小論文のマガジン17誌（全40答案・立場別5テーマ8誌・立場別合格パック8誌）のカバーは、従来の自動生成器（`generate-magazine-covers`・V5）で作ったもので、POP 意匠（`.claude/knowledge/reference/pop-image-policy.md`・`pop-20260927`）になっていない。画像生成は Codex が担当する。下のプロンプトで1誌1枚を作り、note のマガジンカバーへ反映する。

10/3 に作った全40答案のカバー案（`…-小論文テーマ別-令和形式/cover-pop-review-20261003/`）は、削除したテーマ別5本を前提にした「PDFダウンロード」帯を持つので使わない（中身の PDF は note に添付していない）。

## 共通の入力

- 意匠の参照: `content/coconala/assets/pop-20260927/thumb-cce-essay-pdf.png`（sha256 `c9a407d15ff965033ae02e910a38c32c10493ae0904ec76396d01360c6728959`・Drive vault の `coconala-asset`。無ければ `/asset-route` で復元）。人物は `content/sns/_assets/character/explaining.png` の先生と同一にする。
- 主色: 主任技士の紫 `#6E3A8C`（濃い紫 `#522A69`、信頼の紺 `#16365C`）。
- 出力: 1280×670 PNG。note はマガジンのカバーを中央の横長帯（約 1600×568 相当）に切って表示するので、文字と顔は上下 10% を空けた中央帯に収める。
- 保存: 各誌の dir に `cover-pop-20261005/pop-image.json`（policy・designVersion・copy・references と SHA・prompt 全文・output の SHA・review）を置き、完成 PNG は dir 直下の `_cover.png` を差し替える（`_cover.png` は Drive vault の `note-magazine-cover-png`）。
- 反映: `node scripts/note-magazine-cover.mjs --key <note key> --dir <dir> --commit`。

## プロンプト（{…} を下表の値で置き換える）

```text
Use case: ads-marketing. Create one finished Japanese note.com paid magazine header cover, horizontally wide 1280×670 px (approximately 1.91:1). The provided approved Coconala POP cover is a style and character reference, not an edit target; ignore its old text and PDF counts. Recompose for the wide note format. Preserve the same mature Japanese male civil-engineer teacher: short black hair, rectangular black glasses, light beard, white blank safety helmet, navy workwear and tie, yellow safety vest. Use energetic, professional Japanese bookstore POP styling: extremely bold legible Japanese typography, white and yellow with restrained red, dark colored header, pale illustrated background with subtle concrete-structure motifs (bridge piers, formwork, test cylinders), strong diagonal accents and crisp outlines. Text occupies left 70%, teacher large on right 28%, presenting toward the text. Keep every letter and the face inside the central band y=70..600 and x=45..1235, because note crops magazine headers to a wider strip. This is a print-ready flat graphic, not a photographed poster or 3D mockup. No logo, brand name, URL, price, exam date, guarantee, medals, PDF wording, or additional words. Render all specified Japanese strings exactly once.
Primary color: deep vivid purple #6E3A8C. Exact text and hierarchy:
Top qualification, large: 「コンクリート主任技士」
Smaller stage label: 「{②}」
Enormous central headline: 「{③}」
Bold evidence line: 「{④}」
Prominent yellow band, wide lower left: 「{⑤}」
Small separate author badge near the teacher: 「技術士（総監）が制作」
Keep the word 主任技士 intact (never shorten to 技士). Never write 施工管理技士.
```

②は全40答案と立場別が「令和形式・小論文対策」、合格パックが「択一＋小論文 合格パック」。

| id | note key | 置き場（_cover.png の dir） | ③見出し | ④根拠 | ⑤帯 |
|---|---|---|---|---|---|
| `cce-essay-reiwa-pack` | m97a0049a10de | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-小論文テーマ別-令和形式` | 全40答案 | 5テーマ×8立場 | 隣の立場と読み比べる |
| `cce-reiwa-namacon-pack` | m02a55d302f25 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-令和形式-01-生コン工場` | 生コン工場の答案 | 令和形式 5テーマ | 自分の立場で1,000字を書く |
| `cce-reiwa-precast-pack` | m7937821e86a7 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-令和形式-02-プレキャスト工場` | プレキャスト工場の答案 | 令和形式 5テーマ | 自分の立場で1,000字を書く |
| `cce-reiwa-civil-contractor-pack` | m1b555fe40131 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-令和形式-03-ゼネコン土木施工` | ゼネコン土木施工の答案 | 令和形式 5テーマ | 自分の立場で1,000字を書く |
| `cce-reiwa-maintenance-pack` | m155421580ea3 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-令和形式-04-維持管理補修` | 維持管理・補修の答案 | 令和形式 5テーマ | 自分の立場で1,000字を書く |
| `cce-reiwa-owner-pack` | ma1d6fcf577bc | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-令和形式-05-発注者監督員` | 発注者・監督員の答案 | 令和形式 5テーマ | 自分の立場で1,000字を書く |
| `cce-reiwa-building-contractor-pack` | m0595b4b179e0 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-令和形式-06-ゼネコン建築施工` | ゼネコン建築施工の答案 | 令和形式 5テーマ | 自分の立場で1,000字を書く |
| `cce-reiwa-design-consultant-pack` | m0dff629807db | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-令和形式-07-設計コンサル` | 設計コンサルタントの答案 | 令和形式 5テーマ | 自分の立場で1,000字を書く |
| `cce-reiwa-testing-pack` | m43992b2f5503 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-令和形式-08-試験検査機関` | 試験・検査機関の答案 | 令和形式 5テーマ | 自分の立場で1,000字を書く |
| `cce-goukaku-namacon-pack` | mcb9747146a71 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-合格パック-01-生コン工場` | 生コン工場 | 択一直前3点＋小論文5テーマ | 択一も小論文も自分の立場で |
| `cce-goukaku-precast-pack` | m3daa98f03bef | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-合格パック-02-プレキャスト工場` | プレキャスト工場 | 択一直前3点＋小論文5テーマ | 択一も小論文も自分の立場で |
| `cce-goukaku-civil-contractor-pack` | ma8f11487f4cc | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-合格パック-03-ゼネコン土木施工` | ゼネコン土木施工 | 択一直前3点＋小論文5テーマ | 択一も小論文も自分の立場で |
| `cce-goukaku-maintenance-pack` | mc91d56e58449 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-合格パック-04-維持管理補修` | 維持管理・補修 | 択一直前3点＋小論文5テーマ | 択一も小論文も自分の立場で |
| `cce-goukaku-owner-pack` | mb6f1286cfb21 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-合格パック-05-発注者監督員` | 発注者・監督員 | 択一直前3点＋小論文5テーマ | 択一も小論文も自分の立場で |
| `cce-goukaku-building-contractor-pack` | m8cc3e86d9862 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-合格パック-06-ゼネコン建築施工` | ゼネコン建築施工 | 択一直前3点＋小論文5テーマ | 択一も小論文も自分の立場で |
| `cce-goukaku-design-consultant-pack` | m4452b47516ca | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-合格パック-07-設計コンサル` | 設計コンサルタント | 択一直前3点＋小論文5テーマ | 択一も小論文も自分の立場で |
| `cce-goukaku-testing-pack` | m9f64a8b08855 | `content/note/コンクリート主任技士/magazines/コンクリート主任技士-合格パック-08-試験検査機関` | 試験・検査機関 | 択一直前3点＋小論文5テーマ | 択一も小論文も自分の立場で |

## 検証（完了条件）

- 原寸と幅360pxで、資格名・見出し・根拠・帯が切れずに読めること（pop-image.json の review に記録）。誤字があれば作り直す。
- note の公開 API で17誌とも既定画像でないカバーが付いていること（`scripts/lib/note-api.mjs` の `fetchCreatorMagazines` の `cover`）。
- `config/note-covers.json` の `characterCovers.additionalMagazines` の17誌は、V5 の自動生成器が `_cover.png` を上書きしないよう POP 化に合わせて扱いを決める（退役させるか、生成対象から外す理由を書く）。

## 起動プロンプト（Codex）

DN-0535 の plan（`.claude/plans/DN-0535-cce-pop-magazine-covers.md`）に従い、主任技士 小論文の17誌の POP カバーを作って note に反映してください。画像生成は組み込みの image_gen を使い、1誌1枚ずつ作って原寸と360pxで確かめてから次へ進みます。
