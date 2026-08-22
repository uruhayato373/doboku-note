---
name: note-attach-pdf
description: >
  公開済み note 有料記事の本文末尾（有料エリア内）に印刷用 PDF をダウンロードカードとして添付し再公開する
  ブラウザ CLI。`note-publish` が扱わない「ファイル添付」を担う（従来は半手動）。Playwright + システム Chrome。
  1記事=note-attach-file、1マガジン直列バッチ=note-attach-magazine-pdfs。Use when user says
  "note記事にPDFを添付", "印刷用PDFを記事末尾に", "マガジンのPDFが未添付", "/note-attach-pdf".
  **既定 dry/probe・実添付は --commit。有料境界を非破壊検証してから再公開。収益アカウントのため偽成功ガード必須。Windows可。**
disable-model-invocation: true
user-invocable: true
argument-hint: "--dir <magazineDir> [--commit]   (単記事: scripts/note-attach-file.mjs --note <key> --file <pdf> [--commit])"
---

公開済み記事へ印刷用 PDF を添付する。`note-publish`（記事公開）がカバー/本文/価格/有料境界までは自動化したが、**PDF ファイル添付は markdown 不可の note プラットフォーム機能で従来「半手動」**だった領域を自動化する。`note-edit-session` のログイン済み永続プロファイルを再利用。

## ⚠️ 前提・背景

- **【最重要】note のファイルアップロードは 1日100件上限**（2026-06-16 実証＝建設部門BK のPDF添453 を 18×5＋10 で100に達し、以降が全 ABORT「ファイルカード未検出」）。**1マガジン=18 PDF なので 1日あたり最大5マガジン**（余裕を見て4）まで。超過分は翌日に持ち越し（done-log＋per-article 冪等で自動再開、再公開は upload を消費しない）。失敗が「embedsBefore==embedsAfter・pdfVisible=false」で連続するときは**上限到達を疑う**（PDF破損やセレクタ不良ではない）。
- 記事本文に「**印刷用PDF｜本記事の模範解答**」節（説明文）があっても、**PDF ファイル本体は別途 note エディタで添付**しないと出ない（markdown では貼れない）。本スキルがその添付を自動化。
- PDF は**既定で本文末尾**（有料記事なら有料エリア内＝購入者のみ可）。**`--anchor "<段落テキスト>"` で指定段落の直後に挿入**でき、無料記事で各セクション内に PDF を配置する用途に使う（未指定＝末尾／未検出＝exit 7 ABORT で誤挿入防止・複数を順に積むときは `--force` 併用）。
- **note の公開ボタン「更新する／投稿する」は公開設定ページに無く、有料エリア設定ビューに出現する**。既存の有料線は「このラインより先を有料にする」**バー**で表示され、その位置には「ラインをこの場所に変更」ボタンが無い → **試験問題/予想問題直前の制御がバーなら触らない・変更ボタンなら寄せる**（さもないと正しい線を動かす）。

## 使い方

```bash
# 1マガジン分を直列バッチ（frontmatter noteId ↔ 同dir PDF を突合・done-logで再開・1記事最大2回試行）
node scripts/note-attach-magazine-pdfs.mjs --dir <magazineDir>            # dry（対象一覧のみ）
node scripts/note-attach-magazine-pdfs.mjs --dir <magazineDir> --commit   # 実添付

# 1記事だけ（単体ツール）
node scripts/note-attach-file.mjs --note <noteKey> --file <pdf path>            # probe（挿入メニュー構造ダンプ）
node scripts/note-attach-file.mjs --note <noteKey> --file <pdf path> --commit   # 実添付（既定＝本文末尾へ）

# 各セクション内に配置（無料記事など）: 指定テキストを含む最小段落の直後へ挿入（未検出は exit 7 ABORT＝誤挿入防止）
node scripts/note-attach-file.mjs --note <noteKey> --file <pdf path> --anchor "<段落の一部>" --commit --force
```

- マッピング: `<magazineDir>/<year>/article-<type>.md` の frontmatter `noteId` と同 dir の PDF（II1→`/-II-1-/` ・II2→`/-II-2-/` ・III→`/-III-/`）を突合。noteId 無し（未公開）はスキップ。

## フロー（実機確定・2026-06-16）

1. account=dobokunote ゲート（**ページ描画遅延に強い polling**・偽 ABORT 防止）
2. `editor.note.com/notes/{key}/edit` → 挿入位置へ caret 移動（既定＝本文末尾を JS で選択／`--anchor` 指定時は当該段落の直後・未検出は ABORT）→ Enter →「+」（aria-label「メニューを開く」）→「ファイル」→ native filechooser で PDF
3. アップロード成功検証（埋め込み数増 or `.pdf` 出現）→「公開に進む」
4. 「有料エリア設定」→ **有料エリアビューの描画待ち**→ 既存境界を**非破壊検証**（試験問題/予想問題直前=between0・崩れたら中断）→「更新する」
5. 偽成功ガード: 公開ページを curl して**有料維持**（`購入手続き` 等）を実体確認

## 完了条件（添付は「実行した」では終わらない）

`note-attach-file --commit` は再公開後に**ライブの添付リンク数を実測**し、0 なら exit 9（「更新するを押せた＝添付できた」ではない）。横断確認は:

```bash
node scripts/check-note-attachments.mjs --live   # 期待本数 vs ライブ実測
```

ディスク上に PDF がある公開記事すべてについて、note ライブの添付リンク（`api/v2/attachments/download`）本数を著者ログインで実測し、不足を exit 1 で落とす。**未ログインの HTML には有料エリアの添付カードが出ない**ため CI では検査できず、この live 層はローカル専用（CI 側は `npm run check-note-attachments` が「約束した PDF がディスクに在るか」だけを見る）。

> [!warning] 本文の全文置換は添付を消す
> `note-update-body`（Ctrl+A → Delete → paste）は本文内の PDF 添付カードごと消す。SoT の markdown に添付は無いので paste では戻らない。2026-07-28、建設部門の送客リンク是正で 196 本を全文置換し、6/16 に添付した PDF カードを失った。現在は `note-update-body` が既存添付を検出したら既定で中断する（`--allow-attachment-loss` で明示解除・解除したら反映後に必ず再添付）。画像だけ直すなら `--images-only`。

## 冪等・安全弁

- **冪等**: 本文に `.pdf`（添付カード）が既にあれば**再添付せず再公開のみ**（live 反映保証・二重添付しない）。バッチは done-log でスキップ・**失敗で停止→再実行で再開**。
- **境界が崩れたら再公開しない**（無料漏れ防止のゲート）。
- **ユーザー起動限定**（`disable-model-invocation`）＋サブエージェント化しない（決定的フロー＝原則5）。
- 実績: BK-02 河川砂防・BK-03 都市計画 各18記事を添付（公開ページで有料維持＋ダウンロードカード実在を全件実査）。

## 関連

- `scripts/note-attach-file.mjs`（1記事）／`scripts/note-attach-magazine-pdfs.mjs`（マガジン直列バッチ）
- 記事公開: `note-publish` ／ マガジンカバー: `note-magazine-cover` ／ 収録: `note-magazine-add`
- 印刷用 PDF 生成: `scripts/magazine-to-pdf.mjs`（`magazine-pdf-builder`）／真実源 `.claude/knowledge/reference/note-api-verification.md`・[[project_note_write_automation]]
