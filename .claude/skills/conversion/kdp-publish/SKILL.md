---
name: kdp-publish
description: >
  ビルド済み Kindle 本（EPUB＋表紙）を Amazon KDP へ入稿し下書き保存→（承認後）出版する。
  詳細記入・カテゴリー選択・原稿/表紙アップロード・原稿処理完了待ち・AI申告・アクセシビリティ・
  価格・出版までを scripts/kdp-publish.mjs（Playwright・永続プロファイルでログイン保存）で駆動し、
  提出前の本棚突合（重複防止）・提出後の catalog.json 更新・LIVE 化後の ASIN 記録は kdp-operator が担う。
  真実源は .claude/config/kdp-memo.json（defaults＝共通申告/カテゴリー経路）。EPUB を作る /kindle-build の後工程。
  Use when user asks to [KDP出版, KDP提出, KDP公開, kindleを出版, KDP状態同期, KDPドラフト削除, /kdp-publish].
user-invocable: true
---

## 用途

`/kindle-build` で生成した EPUB を、Amazon KDP のブラウザ UI へ自動入稿し出版する。UI 操作は決定的
Playwright スクリプトで、判断（重複突合・未登録本のメタデータ生成・出版可否）は `kdp-operator` が担う。

```
/kindle-build {id}  →  EPUB+表紙（kindle-dist/）
        ↓  npm run sync-kindle-dist -- --downloads {id}   （~/Downloads へ配置）
/kdp-publish {id}   →  KDP 入稿（詳細→カテゴリー→アップロード→AI申告→価格→下書き）
        ↓  人が Kindle Previewer 目視・承認
/kdp-publish {id} --commit-publish  →  出版（不可逆・審査へ）
```

## 前提

- **ローカル限定・ログイン済みプロファイル**: 初回のみ人が手動ログイン（CAPTCHA/2FA も人）。以降 `.local/playwright-kdp-profile` にセッション保持で無人。未ログインなら script が最大2分待つ。
- **EPUB/表紙が Downloads にある**: `npm run sync-kindle-dist -- --downloads <id>` で配置。
- **メタデータ登録済み**: `.claude/config/kdp-memo.json` books[id] が必要。未登録（C系/F系/e-02）は kdp-operator ケース2 で先に生成。

## ケース別手順

### 新規提出（下書きまで・出版しない）
```
node scripts/kdp-publish.mjs --id <id>
```
→ 詳細→カテゴリー→原稿/表紙アップロード→**原稿処理完了まで待機**→AI申告→アクセシビリティ→価格→下書き保存。
`.tmp/kdp-<id>-checklist.txt` を出力。発番したドラフト ASIN は catalog.json の `draftAsin` に自動記録（再実行で重複作成しない）。

### 出版（不可逆・承認後）
```
node scripts/kdp-publish.mjs --id <id> --commit-publish
```
→ draftAsin を再利用して価格ページまで進め「Kindle本を出版」。価格/ロイヤリティが期待値と不一致なら出版せず停止。

### 一括提出（複数冊）
1冊ずつ順に `--id <id>` を実行。**KDP 新規/実績浅アカウントは本の作成数制限あり**（過去 d-03 提出時に到達）。
制限到達文言を検知したら中断→数日で枠回復。まとめて出さず **n冊/日で分割**する。

### 状態同期（LIVE 化の記録）
```
node scripts/kdp-publish.mjs --sync-status   # .tmp/kdp-sync-status.json
```
→ kdp-operator が catalog と突合し、in_review→live 遷移・新規 ASIN を catalog/08戦略doc/README の3箇所へ。

### ドラフト削除（テスト残骸）
```
node scripts/kdp-publish.mjs --list-drafts               # 本棚確認
node scripts/kdp-publish.mjs --delete-drafts <ASIN>      # 下書きのみ・下書き assert
```

### カテゴリー末端の較正（A/E系・未検証系統）
```
node scripts/kdp-publish.mjs --diag-category --asin <既存draft ASIN>
```
→ カスケード最深 select の候補（=「場所」チェックボックスの選択肢）を実測。`books[id].kdp.categoryLeaf` に設定。

### 既刊 EPUB 差し替え（**未実装・手順予約**）
`--update-manuscript` は未実装。既刊（販売中）の EPUB を差し替える案件が出たら、まず `--dump --asin <ASIN> --page content`
で編集セッションの DOM を較正してから実装する。**必須安全弁**（実装時）: ①ページ上のタイトルと spec.title 一致 assert
（別の本に上書きする事故防止）②本棚 status=販売中 assert ③content 以外（details/pricing）を触らない。修正版は
**既存差し替え**（新規作成禁止・[[kindle-dup-prevention]]）。

## kdp-operator への委譲

高レベル指示（「c-01 を提出」「未登録本のメタ生成」「LIVE 化を記録」「重複確認」）は `kdp-operator`
（Orchestrator・sonnet）へ。出版・削除は同エージェントの安全弁（承認 gate・下書き assert）配下で実行。

## 検証

- **原稿処理**: script は「ファイルの処理が完了しました。原稿チェックが完了しました」まで待つ（表紙の「正常にアップロード」で早期完了と誤認しない）。「処理中に問題」検知で即 fail。
- **出版後**: 「おめでとう／レビュー中／提出されました」文言を確認して初めて成功報告。
- **提出後**: `--sync-status` で本棚実体と catalog を突合。

## トラブルシューティング

| 症状 | 原因/対処 |
|---|---|
| 「ファイルの処理中に問題が見つかりました」 | EPUB に **.svg 拡張子の JPEG** が混入（KDP が拡張子で SVG 解析→失敗・epubcheck は通る）。`build-pe1-kindle.mjs` は修正済（`.svg`→`.jpg` 正規化）。`unzip -l <epub> \| grep -c .svg` が 0 か確認し 0 でなければ再ビルド（[[kdp-svg-named-jpeg-bug]]） |
| カテゴリーが「本のカテゴリーを追加します」で進めない | 末端は4つ目のドロップダウンでなく**「場所」パネルのチェックボックス**。技術士系=工学・技術・環境▸☑技術士。A/E系は `--diag-category` で確認 |
| AI申告で「画像の作成に使用したAIツールを指定します」 | 画像=AI生成 を選ぶとツール名が必須。config `defaults.aiDeclaration.imageTool` を記入（表紙背景の生成元） |
| 価格ページへ進めない | AI申告未完 or アクセシビリティ未回答。新規アップロード時は affirmation チェックボックスも必要（script が自動チェック） |
| 連続実行で Chrome がハング | 永続プロファイルのロック競合。`.local/playwright-kdp-profile/Singleton*` を削除し1プロセスずつ実行 |

## 参照

- `scripts/kdp-publish.mjs` — 入稿・出版パブリッシャ
- `scripts/lib/kdp-common.mjs` — SSOT 読取り・defaults/override・検証
- `.claude/agents/kdp-operator.md` — 運用オーケストレーター（本スキルの委譲先）
- `.claude/config/kdp-memo.json` — KDP 入稿 SSOT
- `scripts/kindle-published/catalog.json` — 全書籍レジストリ
- [/kindle-build](../kindle-build/SKILL.md) — 前工程（EPUB 生成）
- [08_Kindle出版戦略.md](../../../../docs/project/01_戦略/08_Kindle出版戦略.md) — 出版戦略・出版済み一覧
