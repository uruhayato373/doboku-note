---
title: Brain 運用 SSOT（商品カタログ・出品自動化・配布・審査）
---

# Brain 運用 SSOT — Claude Code キット商品

Brain（brain-market.com）で販売する Claude Code キット商品の**運用・スキーマ・安全弁**の真実源。2026-07-22 新設（同日の実出品2件で確立したフローの恒久化）。

> [!important] 守備範囲の切り分け（重複 SSOT を作らない）
> - **本書** = 運用（スキーマ・出品フロー・配布経路・審査後運用・安全弁・Brain UI のクセ）
> - `src/lib/brain-products.ts` = **価格・状態・URL の機械可読 SoT**（文章側に価格を書かない）
> - 各商品の企画・検証記録 = `docs/project/05_プロダクト/brain-claude-code-essay-skill/`（①）・`brain-r8-policy-prediction-skill/`（②・バックテスト=04）・出品当日の手順集約 = `brain-publish-playbook.md`
> - 商品本体（スキル実体）= 別 private リポジトリ `claude-code-civil-essay-kit` / `pe-policy-bank-kit`

**いつ読むか**: Brain へ出品・修正する／審査結果を反映する／新商品を配線する／配布 ZIP を更新するとき。

## 1. アカウント SSOT

`.claude/config/brain-account.json`（coconala-account.json と同じ流儀）。

| キー | 意味 |
|---|---|
| `sellerName` | Brain の表示名（=doboku-note）。自動操作の account assert（可視テキスト照合・best-effort） |
| `agreedGuidelineAt` | 「記事公開の審査ガイドライン」同意日。**同意モーダルのクリックはユーザー明示許可事項**（brain-publish は --agree なしでは押さず停止） |

ログイン済みプロファイル: `.local/playwright-brain-profile`（gitignore・ログイン/CAPTCHA は人）。

## 2. 3スキーマ

### 2.1 カタログ（SoT）: `src/lib/brain-products.ts`

| フィールド | 用途 |
|---|---|
| `id` | `brain-{商品}`。sales-log の productId は `brain:{id}` |
| `status` | `draft`（未申請）/ `submitted`（**公開申請済・審査待ち**）/ `listed`（審査通過・販売中）/ `rejected`（却下・修正待ち）/ `paused` |
| `articleId` / `productUrl` | Brain 記事 id（`/a/{articleId}`）。申請成功時に自動書き戻し |
| `price` / `priceYen` | 表示 / 機械照合（Brain 制約 100〜100,000 円）。**必ず同時更新** |
| `distFile` | 配布 ZIP ファイル名（トークン付・§3） |

### 2.2 出品投入 SoT: `.claude/config/brain-listings.json`

| listings[id] のキー | 意味 |
|---|---|
| `bodyText` | 販売記事の全文（無料LP＋paidMarker＋有料エリア）。**¥価格の直書き禁止**（真実源はカタログ）・**配布URLを有料エリア内に必須**（check-brain-wiring が強制） |
| `imagePath` | メイン画像 PNG（`.claude/config/brain/assets/`・1200×630。Brain 側でトリミング「適用」） |
| `paidMarker` | 有料ラインを置く目印文字列（この直前にライン設定。既定「ここから先（有料エリア）」） |

### 2.3 配布（納品）: `.claude/config/brain/dist/` → R2

```
kit repo で git archive --format=zip -o .claude/config/brain/dist/<name>-<token>.zip <branch>
  （token = crypto.randomBytes(9).toString('base64url')＝推測不能ファイル名）
→ commit → main へ昇格（workflow は main を checkout する）
→ gh workflow run r2-brain-dist.yml（scripts/upload-brain-dist-r2.mjs・creds は CI supplies）
→ https://storage.doboku-note.com/brain/dist/<file> が HTTP 200 を確認
```

納品は有料エリア内の R2 リンク（リンクを知る人のみ＝Drive リンク共有と同等）。ZIP 差し替え時は**新トークンで別名**にし、本文のURLも更新する（旧URLの無効化はできないため）。

## 3. 出品フロー（`/brain-publish`）

```
check-brain-wiring green → dist R2 200 確認
→ node scripts/brain-publish.mjs --service <id>          # 下書き（記事作成→本文→画像）
→ ユーザーが Brain UI で目視確認
→ node scripts/brain-publish.mjs --service <id> --edit-url <url> --commit
    # 価格→有料ライン→assert→公開申請→確認モーダル(価格assert)→確定 ※1セッション
→ 成功 = /a/complete_published ＋「公開申請が完了しました」→ カタログへ submitted 書き戻し → commit
→ 審査（原則24h）結果はメール → status flip（§4）
```

## 4. 審査後運用

