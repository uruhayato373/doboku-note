---
taskId: DN-0108
phase: 02
title: note・Brain・ココナラ・KDPの共通resolver移行
---

# Phase 02: note・Brain・ココナラ・KDPの共通resolver移行

## 目的

中核4サービスのprofile保存先をrepository/worktree相対から共通resolverへ移す。ブラウザ起動オプション、selector、アカウントassert、dry-run/commit gateは変更しない。

## 変更対象

### 共通session lib

- `scripts/lib/brain-session.mjs`
- `scripts/lib/coconala-session.mjs`
- 必要なら新規`scripts/lib/note-session.mjs`
- 必要なら新規`scripts/lib/kdp-session.mjs`

### note

次の検索で得られる全runtime fileを対象にする。

```text
rg -l "playwright-note-profile|launchPersistentContext" scripts/note-*.mjs scripts/check-note-*.mjs
```

少なくとも次を含む。

- `scripts/note-edit-session.mjs`
- `scripts/note-publish.mjs`
- `scripts/note-publish-discover.mjs`
- `scripts/note-account-name.mjs`
- `scripts/note-edit-magazine.mjs`
- `scripts/note-magazine-create.mjs`
- `scripts/note-magazine-add-articles.mjs`
- `scripts/note-magazine-cover.mjs`
- `scripts/note-membership-plan-*.mjs`
- `scripts/note-attach-file.mjs`
- `scripts/note-update-*.mjs`
- `scripts/note-sync-tags.mjs`
- `scripts/note-comment-reply.mjs`
- `scripts/note-append-*.mjs`
- `scripts/check-note-attachments.mjs`
- `scripts/check-note-membership.mjs`

列挙に無いファイルも検索結果に含まれれば対象。逆にprofileを使わない純粋変換scriptへ不要なimportを足さない。

### Brain

- `scripts/lib/brain-session.mjs`を利用する全consumer
- `scripts/brain-publish.mjs`等の直接profile参照があれば同時修正

### ココナラ

- `scripts/lib/coconala-session.mjs`
- `scripts/coconala-rate-buyer.mjs`
- `scripts/coconala-research.mjs`
- `scripts/scout-coconala-blogs.mjs`
- `scripts/scout-coconala-competitors.mjs`
- その他`playwright-coconala-profile`直書き

CIの競合調査用temporary profileは永続認証profileではない。用途を確認し、無理に`DOBOKU_AUTH_ROOT`へ寄せない。

### KDP

- `scripts/kdp-publish.mjs`
- `scripts/kdp-report.mjs`
- `scripts/kdp-batch.mjs`
- その他`playwright-kdp-profile`直書き

## 実装規則

1. profile pathだけをresolverへ置換し、`channel: 'chrome'`、viewport、proxy、download、selectorを変更しない。
2. 既存export `PROFILE`をconsumerが使っている場合は互換exportを維持してよい。ただし値はresolver由来にする。
3. noteの多数のscriptは、共通`NOTE_PROFILE`取得だけをlibへ集約する。無理にブラウザ操作全体を同時refactorしない。
4. `DOBOKU_AUTH_ROOT`未設定でもOS標準rootへ解決する。
5. 旧`<repo>/.local`にprofileがある場合、勝手にcopy/move/deleteしない。doctor対象として残す。
6. ログに出すのはservice IDとredacted pathだけ。Cookie DBやstate JSONを読んで表示しない。
7. account assertを削除・弱化しない。
8. file uploadや公開処理は実行しない。

## 互換性テスト

- 各主要scriptをimportしてもdirectoryが作られない。
- temporary `DOBOKU_AUTH_ROOT`で各`PROFILE`が期待service directoryへ解決する。
- `--help`またはdry-runがあるscriptは外部操作前に正常終了する。
- account assert config pathが移行前後で同じ。
- note/Brain/coconala/KDPのlaunch optionsをsnapshotまたは差分レビューし、path以外の意図しない変更が0。
- source scanで4サービスの`.local/playwright-*-profile`runtime直書きが0。

## 検証コマンド

```text
node --test tests/playwright-auth-profile.test.mjs
npm run check-playwright-auth-wiring
npm run lint
npm run type-check
npm run check-note-wiring
npm run check-brain-wiring
npm run check-coconala-wiring
git diff --check
```

存在しないpackage scriptを推測して実行しない。`package.json`を確認し、該当する既存gate名を使う。外部アクセスを伴うコマンドはこのPhaseでは実行しない。

## 受入条件

- note / Brain / ココナラ / KDPのruntime profile直書き0。
- resolver import漏れ0。
- path以外のブラウザ動作変更0。
- 既存dry-run/account assert/commit gate維持。
- 実profile、state、外部サイトへのアクセス0で検証完了。

## Claude Code実行プロンプト

```text
DN-0108 Phase 02だけを実装してください。Phase 01がPASS済みであることを確認し、
00-masterと02-core-service-migration.mdの対象だけを変更してください。

note、Brain、ココナラ、KDPのprofile pathを共通resolverへ移してください。
selector、browser option、公開処理、account assert、dry-run/commit gateは変更しないでください。
旧profileをcopy/move/deleteせず、外部サイトへログイン・公開しないでください。

検索で全直書きを棚卸しし、指定gateを実行してください。
変更ファイル、サービス別の置換件数、残存違反、検証結果を報告して停止してください。
```
