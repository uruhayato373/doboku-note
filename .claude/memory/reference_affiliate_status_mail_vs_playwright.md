---
name: affiliate-status-mail-vs-playwright
description: アフィリ提携状況の確認は mail(Gmail)と Playwright(/affiliate-status)で二経路。各罠と使い分け
metadata: 
  node_type: memory
  type: reference
  originSessionId: dfc55d86-c73c-4601-af9e-ea828e791fda
---

アフィリ提携状況は **Gmail MCP（メール）** と **`/affiliate-status`（Playwright 実機）** の二経路で確認できる。役割と罠:

**Gmail 経路（イベントログ・速報）**
- afb（`info@afi-b.com`「プロモーション提携申請の結果報告」）: **本文にサイト名明記**（`doboku-note` / `統計で見る都道府県`）。同一案件を2サイト申請すると2通に分かれる → サイト帰属が判別できる。
- もしも（`no-reply@personal.moshimo.com`「提携が承認/否認されました」）: snippet は宛名（個人名）だけだが、**承認メール本文に「●提携承認サイト： doboku-note」＋ `shop_site_id`** が入る。否認メールにサイト欄があるかは未確認。
- A8（`as-support@a8.net`）: **個別の提携承認/否認メールを送らない**（新着案内・規約改定・「申込み中解除のお知らせ」のみ。しかも解除通知の宛名は stats47）。→ **A8 の提携状態はメールで追えない。Playwright 必須**。
- 罠: メールにも §2 サイト帰属の罠が出る（A8 の宛名が「統計で見る都道府県 様」= stats47 のことがある）。

**Playwright 経路（現在状態スナップショット・サイト帰属 assert 込み）**
- `npm run affiliate:status`（read-only、`--write` でカタログ反映、`--asp a8|moshimo|afb`）。
- **3 ASP とも実行はローカル＋ログインは人間**（`openAsp` は未ログイン時 最大10分ブラウザで待つ→ハング）。afb は毎回ログイン、もしも/afb のプロファイルは未保存のことが多い。
- **セッション切れ時の false-none 事故（2026-08-03 実測）**: A8 保存セッション（7/20）が失効し `re-authentication?messageType=login_required` にリダイレクト。スクリプトはログイン待ちタイムアウト後に**未認証ページを読んで一覧0件→ approved 4件を「実機 none」と誤検出**した。SiteAttributionError は口座IDが取れると通ってしまうので防げない。**取得失敗時に `--write` するとカタログの approved→none を壊す**（read-only 既定に救われた）。→ 実機値を書くのは**ログインして一覧が正しく取れたときだけ**。0件/極端に少ない緑は故障を疑う（[[verify-your-excuses]] と同型）。

**Playwright MCP で手動照合する時の実務（2026-08-03 実施・全ASP zero-drift 確認）**
- ログインは各 ASP で人間（別ブラウザなので毎回要る）。ログイン後は agent が読み取れる。
- A8: サイト切替なし。口座 `a25050375786` を assert（ヘッダーのサイト名は常に stats47 表示で正常）。提携中 `/program/list/partnered?pageSize=100`、programId `s0000...` を本文＋href から拾い catalog の id と突合。
- もしも: URL に `shop_site_id=672381`。一覧より**各プロモの詳細ページ**が確実＝`/af/shop/promotion/detail?promotion_id=N&shop_site_id=672381` のタイトル直下バッジ（成果XXXX円 の次行）が「提携中/申請中」。**ステータス凡例やサイドバーのフィルタタブ（申請中/提携中/否認中）を全文検索で拾うと誤判定**。`limit=100` は空リスト化するので `limit=10` でページング。
- afb: 既定 SID `959426`=stats47。**doboku-note SID `984453` へ切替必須**（切替前 stats47 提携37件／切替後 doboku-note は2件だけ＝取り違えると35件誤認）。切替は Chosen（`#top_site_select_chzn`）を実クリック→ doboku-note 項目クリックで**ラベルは変わるが自動 submit されない**（native `select[name=partner_site_id]` に onchange 無し）。**`select.form.submit()` で POST 送信して初めて本文 SID が 984453 に変わる**（リロード〜1分待つ）。判定は本文の `【SID】` と `【PID:N】`。→ 既存 `switchChosenSite` に form.submit フォールバックを足すと堅牢。

使い分け: メール=「いつ何が承認/否認されたか」、Playwright=「今どのサイトで何が提携中か」の確定値。SSOT → `.claude/knowledge/reference/affiliate-operations.md`。
