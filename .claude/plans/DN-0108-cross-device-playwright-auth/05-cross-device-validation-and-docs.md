---
taskId: DN-0108
phase: 05
title: Windows・Mac実機検証と運用SSOT同期
---

# Phase 05: Windows・Mac実機検証と運用SSOT同期

## 目的

同じコードをWindowsとMacで使用し、認証データを共有せずに各PCのセッションが再利用できることを証明する。会社PCのproxy制約とMacの既存運用を両方記録し、未検証をPASS扱いしない。

## 前提

- Phase 01〜04のoffline gateが全PASS。
- WindowsとMacが同じcommit候補をcheckoutしている。
- 各PCで`DOBOKU_AUTH_ROOT`またはOS標準rootが別々のローカルpathへ解決する。
- profile directoryをOneDrive/iCloud/Dropbox配下に置かない。
- 初回login、2FA、CAPTCHAはユーザーが操作する。
- 公開・投稿・価格変更・申請・購入は行わない。

## Windows検証

### 1. path/doctor

```text
npm run auth:paths -- --json
npm run auth:doctor -- --json
```

確認事項:

- `%LOCALAPPDATA%`配下へ解決する。
- repository/worktree/OneDrive配下でない。
- legacy `.local`がある場合は警告される。
- proxy credentials、Cookie、tokenが出力されない。

### 2. note pilot

1. `npm run auth:login -- --service note`を実行。
2. 人がlogin/2FAを完了。
3. account assert成功後に正常close。
4. 別プロセスで`npm run auth:status -- --service note`。
5. Chromeを再起動し、もう一度status。

2回とも期待アカウントでauthenticatedならpilot PASS。profile存在だけ、login画面、unknownはPASSでない。

### 3. 利用頻度順のstatus

外部変更を伴わない範囲で、Brain、ココナラ、Google、X、Instagram、KDP、A8の順に確認する。未利用サービスは`not tested`と記録する。A8はstate再注入、afbはsame-process制約を別枠で確認する。

### 4. proxy確認

- 既存のsystem Chrome/proxy設定で到達できるか。
- SSL/proxy失敗をexpiredと誤分類しないか。
- proxy資格情報がログへ出ないか。

## Mac検証

Windows profileをコピーせず、同じ手順をMacで実行する。

確認事項:

- `~/Library/Application Support/doboku-note/playwright-auth`へ解決する。
- 旧`/Users/minamidaisuke/doboku-note/.local`が検出されても自動移動されない。
- note pilotでlogin→別プロセスstatus→Chrome再起動後statusがPASS。
- X / Instagramの旧Mac絶対パスなしで同一profileを再利用できる。
- 本体checkout・worktreeのどちらから起動しても同じauth rootへ解決する。

## legacy移行

各PCで別々に行う。

1. `auth:migrate -- --service <id>`でdry-run。
2. source/target/size/lock/target空をユーザーが確認。
3. profileを使用するChromeが閉じていることを確認。
4. ユーザー明示承認後だけ`--commit`。
5. 新rootでstatus確認。
6. 旧sourceは自動削除せず、一定期間後に人が処遇を判断。

全サービス一括`--commit`は禁止。note pilot後、サービス単位で進める。

## 証拠の保存

リポジトリへ保存してよいのは、次のsecret-free結果だけ。

- OS、service、結果分類、確認日時、script version
- pathがOS標準領域かどうかのboolean
- account assertが一致したかのboolean
- proxy/CAPTCHA/selector等の原因分類

保存してはいけないもの:

- Cookie、state JSON、profile内容
- ログイン画面のメールアドレス・氏名・通知
- token付きURL
- 2FA、recovery code、password
- profileのzipやスクリーンショット一式

## 文書更新

- `.claude/knowledge/reference/playwright-auth-profiles.md`
- `.claude/knowledge/reference/measurement-incidents.md`（proxy・外部取得の恒久ルールに追加が必要な場合のみ）
- 関連skill/agentのprofile path説明
- `AGENTS.md`の頻用コマンドへ`auth:doctor`等を追加する場合は最小限
- `.gitignore`コメントを新構成に同期

旧Mac絶対パス、worktree本体固定、`DOBOKU_PROFILE_ROOT`を正とする説明を削除・更新する。A8/afb/Gmailの例外は残す。

## 最終検証

```text
npm run check-playwright-auth-wiring:strict
npm run auth:doctor -- --json
node --test tests/playwright-auth-profile.test.mjs tests/playwright-auth-lock.test.mjs tests/playwright-auth-cli.test.mjs
npm run check-affiliate-wiring
npm run check-google-ui-ssot
npm run check-doc-refs
npm run check-information-architecture
npm run lint
npm run type-check
git diff --check
git status --short
```

## 完了判定表

| 項目 | Windows | Mac | 完了条件 |
|---|---|---|---|
| OS標準root | 必須 | 必須 | 両方PASS |
| note別プロセス再利用 | 必須 | 必須 | 両方PASS |
| worktree非依存 | 必須 | 必須 | 両方PASS |
| proxy分類 | 必須 | 該当時 | Windowsで誤判定0 |
| X/Instagram | 利用可能なら | 必須 | Mac旧絶対パス0 |
| A8 state再注入 | 利用可能なら | 利用可能なら | 少なくとも1環境で確認、他は未検証明記 |
| afb same-process | 設計確認 | 設計確認 | 別プロセスPASSを捏造しない |

Windowsだけ、Macだけ、profile存在だけでは完了にしない。

## Claude Code実行プロンプト

```text
DN-0108 Phase 05を実行してください。
まずoffline gateをすべて通し、Windows検証はユーザーへlogin操作を依頼する直前で停止してください。
外部変更はread-only statusだけに限定し、公開・投稿・申請・価格変更をしないでください。

Windowsのsecret-free結果を記録した後、同じcommit候補をMacへ同期する手順を提示して停止してください。
MacではWindows profileをコピーせず、Macローカルrootで独立login/statusを確認してください。

両PCのnote再利用、worktree非依存、proxy分類、Mac絶対パス0が揃うまで完了扱いしないでください。
最後にSSOTを同期し、検証表をPASS/FAIL/NOT_TESTEDで報告してください。
push、deploy、外部公開、profileのクラウド同期は行わないでください。
```
