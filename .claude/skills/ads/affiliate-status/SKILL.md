---
name: affiliate-status
description: >
  A8 / もしも / afb の提携状態をカタログと最終照合日から読み取り専用で報告する（取得できなかった ASP は「提携なし」でなく unknown）。Use when user says "アフィリ提携状況", "提携状態を確認", "affiliate-status".
disable-model-invocation: true
argument-hint: "[--asp a8|moshimo|afb]"
domain: affiliate
---

> [!important] 「提携なし」と「確認できなかった」は別
> ログイン失敗・回線タイムアウト・サイト帰属 NG で取得できなかった ASP は
> **判定不能**として報告する。`status: none`（未提携と確認した）と `unknown`（調べていない）は
> カタログの語彙として分かれているので、埋めるときにこの区別を潰さない。

## 何をするか（セッション）

`data/affiliate/catalog.json`（自社がどの案件をどの ASP で運用するか）と、ASP ごとの最終照合日
（`verifiedAt`・`verificationScope`）を読み、報告する。**セッションではログインせず、ブラウザを開かない**
（`affiliate-status.mjs` はログインが要る収集 script で、エージェントのセッションでは動かない）。

1. `verifiedAt` を ASP ごとに報告の冒頭に書く。古い、または空の ASP は **「未確認」** と書く（数値や提携状態を推測で埋めない）
2. 実機との突合が要るときは、運営者が端末で次を実行する:

```bash
npm run affiliate:status                 # 実機と突合して報告のみ
npm run affiliate:status -- --asp moshimo  # 1 ASP だけ（afb は毎回ログインが要るので分けたいとき）
npm run affiliate:status -- --write      # 実機の値でカタログを更新
```

3. `npm run check-affiliate-wiring` で配線の穴（`placement=active` なのに mat が無い等）は、記録だけで見られる

## 前提（運営者が実機照合するとき）

- 運営者の Mac のログイン済みプロファイルが要る。CI では動かない。切れていたら `npm run auth:login -- --service a8|moshimo|afb`
- **ログインは人間**。スクリプトは待つだけで認証情報を扱わない
- **afb はセッションを別プロセスに持ち越せない**ため毎回ログインが要る。かつ headless 不可・
  1 ページ 1〜1.5 分かかることがある（`timeoutMs` 90 秒）

## 手順（実機照合の結果を受けたとき）

1. 出力の **SID / 口座 ID** を確認する。報告には必ずこれを添える
   （「どのサイトのデータか」を示さない報告は信用できない）
2. ドリフトが出たら、**カタログが古いのか実機が変わったのか**を判断する
   - 実機が正（申請が承認された等）→ 運営者が `-- --write` で反映
   - カタログの意図が正（誤って stats47 で提携した等）→ 実機を直す提案をする
3. 変更したらカタログを commit する

## 出力の読み方

```
取得できなかった ASP（判定不能・「提携なし」ではない）:
  - afb: サイト帰属 NG: サイト ID 不一致: 期待 984453 / 実際 959426
ドリフト 1 件:
  - kensetsu-career-plus / moshimo: カタログ "applying" ↔ 実機 "approved"（id=5665）
```

サイト帰属 NG が出たら**それは成功の一種**（stats47 のデータを読む前に止まった）。
迂回せず、切替が効かない原因を調べる。

## 関連

- 運用 SSOT: `.claude/knowledge/reference/affiliate-operations.md`
- 申請: `/affiliate-apply`
- A8 の成果取込: `/a8-report` ／ A8 の案件開拓: `/scout-asp`（守備範囲が直交）
