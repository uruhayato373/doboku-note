---
name: note-membership-publish
description: note会員限定公開の仕様と自動化。記事タイプとは別軸/ライン無し=全文会員限定/is_limitedで検証。プラン会費は変更手段なし
metadata: 
  node_type: memory
  type: reference
  originSessionId: 3eb21251-81a9-4e07-a68d-1c19d8aff9d9
  modified: 2026-08-05T21:55:51.541Z
---

**note の会員限定公開は「記事タイプ(無料/有料)」とは別軸**（2026-08-06 実機確定）。公開設定の `記事の追加 → メンバーシップ` タブで「メンバー全員に公開」か「プラン限定公開（プラン別）」を選ぶ。`notePricing: membership` を isPaid=false のまま素通りさせると**全員に無料公開**される。

**フローの罠**: 公開範囲を選ぶと一次ボタンが「投稿する」→**「試し読みエリアを設定」**に差し替わる。この画面を開かないと投稿できない。note の文言どおり「**ラインを設定しない場合は購入・購読した人だけが読める記事になります**」＝ラインを引かなければ全文が会員限定（会員特典はこれが既定）。

**検証は public API の `is_limited`**（直接シグナル）。`isUnmeasurable`（body空＋タグ空）の間接推定より確か。`scripts/lib/note-live-check.mjs` が `isLimited` として返す。

**実装（2026-08-06）**: `note-publish.mjs` が `notePricing: membership` を解する。押下後のボタンが「追加済/削除」に変わらなければ**公開しない**（fail-closed）。公開後 `[13m]` で `is_limited` を検証し、読めてしまえば exit 5。`--membership-plan "<プラン名>"` でプラン限定も可。`--use-draft` / frontmatter `noteDraftId` で既存下書きを再利用（旧実装は `/new` で作り直し、元の下書きが孤児化していた）。

**特典マガジン**: `note-magazine-create --free` で無料マガジンを作り（無料フォームは価格/アピール/カテゴリ欄が無く説明欄の placeholder も異なる）、`note-membership-plan-edit --benefit-magazine "<タイトル部分一致>"` でプランへ紐付ける。

**プランの会費・人数制限は一度設定すると変更できない**: 静的テキスト描画になり入力欄も編集ボタンも消え、**運営者が UI から直すこともできない**。`--price` は黙って skip するので「変えたつもり」に注意。**新規作成直後のプランにだけ `input[name=price]` があり、そこで入れた値が確定値**＝会費変更は作り直しが唯一の手段。

**作り直しの手順（2026-08-06 実証）**: 事故回避のため**新プランを作って公開してから旧プランを削除**する（逆だと作成失敗時にプランが消えたまま残る）。`note-membership-plan-create`（作成フォームは名前と説明のみ・新 planId は一覧の差分で特定）→ `note-membership-plan-edit --price --limit --benefit-magazine` → `note-membership-plan-status --publish`（manage の行トグル・可逆）→ 旧を `--delete`（**在籍者0名を assert**・削除ダイアログは**プラン名の入力**を求める二段確認・復元不可）。

**「参加特典の表示」は手入力しない**: 特典マガジンを紐付けると一覧が自動生成される。手入力欄は**5件で上限**に達し disabled になるので、マガジン名を手で並べようとすると6件目で詰まる。

関連: [[note-publish-price-field]]（`notePricing: membership` は扱わない、という旧記述はここで失効）

**2026-09-23 事故と対策**: メンバーシップ特典マガジンに入った**無料**記事（コンクリート主任技士 ペルソナ選択ガイド）を note-update-body で全文更新 → 試し読み画面でラインを引かずに進み**全文会員限定**になった（公開後 API 検証は unmeasurable を OK 扱いで素通り）。`--trial-line-bottom` で復旧。PR #588 で、無料記事は `--trial-line-bottom` か `--keep-member-lock` が無いと中断・公開後 is_limited なら FAIL に。9/23 実測で無料設定×会員限定は 8 本（まるごとパック入口 LP 3 本が本文 0 字＝要判断・DN-0275）。
