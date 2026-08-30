---
name: note-membership
description: >
  note メンバーシップ「土木セコカン合格ラボ」の会員限定記事配信、特典マガジン収録、
  プラン設定と公開状態の実体検証を note-membership-operator で安全に実行する。
  Use when user asks to [メンバーシップ運用, 会員特典記事を配信, 予想問題ドリップ,
  特典マガジン収録, 会員プラン設定編集, membership 投稿編集, /note-membership].
disable-model-invocation: true
user-invocable: true
argument-hint: "[publish <article.md> | status | plan <planId>] [--commit]"
---

# note-membership

note メンバーシップ「土木セコカン合格ラボ」の運用入口。判断と実行は
`note-membership-operator` に委ね、既存の実証済みスクリプトだけを組み合わせる。

## フロー

`配信カレンダー確認 → 会員限定公開 → 必要な場合だけ特典マガジン収録 → note API 検証 → SoT 反映`

## 前提と真実源

- ローカル実行限定。`.local/playwright-note-profile` の note ログインが必要。
- 配信順・公開予定日: `content/note/1級・2級土木/メンバーシップ/README.md`
- 商品設計・会員の一線: `content/note/1級・2級土木/noteコンテンツ計画.md`
- プラン機械SSOT: `.claude/config/note-membership.json`
- 公開商品SSOT: `src/lib/note-magazines.ts`
- 実行責務: `.claude/agents/note-membership-operator.md`

## 安全弁

1. 実行前に `account=dobokunote` を assert。不一致なら1件も触らない。
2. 既定は draft / dry-run。実公開・実収録・設定保存はユーザー明示の `--commit` がある場合だけ。
3. `notePricing: membership` は公開範囲を選択できた場合だけ公開する。選択不能時は全員公開せず停止。
4. 公開後は note API で `status=published` かつ `is_limited=true` を確認する。
5. 経験記述の週次お題だけを特典マガジンへ収録する。学科記述予想と添削練習は、専用マガジンが無い限り会員限定の単独記事として配信する。
6. FLOW（月例予想・週次添削・締切伴走）を買い切り商品へ収録しない。
7. プラン削除は不可逆。在籍者0名 assert とユーザーの明示許可なしに実行しない。

## 会員記事の配信

1. `README.md` の配信カレンダーから期限到来した最古の未配信記事を特定する。
2. frontmatter が `notePricing: membership` / `membershipOnly: true` であることを確認する。
3. `npm run note-lint -- <article-dir>` を通す。
4. 下書き確認:

   ```bash
   node scripts/note-publish.mjs --article <article.md>
   ```

5. ユーザーが実公開を明示した場合:

   ```bash
   node scripts/note-publish.mjs --article <article.md> --commit
   ```

6. 経験記述の週次お題であれば、公開後に `note-magazine-add-articles.mjs` を dry-run → `--commit` で特典マガジンへ追加する。学科記述予想・添削練習は単独配信のままにする。
7. note API と `npm run check-membership-drip` で公開状態を再確認する。

## プラン操作

- 状態照合: `npm run check-note-membership`
- 設定読取: `node scripts/note-membership-plan-edit.mjs --plan <planId>`
- 設定保存: `node scripts/note-membership-plan-edit.mjs --plan <planId> ... --commit`
- 公開状態: `node scripts/note-membership-plan-status.mjs --plan <planId> --publish|--unpublish [--commit]`
- 新規作成: `node scripts/note-membership-plan-create.mjs [--commit]`

会費・人数制限は note 側で公開後に直接変更できない場合がある。変更はプラン作り直しを含むため、
`.claude/agents/note-membership-operator.md` の手順と実機確認を必ず優先する。

## 完了条件

- 対象記事が note API で `published` / `is_limited=true`。
- frontmatter の `noteUrl` / `noteId` / `notePublishedAt` / `noteStatus` が実体と一致。
- 週次お題は特典マガジン収録済み。単独配信記事は虚偽の `noteMagazine` を持たない。
- `npm run check-membership-drip` と `npm run check-note-membership` が通る。

