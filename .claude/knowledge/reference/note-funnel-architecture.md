# note 導線（ファネル）アーキテクチャ

note 記事・有料マガジンへの**回遊と購入の動線設計**の真実源（SSOT）。資格別にセグメントした 3 層モデルと、その**定期的な見直し・ドリフト修復**の仕組みを定義する。2026-06-16 制定。

> [!note]
> **真実源の責務分担**
> - 本書 = 導線アーキテクチャ（3層モデル・原則・見直しサイクル＝**記事間**の回遊・購入動線）の SSOT
> - [note-selling-structures.md](note-selling-structures.md) = **記事内部**の構成（読者の悩みをつかみ購入理由を作る本文の9型）の SSOT。本書は記事から記事へ送り、向こうは 1 本の記事の中身を組む（直交）
> - `.claude/config/note-funnel.json` = 機械可読 SSOT（L1/L2 レジストリ・資格別 CTA 文面・マーカー）。スクリプト/CI/エージェントが参照
> - `src/lib/note-magazines.ts` = マガジンの URL・価格・公開状態の真実源
> - **マガジンの収録記事（期待値）** = 各記事 frontmatter の `noteMagazine` ラベル ＋ `.claude/config/note-magazine-membership.json`（ラベル→マガジン id の対応・dir 外収録の extras）。検査は `npm run check-magazine-membership`（repo 実数 ↔ SoT の price 件数 ↔ ライブ snapshot の**三軸**）。SoT の件数表記は真実源ではなく**検証される側**。収録リストを別に手書きしないのは、それ自体が新たなドリフト源になるため（2026-08-24 制定）
> - 各 `content/note/{試験}/noteコンテンツ計画.md` = 試験別の戦略・価格企画・リリース計画
> - `docs/marketing/02_チャネル動線設計.md` = **note → サイト送客リンク**の UTM 規約の SSOT。本書（記事間回遊＝note 内部の L1/L2/パック）は note→サイトの deep link / UTM は扱わない。サイト送客リンクは UTM 付きインライン（生 URL 単独行はカード化で UTM 消失）
> - `.claude/state/note-published.json` = 公開済み単発記事の記録

## なぜ必要か（背景）

note 記事・マガジンが増えると、記事末尾の CTA が場当たりになり「総監読者を 1 級土木に送る」ような**関連性の薄い動線**や、新規マガジンが案内記事に未収録のまま放置される**ドリフト**が発生する。場当たりの手作業ではなく、**資格別セグメント＋定期監査**で構造的に保守する（2026-06-16、全資格サイトマップを総監記事末尾に貼ろうとして「総監読者は 1 級土木に興味がない」と気づいたのが発端）。

## 3 層モデル

| 層 | 役割 | 実体 | 送客先 |
|---|---|---|---|
| **L1 アンブレラ** | 全資格の俯瞰サイトマップ。**プロフィール固定（自己紹介記事）**＝新規来訪者の入口 | `共通/コンテンツ総合案内`（`n296a88f64ac2`） | 各 L2 へ分岐 |
| **L2 資格別もくじ** | 1 資格の「無料記事＋有料マガジン＋パック」案内ハブ | `技術士総監/総監もくじ`（`n3ed4c77ceed6`）ほか | その資格の記事・マガジン |
| **L3 記事内 CTA** | 各記事の冒頭・末尾の動線 | 全記事（冪等マーカー付き） | 冒頭=パック／末尾=同資格 L2 |

## 原則

