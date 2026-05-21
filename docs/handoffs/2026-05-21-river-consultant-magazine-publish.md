# 引き継ぎ: 総監模範論文-河川コンサル マガジン 公開準備

最終更新: 2026-05-21 / develop

## ゴール

note 有料マガジン「総監模範論文-河川コンサル」（R03〜R07 模範論文 5 本）を公開できる状態にする。

## 完了済み（2026-05-21・本コミット）

公開前の準備作業は完了。`docs/note/magazines/総監模範論文-河川コンサル/` は公開済み兄弟マガジン「総監模範論文-自治体道路担当」と同じ構成になっている。

- **本文 5 本**: R03〜R07 article.md は完成済み。呼称ゆれを修正（R03・R04 の「コンサル河川版」、R05 の一部を「河川コンサル版／河川コンサル」へ統一。マガジン名・`note-magazines.ts` の正典表記に一致）。
- **記事カバー画像**: R03〜R07 各 `img/cover.{svg,png}` を `scripts/generate-note-covers.mjs 河川コンサル` で生成。
- **マガジンカバー**: `_cover.png`（note.com マガジン用、`public/images/magazines/essay-river-consultant-cover.png` の複製）を配置。
- **hashtags.txt**: マガジン直下のタグプール（94 個）＋ R03〜R07 各記事の hashtags.txt を河川・砂防ペルソナ向けに作成。
- **品質チェック**: `npm run check-links --scope note` で河川コンサル 5 本はリンク切れ 0。U+FFFD 0・エンコーディング統一。本文のファクト・5 管理分類・トレードオフ論理に誤りなし（手動確認）。

> [!note] サブエージェント未実施分
> `note-figure-auditor` / `note-link-injector` / `note-fact-checker` の自動レビューは、作業時にプロキシ 407 エラーで起動不可だった。リンク検証・ファクト確認は手動代替済み。プロキシ復旧後に `/note-prepublish-review 河川コンサル` を一度通すと万全。

## 残作業（note.com マガジン URL が必要なため未実施）

公開のクリティカルパスは note.com 側の操作。以下は URL 取得後に行う。

### 1. note.com でマガジンを作成・記事を投稿

- マガジン名: 「総監記述式 模範論文｜建設コンサル河川・砂防 5年分セット」（`note-magazines.ts` の `title` に準拠）
- マガジンカバー画像: `docs/note/magazines/総監模範論文-河川コンサル/_cover.png`
- R03〜R07 の 5 記事を投稿（各 `RXX/article.md` 本文・`RXX/img/cover.png` をカバー・`RXX/hashtags.txt` のタグ）。価格 各 ¥500。マガジンに追加。
- マガジン URL（`https://note.com/dobokunote/m/m________________` 形式）を記録。

### 2. note-magazines.ts を更新（`src/lib/note-magazines.ts`）

`essay-river-consultant-magazine` を編集:

- `noteUrl: ''` → 取得した実 URL
- `published: false` → `true`

> [!warning] ブランチ運用
> `note-magazines.ts` はコード。CLAUDE.md のブランチ方針ではコード変更は feature ブランチ + PR（base = develop）。2 行の変更だが方針に従って判断する。

### 3. 本文の PLACEHOLDER を実 URL へ置換

5 記事の本文に `https://note.com/dobokunote/m/PLACEHOLDER_RIVER_MAGAZINE` が各 2 箇所（計 10 箇所）。実 URL へ一括置換:

```bash
cd C:/Users/m004195/doboku-note
for d in R03 R04 R05 R06 R07; do
  node -e '
    const fs=require("fs");
    const p=`docs/note/magazines/総監模範論文-河川コンサル/'$d'/article.md`;
    let s=fs.readFileSync(p,"utf8");
    s=s.split("PLACEHOLDER_RIVER_MAGAZINE").join("実マガジンID");  // 実 ID に置換
    fs.writeFileSync(p,s);
  '
done
```

（各記事 frontmatter の `noteUrl` は兄弟マガジン同様に空のまま運用してよい。真実源は `note-magazines.ts`。）

### 4. 検証 → commit → デプロイ

```bash
npm run check-links -- --scope note   # PLACEHOLDER が INFO から消えていること
```

- commit（`content(note): 河川コンサル模範論文マガジン公開`）→ develop。
- `develop` → `main` は `/deploy` 経由でユーザー判断。

### 5. 公開後インデックス再生成

```bash
node .claude/scripts/build-note-published-index.mjs   # .claude/state/note-published.json 更新
```

## 参考

- 公開済み参考実装: `docs/note/magazines/総監模範論文-自治体道路担当/`（`published: true`・noteUrl 埋設済み）
- 真実源: `src/lib/note-magazines.ts`（価格・magazine ID・noteUrl）
- 手順詳細: `docs/reference/note-publish-enhancement.md`
