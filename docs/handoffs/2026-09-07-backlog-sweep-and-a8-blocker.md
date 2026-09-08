# バックログ 16→11 の消化と、A8 が会社PCで詰む理由 — 引き継ぎ

作成 2026-09-07（会社PC・Windows）/ develop = `ba3bbdd9`

> [!note] このファイルの寿命
> 下の「別端末で続きがある作業」が片付いたら本書は削除する（記録は git 履歴と各正典が持つ）。
> 完了サマリを足して残さない（[information-architecture.md](../../.claude/knowledge/reference/information-architecture.md) の handoff ライフサイクル）。

## 1. 別端末で続きがある作業（ここだけが引き継ぎの本体）

### A8 成果の取り込み（DN-0120）— **会社PCでは1手も進まない**

詰まりは認証ではなく**経路**。会社プロキシが A8 管理ドメインへのトンネルを張らせない。

| 経路 | 実測（2026-09-07） |
|---|---|
| `curl -v https://www.a8.net/` | `HTTP/1.0 200 Connection established` |
| `curl -v https://management.af8.jp/` | **`Proxy CONNECT aborted`** |
| アプリ内ブラウザ | `a8.net is blocked by policy` |
| `auth:login --service a8` | `net::ERR_EMPTY_RESPONSE` |

**Mac でやること**: `/a8-report`（ログインと CAPTCHA だけ人・以降は自動）。取り込みが済んだら
正規化〜EPC 比較〜(1)継続 /(2)露出を絞る /(3)撤退 の判断材料づくりは会社PCでも回せる。

前提はすでに揃っている: `check-a8-report-due` は **DUE**（前回 8/4・33日前）、EPC の分母になる
GA4 by-label クリックは 9/4 取得ぶんが手元にある。恒久ルールは
[measurement-incidents.md](../../.claude/knowledge/reference/measurement-incidents.md) の
「2026-09-07 — A8 管理画面は会社プロキシが CONNECT ごと拒否する」へ書いた。

### note 保存前ゲートの live 実挙動（未証明）

価格変更・境界再設定に「添付が期待を下回れば保存しない」ゲートを入れたが、**次に実際の価格変更を
回すまで実挙動は証明されない**。今日は note へ一切書き込んでいない（live は read-only の実査と status だけ）。
次に `note-article-price-sweep --commit` を回す人は、`[attach] 保存前の添付 N/N を確認` が出ることと、
`.claude/state/note-attachment-loss.json` の `pending` が増えていないことを見る。

### 認証プロファイルの再ログイン（必要になったサービスだけ）

Windows へ移行した 10 サービスのうち、いま `authenticated` は note と coconala だけ。
brain / kdp / x / instagram / google / a8 / moshimo は `expired`（＝次に使うとき人がログインする）。
afb は設計どおり別プロセス `status` 非対応。一覧と判定の読み方は
[playwright-auth-profiles.md](../../.claude/knowledge/reference/playwright-auth-profiles.md)。

旧 `.local/playwright-*-profile`（約 3.1GB）は**残してある**。新 root の再利用をしばらく確認してから
人が処遇を決める。

## 2. 未解決の食い違い

**管理画面のバックログ件数**: 運営者は「52件」と見たが、こちらで確認できたのはすべて 11 件だった
（`/todo` の表示・`backlog.md` の `###` カード数・`backlog-sweep-pick`）。週間3・月間7・年間7、
スケジュールの TODO 4、実装計画 1、文書 78 のどれも 52 にならない。**どの画面の数字か未特定**。
次にこの話が出たら、画面名かスクリーンショットを先に確認する。

## 3. 今日入れた判断（覆せるように書き残す）

**DN-0179 を「完了」として削除した**のは私の判断。総監 747 本のうち 387 本には白書・法令・規格の
ID を付けたが、残り 360 本の参考資料は Wikipedia・民間解説・省庁の個別ページで、逐語も図も
再利用しない。台帳は公開可否を管理するものなので対象外と整理し、その線引きを
[reference-sources-policy.md](../../.claude/knowledge/reference/reference-sources-policy.md) §1-2 へ書いた。
「全記事に何か付けるべき」という意図だったなら、この節ごと見直す。

## 4. 今日閉じたもの（詳細は git 履歴と各正典）

| カード | 出口 |
|---|---|
| DN-0108 | Playwright 認証の Windows 実機検証（10サービス移行・note は別プロセス3回とも authenticated） |
| DN-0176 | 添付実査の偽陰性。全件走査で 1 件再現し確定パスが解消、確定不足 0 |
| DN-0177 | 価格変更・境界再設定に保存前ゲート＋負債記録 |
| DN-0182 | 白書 26 種を台帳へ登録し、白書由来 60 本の付与率 0/60 → 60/60 |
| DN-0179 | 法令等 74 件を登録し 530 本へ結線。参照 92 → 1457 / 未付与 baseline 329 → 167 |

ついでに直した既存赤: Windows で構造的に必ず落ちる lock テスト、2026-09-06 から develop で
連続失敗していた `content-quality-ratchet`。

## 5. 横断して見つかった型（次も踏む）

コードでも自分の確認作業でも、**否定側（不足・未ログイン）を1回の観測で確定する**形が繰り返し嘘を生んだ。
添付実査の `live=0`、20分の走査を1.5秒で止めた account gate、`auth:status` の単発判定
（note は4回目＝約6秒で marker が出る）、URL redirect しか見ていないログアウト判定。
すべて「決着した分類は即返し、未決着のときだけ待ち直す」に直した。詳細は memory の
`feedback_gate_zero_coverage_false_pass`（5つ目の型）。