1. **資格別セグメント（最重要）** — L3 末尾 CTA は**同じ資格の L2 にだけ**送る。総監記事から 1 級土木へは送らない（関連性の薄い回遊は質を落とす）。全資格 L1 は**プロフィール固定と L2 を束ねる親**に限定。
2. **冒頭=買う／末尾=回遊** — 冒頭はその資格の主力商品（パック）へインラインで軽く（カード連打で読み物の信頼を損ねない）。末尾は同資格 L2 へカード 1 枚で回遊。
2-b. **有料記事の「末尾」は有料境界の直前（＝無料プレビューの末尾）** — 有料記事は `paidBoundary` 以降が paywall の中に入るため、記事末尾に置いた L2 もくじは**非購入者に一度も見えない**。回遊させたい相手はまさに「買わずに離脱する読者」なので、有料記事では L2 カードを**境界 H2 の直前**に置く。冒頭にカードを足すのではない（既にパック CTA があり原則 2 の「カード連打」に抵触する）。空いた記事末尾（有料域）は、civil の二次系に限り**メンバーシップ「土木セコカン合格ラボ」CTA**を置く＝答案を書き換えた直後の「第三者の目がほしい」瞬間に添削を提示する。総監・建設部門は資格セグメント違反（原則 1）なので置かない。一次（択一）は intent が別（原則 7）なので置かない。配線・検査は `npm run wire-note-paid-cta [--apply]` / `npm run check-note-paid-cta`（CI: r2-audit.yml・全量）。2026-07-31 制定、実測（`n74c193d154e5` の無料本文 7,450 字に土木もくじ URL が不在）を起点に paid+published 251 本のうち 238 本を是正。
3. **冪等マーカー** — CTA は HTML コメントのマーカーで囲む（`<!-- cta:pack-top -->` / `<!-- cta:{exam}-mokuji -->`）。再実行で重複しない。マーカーは publish 時に除去される（note に出ない）。
4. **既存 CTA 非破壊** — 配線スクリプトは追加のみ。既存の「おすすめ記事」「関連リソース」等は壊さない。
5. **note アンカー非対応** — 記事内の見出しジャンプは markdown の `#アンカー`では効かない。L1/L2 もくじ記事には note ネイティブ目次ブロックを使う（`publish-note` Phase 4.5）。
6. **ソース→ライブの非同期** — `article.md` 編集は次回 publish／更新まで live note に反映されない。公開済み記事への反映は type 追記方式（`publish-note` update-mode.md。paste は `/new` 専用で edit 画面では無音失敗する）。
7. **冒頭パック CTA は「購入検討度 × トピック整合」で判断する** — 冒頭パックは経験記述/記述式の**答案パックを推す CTA**。有効な定石だが、**記事のトピックが答案づくりと地続きの読者にだけ効く**。付ける: 購入ガイド記事（「マガジンの歩き方」「立場別模範論文の選び方」等＝どれを買うか選びに来た読者）／経験記述・記述式そのものの記事／二次全体像。**除外する（config の `exams.{key}.topCtaExcludeDirs`）**: (a) 新規入口ロードマップ（「はじめての方へ」＝自記事が「まず無料で」と促す。完全除外でなく入口価格 1 点に絞った軽量 CTA `cta:pack-top-light` に差し替え）、(b) 受験資格・受験順・一次段階のみの入口ガイド（読者が答案づくりの手前）、(c) 転職・年収・キャリア系（試験勉強と intent が別）。「ナビ記事＝一律除外」は誤り（2026-06-16 是正）だが、**「全記事へ一律注入＝オプトアウト」も誤り**で、受験資格記事に経験記述バンク CTA が唐突に出ていた（2026-07-19 是正、civil で受験資格/受験順/一次独学＋転職キャリア系11本を除外、tankan で択一専用4本＋キャリア判断5本を除外・受験検討2本は橋渡し。tankan は note-funnel-auditor で意味監査）。機械補助: `audit-note-funnel` の **review surfacer**（記事名・H1 に記述系シグナル語が無い pack-top 記事を**非ゲート**で列挙）が候補を surface → 最終判定は `note-funnel-auditor`。**除外指定と実体のドリフト（除外なのにマーカー残存）は D6 が CI で検知**。マーカーは HTML コメント全体（`<!-- cta:pack-top -->`）で厳密一致させる（`cta:pack-top-light` の部分一致誤検出を避ける）。
8. **サブ資格別で冒頭パック CTA を差し替える（`topCtaOverrides`）** — 1 資格の下に「1級／2級」のようなサブ資格が同居する場合、冒頭パックはサブ資格ごとに向き先が変わる（2級読者に1級パックを出すのはセグメント違反）。config の `exams.{key}.topCtaOverrides`（`[{dirPrefix, marker, text}]`）で**ディレクトリ接頭辞ごとに topCta 文面/URL を差し替える**。例: civil の `2級土木/` 配下は 2級 想定工事バンク（`m8554e87ca6ec`）へ。マーカーは共通（`cta:pack-top`）なので D1 監査はそのまま効き、D5 のライブ反映ターゲットは記事ごとに override 先頭 URL で判定する（2026-07-05 新設）。
9. **`magazines/` 配下（有料単品記事）は機械監査 D1-D6 のスコープ外** — `audit-note-funnel` は `magazines/` を再帰探索から除外する（[audit-note-funnel.mjs](../../../scripts/audit-note-funnel.mjs) の `collect`）。有料単品記事の回遊（冒頭カード＝所属パック／セットへの上げ）は wire では張れないため、**個別に `cta:pack-top` を本文へ直挿し＋`note-append-cta` でライブ反映**して維持する。note 側 paywall の native「マガジンで買う」は購入直前まで見えないので、無料プレビュー域の冒頭カードが実質の回遊導線（2026-07-05、1級2級 二次学科記述ライン13本で実施）。**L2 もくじ（末尾 CTA）についてはこのスコープ外を突いて 155 本が有料域に埋没・83 本が未配線のまま放置されていた。2026-07-31 に `wire-note-paid-cta` で機械化し、`check-note-paid-cta` を CI 全量ゲートとして追加（原則 2-b）。**
10. **試験直前訴求は本試験後に evergreen 文言へ切り替える** — 「本番直前」「R8最終予想」等の直前訴求 CTA は、対象試験の本試験日を過ぎた時点で通用しなくなる。総監の共通冒頭 CTA・サイト側 L2 タイル・キーワード hub 先頭は、試験後は「精読ガイド」等の evergreen な訴求へ切り替え、次のシーズンの直前訴求は次回試験の直前期にだけ再度使う（2026-08-20 総監 R8 本試験後に発見・是正、DN-0100）。判定は `audit-note-funnel` の review surfacer では拾えない（トピック不一致ではなく時期不一致のため）。試験日程は `.claude/config/exam-calendar.json` を参照し、本試験後の切替は都度手動判断とする（自動切替はまだ無い）。

