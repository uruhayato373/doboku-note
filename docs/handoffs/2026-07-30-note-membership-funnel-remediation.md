# 土木メンバーシップ「合格ラボ」訴求・加入導線 改善 作業ログ（2026-07-30）

作業票: `.claude/plans/civil-note-membership-funnel-remediation-2026-07-30.md`（真実源）

## 1. サイト側で変更した内容

- `src/lib/note-magazines.ts`: `civil-membership-lab` を `published: false`／`noteUrl: ''` → **`published: true`／`noteUrl: 'https://note.com/dobokunote/membership/join'`**。title/description/price/badge/CTA文言は不変。周辺コメントを公開済み現在形へ。
- `src/app/docs/[...slug]/page.tsx`: 本文中間CTAゲート `midEligibleGroup` に **土木の secondary だけ**を追加（`isCivilSecondary` = civil-construction-1/2 かつ docGroup=secondary）。既存の H2≥5・本文≥8000字ゲート、同一商品重複防止は維持。
- `src/lib/magazine-placement.ts`: 土木二次系7ブランチ（1/2級 secondary-r0X・experience-writing guide/examples・2級 getting-started・1級 secondary catch-all・1級 last-minute）で `top`=買い切りを維持し、`inline[0]` を `civil-membership-lab` に切替（本文中間CTAに会員を供給）。既存買い切りは削除せず inline 後方へ残置。primary は対象外。
- `tests/note-membership-funnel.test.mjs`（新規）: ①`civil-membership-lab` published:true＋加入URL ②6記事のCTAマーカー/加入URL各1件 ③説明記事本文に自己参照URL無し ④土木二次で top=買い切り・inline[0]=会員（esbuild で実 `resolvePlacement` を評価）。9 test / pass。

## 2. note ソース／ライブへ反映した内容

対象6記事に共通マーカー `<!-- cta:civil-membership-lab -->` ＋ 加入URL（単独行）を各1件追加。`note-update-body.mjs`（account=dobokunote assert・probe検証・通知いいえ）でライブ反映。

| 記事 | noteId | ライブ結果 |
|---|---|---|
| 土木もくじ | n4fde0f62dc20 | 会員セクションを「まず選ぶ1冊」直後・買い切り一覧より前へ移動＋旧TODOコメント削除。加入URLライブ（bodyLen 22027→22546） |
| 落ちる答案診断 | nd1c0e564ef10 | 「プロフィール/マガジン一覧から」を加入URLへ置換。無料branch・境界処理skip |
| 独学添削の限界 | nb9b9a20106f0 | 添削説明直後にCTA。空引用0（単一行blockquote健全） |
| 予想問題で書く練習 | n1a0cef1de78b | 予想/添削の箇条書き直後にCTA。無料branch |
| 1級二次まるごとパック | n824a4ea20acf | 「伴走・添削がほしい方へ」直後にCTA。会員限定(is_trial)につき `--trial-line-bottom`。パック購入CTA(md29…)可視維持、加入URL可視、bodyLen 7323→7826 |
| はじめに-合格ラボ | n6b66793ca20c | 末尾自己参照URL(n6b…)を加入URLへ置換。`--trial-line-bottom` で**無料プレビュー 0→約7,100字に復旧**（「なぜ独学だと」「2つのプラン」可視） |

- **note反映を阻む同一画像2枚問題**（note が同一画像の2枚目CDN確定に失敗＝確定1/2でABORT）を、土木もくじ・はじめに・まるごとパックの各末尾にあった**著者権威画像の重複（冒頭と同一src/キャプション）を1枚に整理**して解消。情報欠落なし（冒頭に同一画像が残存）。
- 更新通知は全件「いいえ」（または通知ダイアログ非出現＝通知なし）。フォロワー/会員へのスパム無し。

## 3. 実行した検証と結果

- ソース: `note-lint` 6/6 OK・`type-check` 0・`lint` 0・`audit-note-funnel`/`check-note-funnel` ドリフト0・`npm test` 244 pass/0 fail（新規9含む）・`check-doc-refs` ✓1204。
- `git diff --check`: note記事(.md)はCRLF規約（committed blobもCRLF・LF強制なし）由来のtrailing-whitespace報告のみ＝混在なし・pre-commitにwhitespace gateなし。
- ローカル実表示（dev 3020 + Playwright mobile390/desktop1440）: civil-1/2 secondary-r07・experience-writing-guide で**可視 加入アンカー各1件**、UTMベース=/membership/join、top=買い切り（1級=まるごとパック landing／2級=想定工事バンク m8554）＝会員CTAと別商品・資格非混線。career記事=0。guide-strategy=0（本文中間CTAの文字数ゲート未達＝既存挙動）。
- noteライブ（公開API v3・非ログイン）: 6記事すべて加入URL LIVE。はじめに=プレビュー0→7103字。まるごと=パック購入CTA可視・bodyLen 7826。
- 加入ページ `note.com/dobokunote/membership/join`: HTTP200・通年¥1,480/添削つき¥2,980の2プラン・参加ボタン維持（非ログイン実査）。

## 4. 未実施・承認待ち・残件

- **新規会員記事の公開・特典マガジン収録**: 未着手（既存会員への配信を伴うため**ユーザー明示承認が別途必要**＝作業票§10）。W1予想問題・添削事例の公開は承認待ち。「継続価値の公開実績は未着手」。
- **完成答案ライブラリの会員特典マガジン収録（会員特典化＝入会の引き金）**: 完了済み（運営者確認 2026-07-30）。
- **添削実測**（1本30分以内→定員/価格確定）・**フロー在庫8週分**・**週次ドリップ配信**: ユーザー作業律速で未起動。
- **公開中プランの設定保存が即時ライブ反映か**: 未検証（`note-membership-plan-edit` は実行せず。エージェント文書へ安全条件明記）。
- 価格/プラン名/定員/買い切り販売状態/有料境界/PDF添付は不変。

## 5. コミット・デプロイ（2026-07-30 実施）

ユーザー承認のうえ develop へコミット → main へ fast-forward → Cloudflare Pages へデプロイ。
- コミット: `a6081daa68`（feat・実装17ファイル）／`d95e4dfd37`（docs・作業票/プロンプト/実装計画3ファイル）。
- develop→main は **fast-forward**（origin/main が develop の祖先・コンフリクトなし）。ローカルは main と develop のみ・両者 `d95e4dfd37`・origin と同期。
- デプロイ: GitHub Actions「Deploy to production (Cloudflare Pages)」run 30544209593 **conclusion success**（Build ✓ / Deploy ✓）。
- 本番検証: `doboku-note.pages.dev` / `doboku-note.com` HTTP 200・`<main>`。土木二次3ページ（1級/2級 secondary-r07・experience-writing-guide）で会員CTA（membership/join・ctaCatch）反映を実査。career記事0。※デプロイ直後の初回はエッジキャッシュ残存で0→revalidate 後にベースURLでも反映確認。

## 運用文書同期（Phase 6）

`noteコンテンツ計画.md §5.3`／`メンバーシップ/README.md`／`note-membership-operator.md`（description不変・本文のみ）／`docs/todo/backlog.md`／`12_コンテンツ拡充優先順位`（`published:false` 陳腐化を是正）を公開済み状態へ更新。`/doc-sync` 相当（diff×候補doc突合）実施・must-fix 1件適用。
