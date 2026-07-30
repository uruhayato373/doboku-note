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

> [!caution] アカウントの「本の作成数制限」で新規提出が丸ごと止まる（2026-07-30 実測）
> 詳細記入・カテゴリー選択まで正常に進んだ後、ページ2へ遷移する所でモーダルが出て止まる:
> **「本の作成数制限を超えました / このアカウントで提出可能な本の数を超えています。」**
> スクリプトは `ABORT: ページ2へ遷移できず` で終わる（exit 3）。この時点では**本は作成されない**
> ——catalog の `draftAsin` も未記録、本棚にも現れないので、状態は汚れず再実行は安全。
>
> ログの `エラー:` 行には静的な注意書き（「タイトルとサブタイトルは合わせて 200 文字以内」等）が
> 大量に混ざるので**文字列だけ読むと誤診する**。`.tmp/kdp-<id>-03-content-fail.png` を必ず見る。
>
> 実測時の状況: live 33 冊、直近の一括作成は 19 日前（2026-07-11 に 28 冊）。日次リセット型では
> 説明がつかないため、上限解除は **KDP サポートへの連絡（人）** が要る。上限に当たっている間は
> 何冊分の EPUB を用意しても提出できないので、待たずにサポート導線へ回すこと。

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
node scripts/kdp-publish.mjs --id <id> --publish-only --commit-publish
```
→ draftAsin の価格ページへ直行して「Kindle本を出版」。価格/ロイヤリティが期待値と不一致なら出版せず停止。

> **`--publish-only` を付ける**（2026-07-27 の実運用で確立）。`--commit-publish` 単独は
> **全フローを最初からやり直す**ため、カテゴリー設定済みの下書きに対して
> `[cat] L0 "Kindle本" 選択失敗 → ABORT: カテゴリー登録失敗` で止まる（既に選択済みの
> 下書きでは選択肢が出ないため）。`--publish-only` は詳細/カテゴリーに触れず約1分で終わる。

> **実行の間に Chrome を止めてプロファイルを正常化する**（必須）。下書き直後に出版を走らせると
> 前段の Chrome とプロファイルが競合し、**エラーも出さず無言でハングする**（2026-07-27 に3回発生。
> 症状＝node は生きているが CPU がほぼ増えず、ブラウザプロセスが 0、スクショも更新されない）。
> さらにハングを `kill -9` すると `Default/Preferences` の `exit_type` が `Crashed` になり、
> 次回起動時に復元ダイアログでまたハングする。手順は `scripts/kdp-batch.sh` の `clean_profile()`。

### 一括提出（複数冊）

```
npm run kdp-batch -- f-08 f-09 f-10 ...
```

`scripts/kdp-batch.sh` が「配置 → 下書き → プロファイル掃除 → 出版 → catalog 更新」を
1冊あたり約3.5分で回し、異常時は即中断する（2026-07-27 に10冊を無人処理した実績）。

**KDP 新規/実績浅アカウントは本の作成数制限あり**（過去 d-03 提出時、2026-07-27 に f-08 で到達）。
到達すると詳細ページで **モーダル「本の作成数制限を超えました／このアカウントで提出可能な本の数を
超えています」** が出て「保存して続行」が効かず、script は `ABORT: ページ2へ遷移できず` で止まる。
**この ABORT のログには 200 字制限などページ常設のヒント文も一緒に列挙されるので、文言だけで
原因を判断せず `.tmp/kdp-<id>-03-content-fail.png` を必ず見る**（2026-07-27 に文字数超過と誤診した）。
数日で枠が回復するので、回復後に残りの id を `kdp-batch` へ渡して再開する。
制限到達文言を検知したら中断→数日で枠回復。まとめて出さず **n冊/日で分割**する。

### 状態同期（LIVE 化の記録・重複突合）
```
node scripts/kdp-publish.mjs --sync-status   # .tmp/kdp-sync-status.json
```
→ kdp-operator が catalog と突合し、in_review→live 遷移・新規 ASIN を catalog/08戦略doc/README の3箇所へ。

**catalog 駆動のタイトル検索**で各冊を本棚に問う方式（2026-07-30 に列挙方式から置換）。本棚の列挙は
ページネーションで先頭10冊しか DOM に無く、`title-setup/kindle/` の ID も 13〜14 桁の内部ID（例
`YJ0R3ZX4TJV`）で ASIN ではないため、live 33 冊の口座で 10 件しか拾えず半分が著者ID様のゴミだった。
検索なら本棚の総数にもページ送りにも左右されない。

自己検証つき: catalog に ASIN がある本を1件も再現できなければ **exit 1（検査不成立）**。
`found:false` を「本棚に無い」の証拠として使ってよいのは exit 0 のときだけ。

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
- [strategy.md](../../../content/kindle/strategy.md) — 出版戦略・出版済み一覧