## 1級・2級土木の一次／AI記事 CTA 決定（2026-07-24）

一次検定の記事と施工経験記述の記事は、同じ civil 配下でも検索意図と購入段階が異なる。civil の既定 `cta:pack-top` を一律注入せず、次の3記事は `topCtaExcludeDirs` で既定パックCTAから除外し、記事固有CTAを使う。

| 記事 | 冒頭の次行動 | 末尾の帰路 |
|---|---|---|
| `1級土木/一次択一-過去問PDF` | 1級一次「出る順 合格ノート」`nec34238ca6d6`。二次まるごとパックを第一CTAにしない | 土木もくじ `n4fde0f62dc20` |
| `2級土木/一次択一-過去問PDF` | 現時点では固有商品CTAなし。二次想定工事バンクを第一CTAにしない | 土木もくじ `n4fde0f62dc20` |
| `経験記述-AI設計-無料` | Brain「施工経験記述 設計キット」`b5EDO3UjMgoTZsNWa0JXY` | 土木もくじ `n4fde0f62dc20` |

記事固有CTAは既定マーカー `cta:pack-top` と区別し、次の冪等マーカーを使う。

- 1級一次: `<!-- cta:civil-1-primary-ronten -->`
- AI設計: `<!-- cta:civil-ai-kit -->`
- 共通の末尾帰路: 既存の `<!-- cta:civil-mokuji -->`

公開済みnoteの更新はソース編集だけで完了扱いにしない。`note-update-body` または安全な部分更新ツールでライブ反映し、更新通知は「いいえ」、有料記事は `paidBoundary` と価格を維持する。完了条件は `audit-note-funnel --live` の civil D1/D5/D6 がゼロで、対象3記事の公開本文に期待URLが存在し、除去対象URLが存在しないこと。

実装作業票: 旧 plan `civil-note-funnel-remediation-2026-07-24.md`（2026-08-18 に完了確認のうえ削除・記録は git 履歴）

## L1/L2 レジストリ

