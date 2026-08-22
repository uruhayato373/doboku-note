# Codex/Claude 実施ログ：土木施工管理・会員記事17本の公開準備

> [!success]
> **2026-08-19 公開準備完了**：TODO `DN-0002` に残っていた会員限定記事17本を監査・修正し、すべて `noteStatus: draft` の公開待ちにした。W6だけはnote下書き `n81850411ecb7` へ投入済み。予約・公開はまだ行っていない。

## 対象

- 経験記述「週次お題」W6〜W11：6本
- 学科記述予想：10本
- 添削練習：1本

## 修正内容

- 1級・2級の級別形式を分け、独自予想であることと最新問題用紙優先を明記。
- 経験記述の工事概要を公式7項目へ統一し、「工事場所」を追加。
- W11の「受験者が2テーマを選ぶ」「別工事2つでもよい」という誤記を修正。
- 安全・品質・工程・施工計画・環境対策と、学科10分野の技術記述を監査結果に沿って修正。
- 学科記事を「1級＝問題2〜11、2級＝問題2〜9」と明記。
- 添削事例を実会員の実績表示から、架空サンプルによる添削練習へ変更。工事概要の改善例も7項目化。
- 存在しない `学科記述予想`／`添削事例アーカイブ` マガジン指定を削除し、会員限定の単独記事として配信する設計へ変更。
- 提出先を、存在しないフォームから記事下部のコメント欄へ統一。匿名化の注意を追加。
- W6〜W11の字数カウントツールに記事別UTMを追加。
- 17本すべてで末尾の重複著者画像を削除し、冒頭の1枚だけに整理。
- 3本のカバーを再生成し、タイトル・便益文と本文を整合。
- ハッシュタグは全17本とも96件を維持し、最初の30件に記事固有語を配置。添削練習の2タグを実態に合わせて変更。

## 検証

```bash
node scripts/note-lint.mjs <17記事>
node .claude/scripts/check-note-3set.mjs --require <article>
node .claude/scripts/check-note-bold-paren.mjs <article>
node .claude/scripts/check-note-link-anchor-match.mjs <article>
node .claude/scripts/check-note-magazine-cta.mjs <article>
node scripts/reflow-note-paragraphs.mjs --dry --target 120 <article>
node scripts/check-note-hashtags.mjs
node scripts/check-note-cover-fit.mjs
node scripts/check-note-cover-tokens.mjs
```

- note-lint：17/17 OK
- 3点セット・太字括弧・アンカー整合・マガジンCTA：17/17 OK
- 120字超段落：0
- hashtags：全748ファイルが90件以上。対象17本は各96件
- cover fit：全766件がレイアウト制約内
- cover token：590記事、違反0
- 画像：欠損0。対象カバー17枚は1280×670
- 事実性・級別形式の最終再監査：BLOCK 0（17/17 GO）
- リンク・CTA・UTMの最終再監査：BLOCK 0（17/17 GO、字数ツール6リンクはHTTP 200）
- 画像・カバーの最終再監査：BLOCK 0（17/17 GO）
- W6は既存下書き `n81850411ecb7` を再利用して本文・画像・目次・96タグを保存し、「メンバー全員に公開」を選択済み。DRAFTモードで終了し、未公開

## 配信方針

- W6〜W11は既存の会員特典マガジン `mbe07bd5cecda` へ公開後に収録する。
- 学科10本と添削練習1本は、存在しないマガジンを新設せず、まず会員限定の単独記事として配信する。
- 正確な配信日と順序は `content/note/1級・2級土木/メンバーシップ/README.md`、タスク状態は `.claude/todo/backlog.md` の `DN-0002` を真実源とする。
- 公開範囲を会員限定に設定できない場合は公開しない。公開後は `is_limited=true` と未ログイン本文0字を確認する。
