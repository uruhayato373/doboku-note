---
name: feedback_verify_your_excuses
description: "報告・提案の前に実体で裏取り。「検証できない」の理由自体を検証・溜まった物は生成元を見る・自分のコマンドの副産物か確認・外部仕様を断定しない・ツール出力の幻覚に注意"
metadata:
  type: feedback
---

報告・提案で最も検証が甘くなるのは「できなかったことの説明」と「量・差分・空応答の解釈」。成果は疑われるが制約・注記は素通りする。以下は同根のルール群（成否の真実源は実体）。

## 「〜のため検証できない」の理由自体を1手で検証する
理由も主張であり検証義務は結論と同じ。**エラーコードを原因として引用しない**（サーバ応答は症状で、自分の環境がなぜその状態かは説明しない）。creds / proxy / ブランチ / 権限を先に疑う。
- **Why:** 2026-07-27、EXP-005 報告で未検証の理由を2つ間違えた。①「PSI が日次クォータ超過(429)のため live 検証未了」→実際はローカルに `PSI_API_KEY` が無いだけ（CI は正常・`.env.local` を grep 1回で判明）。②「CI の次回実行で確認する」→scheduled workflow は default branch(`main`) で走るので develop の未 push 変更は deploy まで一度も実行されない（`gh repo view` 1回で判明）。同じセッションで LCP 診断は厳密に実測していた（自分の修正を実測で否定し撤回まで）。差は「証明するときは検証し、できない理由を述べるときは検証しなかった」。注記の誤りは謙虚に見えて指摘されにくく commit message に固着する。
- **How to apply:** 「Xだから未検証」と書く手が動いたら X を1手で確認してから書く。SSOT: `.claude/knowledge/reference/measurement-incidents.md`「2026-07-27:『検証できない理由』の誤り」。

## 大量に溜まった物は「量」でなく「生成元」を見る
掃除・削除・最適化を提案する前に、なぜ増え続けているかを実体で確認し、生成元を名指しできるかを自問する（重複 pack 993個、未使用ファイル数百件、孤児画像の山など）。大量にあること自体が「今も作られ続けている」証拠のことが多い。名指しできないなら「未確認」と書き提案しない。
- **Why:** 2026-08-21、DN-0111 Phase 0 で pack 12.01GiB に対しユニーク 6.64GiB・pack エントリ43万 vs ユニーク16万を測り「repack で 5GiB 回収できる」と提案・承認を得たが、(1) `git repack -a -d` が到達可能 commit を21個落とし（origin から復旧・[[reference_partial_clone_repack_hazard]]）、(2) 後に auto-gc が同じ重複を作り直し13GiB へ戻った。リスクだけ払って成果ゼロ。CLAUDE.md §8 違反。
- **How to apply:** 不可逆・回復困難な操作の承認を求めるときはリスクだけでなく「実行後に何をどう検証して成功と判定するか」を承認前に書く（書けないなら提案段階に達していない）。man page・公式仕様を検証の代わりにせず手元で確かめる。過去の解決（2026-07 は repack でなく clone 作り直し・[[project_asset_audience_routing]]）を先に見る＝採らなかった手段には理由がある。

## 見覚えのない差分は自分のコマンドの副産物か先に確認
2026-09-26、`npm run build`（ピクセル検証）が refresh-indexes を走らせて src/config の5ファイルと frequent-topics 記事を書き換えたのに、「ビルドか別の作業による変更・私の変更ではない」と報告した（実際は自分の build の副産物）。他人のせいにするとユーザーが存在しない並行作業を疑い、正しい片付け（戻す／commit）が遅れる。
- 未コミット差分を報告する前に、そのセッションで実行した build・refresh-indexes・generate 系の書込先を確認し、`git diff` の中身（generated_at だけか実データか）で帰属と要否を決める。生成物のずれは `npm run check-generated-indexes`。
- 同日、使い方を見るつもりの `node scripts/normalize-a8-csv.mjs --help` が未知の引数を無視して古い手元 run を取り込み A8 の SSOT 2ファイルを書き換えた（git checkout で復元・引数検証を追加）。**書き込み系スクリプトの使い方は実行せず冒頭 docstring / parseArgs を Read して確認**。
- 2026-10-02、構文確認のつもりの `node -e "import('./scripts/report-search-growth.mjs')"` が CLI 本体を実行し `.claude/state/improvements/search-growth-latest.md` を書き換えた（git restore で復元）。**CLI スクリプトの確認は `node --check`、`import()` での確認は副作用の無い lib だけ**。サブエージェントへの指示にも「CLI は実行しない」と書く。同日、`npm run test` が追跡中の `public/quiz` を書き換える既存の副作用も見つかった（DN-0511）ので、テスト後も `git status` で差分の帰属を見る。

## 外部仕様を断定しない
戦略・分析で外部の第三者仕様（ASP 規約・検索エンジンの挙動・他社プロダクト仕様・法令の細部）を確定事実のように断定しない（LLM は一次情報未確認のまま過度に強い因果・一律禁止・不可避と書きがち）。
- **Why:** 2026-06-27、リスト化戦略 doc で「①SEO崩壊（不可避）／③静的構成と矛盾（不可能）／④A8.net はメール配信を一律禁止」と断定し、再検証で全て誇張だった（① Google は paywall コンテンツのインデックスを公式サポート ③ 会員登録は SaaS(Clerk/Cloudflare Access/Mailchimp 等)で静的サイトでも可能 ④ A8.net のメルマガ可否は案件（広告主）ごと）。誤った断定は事業判断を誤らせる。
- **How to apply:** (1) 事実（一次情報確認済）/ 推測 / 要確認を区別 (2) ASP 規約・検索エンジン挙動・他社仕様・法令細部は原則「要確認」とし確認先（A8 管理画面・Google 公式・規約原文）を指す (3)「不可避/不可能/違反」でなく「リスク大・実装難・案件ごとに要確認」と確度に合わせる (4) 断定したら指摘を待たず自分で見直す。公開コンテンツの事実版は [[feedback_factcheck_guide_facts]]。

## ツール出力の幻覚に注意（成否は git / 実体で確認）
長いセッション・大量並列・重い外部呼出（NotebookLM 等）の後、Bash/Read の結果に幻覚テキストが混入することがある（書いていない処理を「書いた」と報告・絵文字や日本語注記の捏造・出力の重複/遅延 flush）。2026-05-29、クロストレードオフ マガジン制作で `rebuild-all.py` 実行がキャンセルされていたのに「記事を書き込んだ」と複数回誤報告した。
- 書き込み後は `git status --short` / `git diff --stat` / PowerShell `Get-ChildItem`（バイト数）で実体確認してから「完了」と言う。
- python の print は cp932 で日本語クラッシュ（`UnicodeEncodeError: 'cp932'`）→ `python -X utf8`。日本語の大量出力はファイルに書いて Read。
- 並列ツール実行は1つの失敗で同一 message 内の全ツールがキャンセル連鎖する。重要な書込・検証・git 操作は逐次（探索的 read のみ並列）。
- 作業開始時 `git branch --show-current`、commit 前 `git diff --cached --name-only`（[[feedback_multi_session_concurrent_git]]）。白書数値の検証は `.claude/scripts/whitepaper-grep-check.mjs`（[[feedback_factcheck_guide_facts]] / [[project_kettei2026_r8_evergreen]]）。

関連: [[feedback_gate_zero_coverage_false_pass]] [[feedback_ssot_no_hand_copies_self_verify]]
