# ハンドオフ: 1級土木 完全攻略パック 100工事 note公開（別PC実行用）

**日付**: 2026-06-30
**目的**: 1級土木 経験記述 完全攻略パック（旗艦・¥9,800／単品¥1,280）の100工事を note 公開し、マガジン `m8290970a7f05` に収録する。**会社PC（Windows）はプロキシ不安定で実走が断続失敗するため、安定ネットワークの別PCで実施する。**
**前提の証明**: 工事01 の **DRAFT 試走は全工程成功**（価格¥1,280・タグ90・本文paste・冒頭CTAカード化・**有料境界=品質管理 検証OK**）。`--commit` は会社PCのプロキシ/UIタイミングで2回とも transient 失敗（コード/データの問題ではない）。

> [!note] 結論
> **コードとデータは公開可能な状態に完成済み**。別PC（安定回線＋note ログイン済みプロファイル）で下記コマンドを流すだけ。

---

## 1. 準備済み（develop に反映済み・追加制作は不要）

- **100工事の article.md**（`docs/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック/工事NN-*/`）
  - 各記事 = 1工事 × 5管理（品質/工程/安全/施工計画/環境）の完成答案
  - 3点セット: `article.md` ＋ `img/cover.png` ＋ `hashtags.txt`
  - frontmatter: `notePricing: paid` / `price: 1280` / `paidBoundary: 品質管理` / `noteUrl: ""` `noteId: ""` `notePublishedAt: ""` `noteStatus: draft`（**公開時にURL/IDが自動書き戻し**）
  - 冒頭に旗艦パック誘導の**リンクカードCTA**（`<!-- cta:pack-top -->`・publish時マーカー除去）
- **マガジン枠**: note 公開済み `https://note.com/dobokunote/m/m8290970a7f05`（中身は収録待ち）
- **SKU** `civil-1-keiken-complete-pack`（`src/lib/note-magazines.ts`）: `published: false` で**ゲート中**（空パックを広告しない。100本収録完了後に true 化）
- **note-publish.mjs**: 有料境界を frontmatter `paidBoundary`（H2先頭一致regex）で読む多資格対応済み（civil=品質管理）
- **公開順マニフェスト**: `docs/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック/_publish-order.txt`（工事01→100・100行）

---

## 2. 別PCのセットアップ

```bash
git clone <repo> && cd doboku-note && git checkout develop && git pull
npm ci --legacy-peer-deps                 # 依存
npx playwright install chromium           # または channel:chrome を使うのでシステムChromeでも可
```

- **note ログイン済みプロファイル**: `.local/playwright-note-profile`（リポ root 直下・gitignore）。**初回のみ手動ログイン** — `note-publish.mjs` を一度起動すると headed Chrome が開くので `note.com/dobokunote` にログイン → プロファイルに永続化される。プロファイルは**マシン固有のChromeデータなので転送せず、別PCで新規ログインする**。
- **アカウント安全ゲート**: スクリプトは Phase 1 で `dobokunote` を assert。不一致なら1記事も触らず中断（誤爆防止）。

---

## 3. 公開手順

### 3-1. まず1本で DRAFT → COMMIT 検証
```bash
ART="docs/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック/工事01-道路改良高盛土/article.md"
node scripts/note-publish.mjs --article "$ART"            # DRAFT（公開しない・挙動確認）
node scripts/note-publish.mjs --article "$ART" --commit   # 実公開＋frontmatterにnoteUrl書き戻し
```
- 期待ログ: `[11] boundary target {ok:true, heading:"品質管理…"}` → `boundaryBeforeExam:true` → `publishedUrl` が出る
- **公開後 `git diff` で工事01の frontmatter に noteUrl/noteId/notePublishedAt/noteStatus:published が入ったことを確認**

### 3-2. 残り99本をバッチ公開
```bash
node scripts/note-publish-magazine.mjs \
  --list "docs/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック/_publish-order.txt" --commit
# 予約投稿で時間分散する場合:
#   --schedule-start 2026-07-01T08:00 --interval-hours 6
```
- **冪等**: 既に noteUrl が入った記事は自動 skip → 失敗しても再実行で続きから再開できる
- 各記事公開ごとに frontmatter へ noteUrl 書き戻し

### 3-3. frontmatter 書き戻しを develop へ反映
公開は別PCの clone で行われ、frontmatter（noteUrl 等）が書き換わる。**100本分の frontmatter 変更を commit → push → PR(base develop) → merge** すること（SoT 同期）。

---

## 4. 公開後の仕上げ

1. **マガジン収録**: `node scripts/note-magazine-add-articles.mjs ...`（100本を `m8290970a7f05` へ。引数はスクリプト header 参照）
2. **目次**: note-publish.mjs では目次は入らない。各記事を note エディタで開き、**CTA直後にネイティブ目次ブロック**を挿入（publish-note `references/editor-operations.md` Phase 4.5・browser-use）。H2が5管理ぶんあるので対象
3. **無料記事23本へCTA live反映**: PR#306 でソースに冒頭CTAを配線済みだが**ライブ未反映**。各記事に対し
   ```bash
   node scripts/note-append-cta.mjs --note <noteId> --text "<冒頭CTA文>" --url https://note.com/dobokunote/m/m8290970a7f05 --before-first-h2 --commit
   ```
4. **SKU 公開**: 100本収録完了後、`src/lib/note-magazines.ts` の `civil-1-keiken-complete-pack` を `published: true` に（noteUrl は設定済み）。commit → develop
5. **`/deploy`**: サイト反映

---

## 5. 後始末・既知の注意

- **テスト下書き2本を削除**: `n1f29110ec7d4`（DRAFT試走）・`n13b5c429e5cf`（COMMIT中断）。どちらも未公開。note の下書き一覧から削除
- **既知の flakiness**: note エディタのタイミング揺れ（公開設定パネルの要素未検出）・プロキシのタイムアウト。失敗したら**編集画面を再読込してやり直す**（`references/troubleshooting.md`）。安定回線なら基本スムーズ
- **偽成功に注意**: 「投稿できた」ログを信用せず、note 公開ページで本文・カバー・タグ・価格・有料境界（品質管理直前）を実体検証してから「完了」とする
- **設計**: 土木専用ツールは無い。publish-note は多資格共通（総監/建設/civil）。違いは frontmatter（パス/paidBoundary/price）のみ

## 6. 関連
- 真実源: `docs/note/1級・2級土木/noteコンテンツ計画.md`（戦略）／`src/lib/note-magazines.ts`（SKU）
- ツール: `scripts/note-publish.mjs`・`note-publish-magazine.mjs`・`note-magazine-add-articles.mjs`・`note-append-cta.mjs`
- skill: `.claude/skills/social/publish-note/`（差分マップに civil 行あり）