| 層 | 資格 | noteId | ソース | 状態 |
|---|---|---|---|---|
| L1 | 全資格 | `n296a88f64ac2` | `共通/コンテンツ総合案内` | 公開・目次済 |
| L2 | 技術士総監 | `n3ed4c77ceed6` | `技術士総監/総監もくじ` | 公開・目次済 |
| L2 | 技術士建設部門 | `n7279ca0d926f` | `技術士建設部門/建設部門もくじ` | 公開済 |
| L2 | 1級・2級土木 | `n4fde0f62dc20` | `1級・2級土木/土木もくじ` | 公開済（末尾 CTA 配線済・メンバーシップは excludeDirs で対象外） |

機械可読の最新値は `.claude/config/note-funnel.json` を参照（本表は人間向けの要約）。

## ツール

| ツール | 役割 |
|---|---|
| `npm run audit-note-funnel` | **ソース**ドリフト検出（read-only・高速）。公開記事の CTA マーカー欠落／公開マガジンの L2 未収録／L2 の L1 未リンク／L2 URL 不一致／**除外指定なのに冒頭パック残存**（D1-D4・D6）＋**review surfacer**（トピック不一致の疑いを非ゲートで列挙→`note-funnel-auditor` へ） |
| `npm run audit-note-funnel -- --live` | **＋ライブ反映検証（D5）**。公開記事の CTA が live note に実反映されているかを note 公開 API（body+embedded）で機械検証。**「ソースは正でもライブ未反映＝再投稿もれ」を検出**（2026-06-18 に総監19本で実害化した事故の機械検知）。`note-live-audit.yml` が `--live --ci` で週次実行し、手動実行は修復直後の再確認に使う |
| `npm run check-note-funnel` | CI ゲート（`audit --ci`、**ソースのみ**でドリフト exit 1＝D1-D4・D6・高速）。review surfacer は非ゲート。`r2-audit.yml` で発火 |
| `npm run check-note-republish` | **本文＋ハッシュタグの再公開ドリフト検出**（surfacer・creds不要・ローカルhash突合）。公開記事のソース本文ハッシュ（`.claude/state/note-republish-hashes.json` の `hashes`）と**ハッシュタグ hash（同 state の `tagHashes`・`hashtags*.txt` 単位）**を現ソースと突合し「要再公開（本文drift／タグdrift）」を各々列挙。**D5 が CTA の live 反映を追うのに対し、こちらは blockquote/UTM/本文改稿など CTA 以外の全本文変更＋タグ変更を追う**（直交・補完）。in-sync 化: 本文＝`note-publish`／`note-update-body --commit`、タグ＝`note-publish`（Phase10でタグ適用）／`note-sync-tags`（公開済み記事へのタグ差分適用）。`note-update-body` はタグ非適用のためタグ hash は記録しない。`note-append-cta` は非hook。正常な中間状態も含むためゲートにはせず、`note-live-audit.yml` が週次 artifact に JSON を保存する。baseline は `--baseline --since <ref>`（本文・タグ両方をseed） |
| `npm run wire-note-funnel-cta -- --exam {key} [--apply]` | 資格別に L3 冒頭/末尾 CTA を**ソースへ**冪等配線（既定は dry-run） |
| `npm run note-append-cta -- --note {id} ...` | **公開済み記事へ CTA を live 反映**（Playwright・Windows 可・browser-use 不要）。`--after`=free プレビューへアンカー挿入／`--boundary-h2`=有料境界保持。D5 ドリフトの修復手段。詳細 → [publish-note/references/update-mode.md](../../skills/social/publish-note/references/update-mode.md) |
| `npm run note-append-list-links -- --spec {json} [--commit]` | **公開済みもくじの既存 `<ul>` へインラインリンク項目を live 追加**（D2 ライブ反映）。type ではインラインリンクが作れない（`[text](url)` はリテラル残存・bare URL はカード化）ため `insertAdjacentHTML` で兄弟 `<li>` を挿入。spec JSON = `{note, sections:[{anchorMagId, items:[{url,title,desc}]}]}` |
| `npm run check-magazine-cta` / `:ci` | **サイト側**の CTA 到達性ゲート（note 内の導線を見る他ツールと直交）。公開マガジンが `/docs` のどこかで実際に CTA として出るかを、`placement.top` / 中間 CTA（group と h2>=5・本文 8,000 字の発火条件込み）/ MDX 内 `<MagazineCard>` の 3 経路で判定する。**`published: true` にしても CTA が 1 面も出ない**事故（2026-07-31 コンクリート診断士）の再発防止。既存の 0 面は `.claude/config/magazine-cta-baseline.json` に理由付きで計上し、**baseline 外の新規 0 面だけ落とす**ラチェット方式。`placement.sidebar` は 2026-07 の CTA 統一以降どこからも参照されない死に配線なので、配線しても到達手段にならない |
| `npm run note-update-body -- --list {file} --commit --reattach-pdf` | 公開済み本文の**全文置換**による live 反映（drift の in-sync 化）。**全文置換は live の PDF 添付を消す**ので、添付のある記事では `--reattach-pdf`（同一セッションで貼り直し）が必須。スクリプト側で「live に添付があるのに `--reattach-pdf` も `--allow-attach-loss` も無い」場合は更新を拒否する（`scripts/note-update-body.mjs:564`）。逆に**ソースに PDF があるのに live の添付が 0 件だと更新自体を中断**する（同 `:545`）ため、**既に添付が消えている記事は先に復旧しないと本文も直せない**（順序依存） |
| `npm run note-attach-file -- --note {id} --file {pdf} --boundary-regex "…" --commit` | 有料エリアへの PDF 添付。`--boundary-regex` は frontmatter の `paidBoundary` を読まないので**明示必須**（省くと既定 `試験問題\|予想問題` で境界が見つからず exit 8） |
| `npm run check-note-attachments -- --live` | **live 実査**（要 note ログイン・約60分/463件）。有料エリアの添付カードは未ログイン HTML に出ないため CI では見えない。`--only {noteId,…}` で単発確認。結果は `.claude/state/note-attachments-missing.json` に永続化 |
| `audit-note-funnel` スキル | 監査→修復→再公開の手順書（資格別 config 駆動） |
| `note-funnel-auditor` エージェント | 意味的監査（もくじ構成・CTA 文面の関連性・回遊の質）。Evaluator・audit-only。機械の D1-D5 とは直交 |

