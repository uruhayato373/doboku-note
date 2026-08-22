# Codex 実施ログ：土木施工経験記述 1級150工事・2級60工事への拡張

> [!done]
> **2026-08-20 土木パート公開完了**：1級50本・2級24本を追加公開し、既存購入者のマガジンへ収録。1級150工事・2級60工事、索引・販売文・カバーまでライブとSoTを同期した。

## 背景

DN-0095の土木施工経験記述を、既存の1級100工事・2級36工事から、1級150工事・2級60工事へ拡張するために実施した。工事名だけを置換する量産を避け、級別の役割・権限、法令固定値、工事固有の施工条件と管理方法を記事ごとに独立監査した。

## 実施内容

- 1級 `工事101`〜`工事150` の50本と、2級 `工事101`〜`工事124` の24本を作成。
- 各記事へ `article.md`、`hashtags.txt`、`img/cover.svg`、`img/cover.png` を用意。
- 1工事につき品質・安全・工程・施工計画・環境対策の5管理、各Q1/Q2を収録。
- 1級は監理技術者、2級は主任技術者または現場代理人の権限内へ統一。
- 法令・規格の固定値と、実工事へ置換する `〇〇` を分離。
- `scripts/keiken-charcount.mjs` に `--min-fill` を追加し、1級160〜200字、2級200〜250字を追加記事の公開ゲートとした。
- `scripts/gen-pdf-specs-civil-keiken.mjs` を番号付き工事だけ数えるよう修正し、PDF specを1級150本・2級60本へ更新。
- 正本台帳を `.claude/plans/DN-0095-civil-concrete-answer-expansion/04-civil-koji-registry.md` に作成し、TODOへ進捗を記録。
- 追加74本を note へ即時公開し、全記事の `noteId`・`noteUrl`・`notePublishedAt`・`noteStatus` をfrontmatterへ書き戻し。
- 1級50本を完全攻略パック `m8290970a7f05`、2級24本を想定工事バンク `m8554e87ca6ec` へ収録。既存購入者は追加購入不要。
- 公開索引を想定工事150／60へ更新し、全74本のライブURLを追加。マガジン説明・アピール・サイト側カタログ・CTAも同じ件数へ同期。
- 両マガジンの見出し画像を「想定工事150×5管理」「想定工事60×5管理」へ更新。
- `scripts/lib/note-live-check.mjs` の無料プレビュー判定を記事別下限へ変更し、短い正規プレビューの偽BLOCKを解消。
- `scripts/note-update-cover.mjs` を現行UIの「試し読みエリアを設定」「更新」へ対応させ、無料索引のカバー差替えを自動化。

## 検証

```powershell
node scripts/keiken-charcount.mjs <pack> --strict --min-fill --json
node scripts/note-lint.mjs <1級pack> <2級pack>
node scripts/check-note-boundary.mjs --all
node scripts/check-note-hashtags.mjs
node scripts/check-magazine-wiring.mjs
node scripts/gen-pdf-specs-civil-keiken.mjs --apply
npm run verify-note-magazines
npm run verify-note-status
npm run note-meta-lint
node scripts/check-note-cover-fit.mjs --all
```

- 追加1級50本：500答案、160〜200字、不足0・超過0。
- 追加2級24本：240答案、200〜250字、不足0・超過0。
- 追加74本：独立Evaluator最終判定 BLOCK 0・WARN 0。
- note lint：対象2パック216記事 OK。
- note boundary：600件、未解決0。
- note hashtags：822件、全件90タグ以上。
- magazine wiring：経験記述7マガジンを検出し、漏れ0。
- PDF spec：1級150記事、2級60記事。
- 1級完全攻略パック：151記事（索引1＋工事150）、今回50/50収録確認、価格¥9,800。
- 2級想定工事バンク：61記事（索引1＋工事60）、今回24/24収録確認、価格¥5,480。
- `verify-note-magazines`：公開46マガジン、SoT／価格ドリフト0。
- `verify-note-status`：初回449本ドリフト0。最終回は445本整合・4本が一時取得不能だったが、今回対象の2級索引は直後にAPIでpublished・新タイトル・新eyecatchを個別確認済み。
- note掲載文 49件の文字数違反0、索引2本のnote-lint OK、カバーfit違反0。

## 後続メモ

- 既存の1級100本・2級36本は今回の独立再監査対象外。新設した `--min-fill` をパック全体へかけると、既存答案に最小充足率未達が残る。追加74本は全件通過している。
- DN-0095の土木パートは公開完了。全体にはコンクリート主任技士32小論文とライブ導線整合、4週・8週レビューが残るため、タスク全体は未完了。
- 共有worktreeにはDN-0002、カバー更新、`docs/textbook/`等の別作業が共存している。今回の範囲外を巻き戻さない。
