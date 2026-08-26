---
name: brain-publish
description: >
  Brain（brain-market.com）へ Claude Code キット商品を Playwright で出品するスキル。カタログ
  （src/lib/brain-products.ts＝価格/状態/URL）と listings（content/brain/listings.json＝
  本文/画像/有料ライン）を真実源に、ログイン済みプロファイルで Tiptap エディタへ流し込む。
  安全弁＝既定は下書きまで・公開申請は --commit 必須／販売設定はセッション状態のため価格〜申請を
  1セッションで実行／有料ラインは可視テキスト assert・確認モーダルの価格 assert 不一致なら確定しない／
  配布URLが本文の有料エリアに無ければ ABORT／同意モーダルは --agree（ユーザー許可）なしに押さない。
  申請成功時はカタログへ status:'submitted'＋articleId＋submittedAt を書き戻す。審査結果の反映・
  新商品の配線は brain-operator が統括。Use when user asks to
  [Brainに出品, Brain商品を公開申請, Brainのドラフトを作る, /brain-publish].
user-invocable: true
---

## 用途

Brain 商品の出品（下書き作成〜公開申請）。運用・スキーマ・挙動のクセの真実源は
[.claude/knowledge/reference/brain-operations.md](../../../../.claude/knowledge/reference/brain-operations.md)。

## 手順

1. **整合ゲート**: `npm run check-brain-wiring` が green であること（catalog↔listings↔dist ZIP↔配布URL位置）。
   赤ならエラー行の指示どおり SoT を直してから進む。
2. **配布物の確認**: `content/brain/dist/<distFile>` が main に載り、
   `https://storage.doboku-note.com/brain/dist/<distFile>` が HTTP 200 であること
   （未アップロードなら `gh workflow run r2-brain-dist.yml` → 200 確認）。
3. **下書き**: `node scripts/brain-publish.mjs --service <id>`
   - ブラウザが開く。未ログインならユーザーがログイン（最大6分待機・CAPTCHA も人）。
   - 審査ガイドライン同意モーダルが出たら ABORT する仕様。**ユーザーに同意可否を確認**し、
     許可されたら `--agree` を付けて再実行。
   - 完了時に editUrl が出る。Brain 側で目視確認してもらう。
4. **公開申請**: ユーザーの確認が取れたら `node scripts/brain-publish.mjs --service <id> --edit-url <url> --commit`
   - 価格設定→有料ライン→assert→申請→確認モーダル（価格 assert）→確定 まで1セッションで実行。
   - 成功シグナル＝`/a/complete_published`＋「公開申請が完了しました」。**これ無しに成功と報告しない。**
5. **書き戻し commit**: カタログの status:'submitted' 書き戻しを確認し、pathspec で commit。
6. **審査後**: 結果メールを受けてユーザー指示で status を listed/rejected へ flip（brain-operator）。
   メールは **Gmail MCP** で読む（Playwright で Gmail は開けない）。接続先は `uruhayato373@gmail.com` のみ＝
   **0 件は「結果が来ていない」ではなく「宛先が見えていない」**。判断は Brain のマイページの実体で行う。

## 二重申請防止

カタログが submitted/listed の service は ABORT する（再申請は `--force-resubmit`）。

## カテゴリ変更（再審査を伴う）

Brain はカテゴリを**申請時設定**として扱う（in-place 変更不可）。変更は販売設定→有料エリア→**再申請**を通り、公開中でも**再審査**に入る（審査中は status=submitted で /links から自動非表示）。

```
node scripts/brain-publish.mjs --service <id> --edit-url <editUrl> --commit --force-resubmit --set-category <label>
```

販売設定ステップ 5b でカテゴリ v-select を選択（**仮想リスト**＝候補は wheel スクロールで DOM 化してから click→assert）。全候補・注意点は [brain-operations §4/§6](../../../../.claude/knowledge/reference/brain-operations.md)。

## 本文（LP）差し替え（再審査を伴う）

既定は既存本文を保持（>50字なら挿入スキップ）。listings の bodyText を書き直してライブへ反映するには **`--replace-body`**（既存を全消去→再挿入）。本文変更も再申請＝再審査。**書き直す際は構成の型＝[note-selling-structures.md](../../../../.claude/knowledge/reference/note-selling-structures.md)「強化コンポーネント」を参照**（誠実表現は brain-operations §5-6）。

```
node scripts/brain-publish.mjs --service <id> --edit-url <editUrl> --commit --force-resubmit --replace-body [--set-category <label>]
```

本文に**図版を挿入**するなら `--insert-figures <json>`（`[{after,image}]`）を併用。**重複防止のため必ず `--replace-body` と併用**（Brain は保存前でも画像を保持し、やり直すと重複する）。挿入ロジックは `scripts/lib/brain-figures.mjs`、図版は `content/brain/assets/figures/`。

```
node scripts/brain-publish.mjs --service <id> --edit-url <editUrl> --commit --force-resubmit --replace-body --insert-figures figs.json --set-category 資格
```