## 見直しサイクル（定期）

導線は**コンテンツ増加で必ず陳腐化する**ため、次のトリガーで監査する。

- **新規マガジン公開時** — その資格の L2 もくじに追記し、`audit-note-funnel` を実行
- **新規記事公開時** — L3 CTA が入っているか（`wire-note-funnel-cta` 済みか）確認。**配線が公開より後なら `note-append-cta` で live 反映**（ソースだけ直して再投稿しないと live は死んだまま＝2026-06-18 の事故）
- **週次 CI（ソース）** — `r2-audit.yml` の `check-note-funnel` が D1-D4/D6 を赤落ちで機械検知
- **週次 CI（ライブ）** — `note-live-audit.yml` が `audit-note-funnel --live --ci` を実行し、D5 と取得失敗率を検査
- **意味的監査** — `note-funnel-auditor` は順序・文面の関連性を判断するときにオンデマンド実行。CI は意味判断やソース修復をしない
- **修復** — CI が D5 を検出したら `note-append-cta`／`publish-note --update` で live 反映し、手動 `--live --ci` で消失を確認する

> [!warning]
> 旧クラウドルーティン `doboku-note note-funnel monthly audit`（`trig_01F5nDWSTs757Ge5K1ou6Dbr`）の機械監査責務は CI へ移管済み。クラウドルーティンの削除は API では行えないため、[Claude Code Routines](https://claude.ai/code/routines) で一覧を確認して削除する。

## 標準フロー（新規 L2 を増やすとき）

1. `{試験}/もくじ` 記事を作成（無料→有料の順・冒頭にパック動線）
2. カバー（`generate-note-covers.mjs`）＋ハッシュタグ（`note-hashtags`）生成
3. `publish-note --free` で公開（Phase 4.5 で目次ブロック挿入）→ noteUrl 取得
4. `.claude/config/note-funnel.json` の該当 exam.L2 に noteId/URL を記入＋ topCta/bottomCta 文面を記入
5. L1（`共通/コンテンツ総合案内`）に当該 L2 へのリンクを追記し再公開（`--update`）
6. `npm run wire-note-funnel-cta -- --exam {key} --apply` で L3 配線
7. `npm run audit-note-funnel` でドリフトゼロを確認
