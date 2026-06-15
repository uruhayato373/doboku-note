# ハンドオフ｜外部作業バッチ（残 handoff の archive を解錠する）

作成 2026-06-15。残っている active handoff は **純粋な repo 作業だけでは 1 本も archive まで到達しない**（全てに note 投稿 / PDF 生成 / deploy / cloud WebSearch の「外部尻尾」が残る）。その外部尻尾を**実行環境別に 1 枚へ集約**したもの。各環境のバッチを消化したら、末尾「archive 可否マップ」に従って該当 handoff を `_archive/` へ退避できる。

> [!important] 使い方
> 環境（Mac / cloud / Windows）ごとにまとめて実行する。会社 Windows PC はプロキシで外部 API（note/Google/Meta/R2）が遮断されるため、note 投稿は Mac、WebSearch 必須の生成は claude.ai/code で行う（真実源: `docs/reference/measurement-incidents.md`）。note の公開状態は着手前に `npm run verify-note-magazines` で実体確認（ファイル個数や Lint 通過で代理判定しない）。

---

## A. クラウド Claude Code（claude.ai/code）— WebSearch 必須

会社 Windows では WebSearch 不可。runbook の factcheck が通らず self-abort するため cloud 専用。

| 完了 | タスク | 出所 |
|---|---|---|
| [ ] | BK-09 電力土木 R08-yosou 3 記事を生成（runbook に従う） | #5 |
| [ ] | BK-10 鉄道 R08-yosou 3 記事を生成 | #5 |

runbook: `docs/handoffs/2026-06-10-bk04-11-yosou-cloud-runbook.md`。BK-04〜08/11 の R08-yosou は生成済み（残り 2 科目のみ）。**A 完了で #5 を archive 可**。

---

## B. Mac（note.com 投稿）— `note-edit-session` / 投稿前に `verify-note-magazines`

| 完了 | タスク | 出所 |
|---|---|---|
| [ ] | BK-02〜11 を note 本投稿 → noteUrl 反映 → published:true（BK-I / BK-01 は `docs/todo/weekly.md` で別管理） | #8 |
| [ ] | BK-I を差し替え投稿 | #8 |
| [ ] | 「立場別模範論文の選び方」を note 新規投稿（現 noteStatus: draft） | #7 (A-3) |
| [ ] | roadmap 記事を note 再投稿（14 ペルソナ化＋¥3,480 を反映） | #7 (A-1/A-2) |
| [ ] | 受注者ペルソナを note 反映: ゼネコン/河川コンサル=既存マガジン再投稿（de-blockquote/掲載文反映）、都市計画コンサル/道路橋梁コンサル=新規投稿 → published:true | #6（archive 済） |
| [ ] | 自治体道路担当 R08 を note 反映（再投稿） | souban（archive 済） |
| [ ] | cd-essay-magazine を note 投稿（C のカバー＋essay QA 後） | #1 |

**B の #7 行（A-1/A-2/A-3）完了で #7 を archive 可。** #8 は B＋C(PDF) 完了で archive 可。

---

## C. Windows ローカル（PDF 生成・画像・描画）— 外部 API 不要・ローカルツール依存

| 完了 | タスク | 出所 |
|---|---|---|
| [x] | pdf-spec JSON 2 本作成済（`scripts/pdf-specs/BK-09_電力土木.json` / `BK-10_鉄道.json`・R03-R07×3＝各15記事・2026-06-15）。**R08-yosou 分は A(#5) 完了後に追記** | #8 |
| [ ] | 8 マガジンの紙用 PDF を生成（pdf-spec が揃ってから） | #8 |
| [ ] | takuitsu: カバー画像を生成 | #3 |
| [ ] | takuitsu: epubcheck を実行（要 Java/epubcheck インストール） | #3 |
| [ ] | content-angle P-1: カルーセル PNG を描画（ffmpeg/@fontsource/VOICEVOX）→ ig-carousel-qa | #4 |
| [ ] | concrete: `cd-essay-cover.webp` を生成 | #1 |

---

## D. デプロイ（develop→main）

| 完了 | タスク |
|---|---|
| [ ] | `/deploy` で develop→main 昇格（本セッションの cleanup commit 群＋蓄積コンテンツを本番反映）。deploy 後 `curl` で主要 `/docs/*` の HTTP 200＋`<main>` を確認 |

---

## E. 判断待ち（あなたの決定）

| 完了 | 決定事項 | 出所 |
|---|---|---|
| [ ] | concrete-diagnostician の図版 著作権方針（SVG 描き直し / ライセンス取得 / draft 固定継続）。vertical 全体が draft-lock 中＝公開の前提条件 | #1 |
| [ ] | BK magazines の価格レビュー（3-way drift 解消） | #8 |
| [ ] | 完全パック価格の hold 解除タイミング（note pack を 14 ペルソナへ再収録するか）。memory `feedback_essay_pack_ssot_adr` の 2 段ラダー（上段¥14,800/下段¥5,480・公開ゲート=note 収録完了まで¥14,800 を広告しない）と連動。**再収録まで現行 hold 維持＝B/C 修正の再適用は厳禁（既に revert 済 664bf452e）** | #7 (B/C) |

---

## archive 可否マップ

| handoff | これが揃えば archive |
|---|---|
| #5 bk04-11-yosou | A 完了（電力土木＋鉄道 R08） |
| #7 donsen-fixes | B の A-1/A-2/A-3 完了（B/C は hold のまま archive 可・E で別管理） |
| #8 bk-magazines | C(pdf-spec＋PDF) ＋ B(note 投稿) 完了 |
| #3 takuitsu-epub | C(カバー＋epubcheck) ＋ THEMES 横展開(repo) |
| #1 concrete-diag | E(著作権決定) ＋ C(カバー) ＋ B(note) ＋ repo(欠番 48/56/85 補完・proofread) |
| #4 content-angle | B/repo(P-2 X パイロット) ＋ C(P-1 描画) ＋ Phase2(パイロット結果待ち) |
| #11 gsc-analysis | 内容は完了済。並行セッションの編集が settle 後に退避 |

> [!note] repo 側の小ワザ（このリストの外・どのセッションでも可）
> #8 の pdf-spec 2 本（C 先頭）、#3 の THEMES 横展開、#4 の P-2 X パイロット、#1 の欠番補完/proofread は外部 API 不要で repo 完結。先に潰しておくと B/C/E の残作業が縮む。