- **通過**: status を `listed` へ・`listedAt` 記録（手動 flip・brain-operator）。外部導線（note入口記事の公開・/links 掲載・**記事内 CTA**）はこの時点から（`listedBrainProducts()` が status=listed のみ描画＝submitted 中は自動非表示）。**サイト内動線（記事内 CTA）**: `/links` に加え、高適合記事の末尾に Brain キットを文脈 CTA として出す。配線 SoT は `src/lib/offsite-cta.ts`（`brain-civil-essay-kit`→施工経験記述記事／`brain-sokan-policy-bank`→総監 essay・二次記事）、描画は `OffsiteCta`、クリックは `data-cta="brain"`（AnalyticsProvider）。UTM 非付与。
- **却下**: status を `rejected`・指摘を listings へ反映 → `--force-resubmit` で再申請。
- **本文（LP）変更**: `brain-publish` は既定で既存本文を保持（>50字なら挿入スキップ＝二重挿入防止）。差し替えは **`--replace-body`**（既存を Meta+A→Backspace で**2回**全消去→再挿入・クリア後 text>50字 or img>0 なら ABORT＝画像ノード残りの保険）。本文変更も**再審査**に入る。SoT は `.claude/config/brain-listings.json` の bodyText（価格直書き禁止・配布URLは有料ラインより後）。2026-07-23 に両商品 LP を売れ筋の型（価値3点先出し/共感/数え上げ/3ステップ/FAQ・claims-policy 準拠）へ改稿し `--replace-body --set-category 資格` で再申請。
- **本文への図版挿入**: `brain-publish --insert-figures <json>`（`[{after:"段落に含む文字列", image:"ROOT相対パス"}]`）で本文挿入後に段落直後へ画像を入れる。挿入ロジックは `scripts/lib/brain-figures.mjs`（段落にカーソル→行の「＋」`_addContentButton_`→メニュー「画像」→隠し `input[type=file][accept=image]`）。**重複の罠**: Brain は 一時保存前でも画像アップロードを保持するため、挿入をやり直すと前回分が残り重複する→**必ず `--replace-body` と併用**しクリーン本文へ1回だけ挿入する（`--replace-body` の img>0 ABORT がこの残留を検出）。図版は `.claude/config/brain/assets/figures/*.png`（SVG源＋sharp PNG）。単体実行は `scripts/brain-insert-figures.mjs`（同 lib・下書き保存まで）。
- **カテゴリ変更**: Brain はカテゴリを**申請時設定**として扱う（in-place 編集不可）＝変更は販売設定→有料エリア→**再申請**を通り、公開中でも**再審査**に入る。自動化は `node scripts/brain-publish.mjs --service <id> --edit-url <editUrl> --commit --force-resubmit --set-category <label>`（販売設定ステップ 5b でカテゴリ v-select を選択）。**カテゴリ v-select は仮想リスト**＝候補は wheel スクロールで DOM 化してから click（§6）。実測の全候補（15・2026-07-23）: ビジネス / AI / SNS / 動画編集 / マーケティング / YouTube / デザイン / お金 / ライティング / 物販 / SEO・ブログ / プログラミング / 恋愛・人間関係 / 健康・食事・美容 / **資格**。Claude Code キットは初期「ビジネス」→ 2026-07-23 に両商品を「資格」へ再申請（審査待ち）。
- 売上記録: `/record-sales`（productId=`brain:<id>`・sales-recorder 台帳へ追加してから使う）。

## 5. 安全弁

1. **同意モーダル gate** — 審査ガイドライン等への同意はユーザー明示許可事項。brain-publish は `--agree` なしでは押さず ABORT（2026-07-22 の同意はユーザー許可済み＝account.json に記録）
2. **draft-first / --commit gate** — 既定は下書きまで。申請の最終確定は確認モーダルの表示価格が catalog.priceYen と一致した場合のみ
3. **商品実体なし公開の防止** — 本文に配布URLが無い／有料ラインより前にある場合は ABORT（check-brain-wiring でも commit を止める）
4. **二重申請防止** — カタログ submitted/listed は ABORT（`--force-resubmit` で解除）
5. **偽成功防止** — `/a/complete_published`＋「公開申請が完了しました」を確認するまで成功と報告しない
6. **誠実表現 Red Line** — 「予想的中」「必ず合格」を使わない。実績は「事前収録（公開日で検証可）」まで・外れ（本命外し）・K・統制テストの限界を本文で開示（各商品の claims-policy / backtest-validation 準拠）

## 6. Brain UI のクセ（2026-07-22 実測・selector 変更時はここを更新）

| 事象 | 対処（brain-publish 実装済み） |
|---|---|
| ヘッダ「記事を書く」が viewport 外で click 不能 | JS クリック（evaluate 内 `.click()`） |
| 初回「記事を書く」で審査ガイドライン同意モーダル | --agree gate（§5-1） |
| タイトル=textarea[placeholder*=タイトル]・本文=`.tiptap.ProseMirror` | 本文は行単位 `insertText`＋Enter（段落生成） |
| メイン画像必須（無いと販売設定に進めない） | input[type=file]#0 → トリミング「**適用**」必須（押さないと overlay がブロック） |
| **販売設定（価格等）はセッション状態＝保存されない** | --commit は価格〜申請を必ず1セッションで実行（未 submit なら何も保存されない＝カテゴリ選択の selector 検証は非破壊で可能） |
| カテゴリ＝Vuetify v-select の**仮想リスト**（表示中の項目のみ DOM 化）。スクロール前の抽出は途中で切れる（12件で誤って全件と誤認した事故） | 開いた後、`.v-overlay-container .v-list` を wheel スクロールしながら目的ラベルが DOM 化されるまで探索→`.v-list-item` 厳密一致で click→field 表示テキストで assert（`--set-category` 実装） |
| 有料ライン UI=段落間の「ラインをこの場所に変更」（非 button 要素）・現在位置は「有料ライン〜」prefix | innermost＋compareDocumentPosition で marker 直前をクリック。**assert は body.innerText（可視テキスト）**＝各コントロールに非表示代替ラベルがあり DOM 検査は誤検知（activeCount 53 事故） |
| 公開申請は確認モーダル2段（販売設定サマリ表示） | モーダル内の価格を assert してから最終「公開申請する」 |
| ログイン待ち中の evaluate が navigation で落ちる | waitForLogin は try/catch polling |

## 7. 整合ゲート

`npm run check-brain-wiring`（pre-commit にも staged 限定で組込み）: catalog↔listings↔dist 実在↔配布URL位置↔価格直書き禁止↔submitted/listed の URL 必須。新商品追加時はこのゲートが配線漏れを止める。
