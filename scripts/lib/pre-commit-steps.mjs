// pre-commit の検査の一覧・順序・止め方（DN-0688）。実行は scripts/pre-commit-dispatch.mjs。
//
// それまで scripts/install-pre-commit.mjs が書くシェルのフックに 73 本の `node scripts/…` が並び、1 commit で
// node を 67〜77 回起動していた（MDX 1 本で 12〜14 秒・起動費だけで約 4 秒）。一覧をここへ移し、フックは
// 1 プロセスのディスパッチャを呼ぶだけにした。**判定（どの staged パスで・どの検査を・どの引数で・どの順に・
// どの失敗で止めるか）は旧フックと同じ**で、tests/pre-commit-dispatch.test.mjs が旧フックを写した表と突き合わせる。
//
// 各項目:
//   script  / args        node で起動するスクリプトと引数（args は関数にもできる＝ctx から作る）
//   inProcess             true なら import して run({ argv, quiet: false, root }) を呼ぶ（子プロセスを立てない）。
//                         run() は process.exit を呼ばず { code } を返す（scripts/lib/cli-run.mjs の契約）
//   when(ctx)             省略なら毎回。条件付きの検査は旧フックの `if git diff --cached … | grep` と同じ判定
//   touches(ctx)          **全量を見る検査**（引数に --staged が無く、リポジトリ全体を走査するもの）の絞り込み。staged の変更が
//                         その検査の入力に当たらないとき false を返して飛ばす（記事 1 本の編集で 2.5 秒の全量走査を回さない）。
//                         入力の宣言は検査自身が走査する根（export した定数）から引き、投げたら走らせる側に倒す。
//                         旧フックは毎回走らせていた＝**ここだけ旧フックより狭い**（tests/pre-commit-dispatch.test.mjs が宣言する）
//   skipEnv               { name, mode } 環境変数による緊急回避。mode 'eq1'＝値が "1" のとき、'nonempty'＝空でないとき
//   requireFile           旧フックの `if [ -f scripts/… ]`（ファイルが無い古いツリーでは飛ばす）
//   failOnlyCode          指定した終了コードのときだけ止める（旧フックの `[ $? -eq 1 ]`。他の非 0 は通す）
//   failMessage           止めるときに追加で出す 1 行（旧フックの echo）
//   tail / failHint       出力を捕まえて、失敗時だけ末尾 tail 行と failHint を出す（旧フックの `> log; tail -N log`）

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AREAS } from './datasets.mjs';
import { REPO_ROOT } from './repository-paths.mjs';
import { CODE_DIRS, CONFIG_DIRS } from './qualification-ssot.mjs';
import { CONFIG as SEO_WATCH_CONFIG, LEDGER as SEO_WATCH_LEDGER, HISTORY as SEO_WATCH_HISTORY } from './seo-rank-watch.mjs';

const hasStaged = (ctx, re) => ctx.staged.some((f) => re.test(f));
/** staged の変更（削除・改名を含む）のパスが 1 つでも前方一致するか。entries は --no-renames なので改名は削除＋追加で見える */
const touchesPrefix = (ctx, prefixes) => ctx.entries.some((e) => prefixes.some((p) => e.path === p || (p.endsWith('/') && e.path.startsWith(p))));
/** 追加・削除・型変更（＝追跡ファイルの集合が変わる変更）が 1 つでもあるか。M だけの commit では false */
const changesFileSet = (ctx) => ctx.entries.some((e) => e.status !== 'M');

/** 旧フックで `node <検査のスクリプト> --staged` の形だった検査を作る */
const s = (name, args = ['--staged'], extra = {}) => ({ id: name, script: `scripts/${name}.mjs`, args, inProcess: true, ...extra });

export const STEPS = [
  // 記事の dateModified を commit の瞬間に frontmatter へ書く（2026-08-22）。
  // 日付の真実源は frontmatter で、sitemap lastmod / JSON-LD datePublished / RSS がそこから作られる。以前はビルド時に
  // git log から引いていたが、リネーム・移行・履歴書換えのたびに全ページの日付が黙って動いた（2026-08-18 の情報
  // アーキテクチャ移行で全 1,084 記事が created まで巻き戻った）。**このゲートが無いと frontmatter はまた古びる**
  // （反転前の実測で 1,117 件中 1,040 件が中央値 49 日ズレていた）。部分 staging のファイルは触らず警告する。
  // 回避は SKIP_MDX_DATES=1。作業ツリーと index を書き換えるので、必ず最初に回す。
  {
    id: 'backfill-mdx-dates',
    script: '.claude/scripts/backfill-mdx-dates.mjs',
    inProcess: true,
    args: ['--staged'],
    skipEnv: { name: 'SKIP_MDX_DATES', mode: 'eq1' },
  },
  // MDX validation
  s('pre-commit-mdx', []),
  // Dark mode border lint (TSX)
  s('lint-ui', []),
  // note article (.md) note-compat lint (markdown 表 / 太字内全角括弧 / 文字化け)
  s('note-lint', []),
  // 日本語校正（textlint + prh）。staged の content/site/**/*.mdx だけを対象にするラチェット
  // （DN-0239。全件は npm run lint:ja:all で report のみ・ゲートしない）
  s('lint-ja'),
  // コンテンツ品質ラチェット（lint-mdx-mobile --baseline --ci）を staged の content/site/**/*.mdx だけに回す。
  // CI（quality-audit content-quality-ratchet）にしか無く、develop 直 push の記事が CI を赤くしてから気づいていた
  // （2026-09-30 guide-career の 15-1）。baseline に無い新規違反だけで止める＝既存の在庫では止めない。
  // CI（--all）と同じく published: true の記事だけを対象にする（非公開の下書きで止めない）。
  {
    // CI の content-quality-ratchet を staged の published: true の記事だけに回す（新規違反だけで止める）
    id: 'content-quality',
    script: '.claude/scripts/lint-mdx-mobile.mjs',
    inProcess: true,
    args: (ctx) => ['--baseline', '--ci', ...ctx.contentQualityFiles],
    when: (ctx) => ctx.contentQualityFiles.length > 0,
    tail: 20,
    failHint: '[content-quality --staged] baseline に無い新規違反がある。上の指摘を直してから commit する（詳細は node .claude/scripts/lint-mdx-mobile.mjs <file>）',
  },
  // 建設部門 BK マガジン模範解答の字数ハード上限（答案枚数×600字）超過検出（手書き不可答案の再発防止）
  s('check-note-charlimits'),
  // 1級・2級土木 施工経験記述（完成答案集/過去問/予想/想定工事バンク）の解答欄字数超過検出（手書き不可答案の再発防止）
  s('keiken-charcount', ['--staged', '--strict']),
  // keiken マガジンが keiken-charcount の探索対象に配線されているか（字数ゲート素通りの再発防止・2026-07-01）
  s('check-magazine-wiring'),
  // 公開したマガジンがサイトで CTA として実際に出るか（published:true にしただけで売り場に出ていない事故の再発防止・
  // 2026-08-13）。ゲート自体は 2026-07-31 に作られていたが quality:audit にしか配線されておらず、公開の瞬間に誰も
  // 走らせていなかったため cce-essay-magazine が CTA 0 面のまま公開された。**作ったゲートは走らせて初めてゲート**。
  // note-magazines.ts / magazine-placement.ts / hub-cta.ts が staged のときだけ走る（重いので）。
  {
    id: 'check-magazine-cta-reachability',
    bin: 'npx tsx',
    script: 'scripts/check-magazine-cta-reachability.ts',
    args: ['--ci'],
    when: (ctx) => hasStaged(ctx, /^src\/lib\/(note-magazines|magazine-placement|hub-cta)\.ts$/),
  },
  // note 単品価格がマガジン内・宣言済みシリーズ内で一貫しているか（値上げの当て漏れ・値崩れの再発防止・2026-07-28）
  s('check-note-price-consistency'),
  // マガジン収録の期待値（repo 実数 ↔ SoT 件数表記）。記事を足したのにライブ未収録＋表記も古い
  // という事故（2026-08-24 ゼネコン/河川コンサル各2本）の再発防止。ライブ軸は CI 側で見る。
  s('check-magazine-membership'),
  // Markdown の相対リンク ](../x) の実在（check-doc-refs はリンクテキストしか見ない）。
  // SKIP_RELATIVE_LINKS=1 で回避
  s('check-relative-links'),
  {
    // docs/ か backlog が staged のときだけ全量（0.5 秒）。出力は捕まえ、失敗したときだけ末尾 15 行を出す
    id: 'check-project-task-refs',
    script: 'scripts/check-project-task-refs.mjs',
    inProcess: true,
    args: [],
    when: (ctx) => ctx.stagedAny.some((f) => f.startsWith('docs/') || f === '.claude/todo/backlog.md'),
    tail: 15,
    failHint: '[check-project-task-refs] docs/ に台帳に無い DN-#### の参照がある（上の [dangling-id]）。参照を直すかカードを残してから commit する',
  },
  // 統合済み（_redirects で 301 の転送元）の記事を published: true にして「再公開」してしまう事故を止める。
  // 統合の記録は frontmatter ではなく _redirects にしか無いことがあり、目視では気づけない（2026-08-22 実事故）
  s('check-published-vs-redirects'),
  // Git に何を追跡してよいか（生成物・著作権物・巨大 blob・拡張子偽装・同一原本の二重生成）。
  // HEAD 4.16GiB / remote 11GB でランナーが落ちるところまで来ているので、まず増加を止める。
  // 既存違反は baseline で猶予され、増加だけが FAIL になる。SKIP_GIT_BINARY_POLICY=1 で回避
  s('check-git-binary-policy', ['--staged'], { skipEnv: { name: 'SKIP_GIT_BINARY_POLICY', mode: 'nonempty' } }),
  // R2 へ退避済みのファイルが git add -f 等で再追跡されようとしていないか（DN-0156）。
  // check-git-binary-policy は「置き場の正しさ」しか見ず、check-asset-storage は
  // 「Git 追跡中は正常」を前提にするため、この種の事故はどちらも検知しない。
  // SKIP_ASSET_REENTRY=1 で回避
  s('check-asset-reentry', ['--staged'], { skipEnv: { name: 'SKIP_ASSET_REENTRY', mode: 'nonempty' } }),
  // 置き場ルール（audience）の破りと、Drive vault 管轄ファイルの Git 混入を staged だけで検知（2026-09-05）。
  // マウントは見ない（設定・ルーティング衝突・audience のみ）。SKIP_DRIVE_VAULT=1 で回避
  s('check-drive-vault', ['--staged-only'], { skipEnv: { name: 'SKIP_DRIVE_VAULT', mode: 'nonempty' } }),
  // 参考文献 sources ID・出典粒度・非公開文字起こしのパス/ファイル名漏洩を staged MDX だけで検査。
  // 原本との逐語照合は Drive 実体が必要なのでローカル deep で行う。SKIP_REFERENCE_SOURCES=1 で回避
  s('check-reference-sources', ['--staged'], { skipEnv: { name: 'SKIP_REFERENCE_SOURCES', mode: 'nonempty' } }),
  // 置き場のモデル（docs/content/config/data/.claude/実装）への逆戻り検知。廃止した置き場への新規ファイル・
  // docs への制作物混入・content への台帳混入。SKIP_INFORMATION_ARCHITECTURE=1 で回避
  s('check-information-architecture'),
  // SEO観察中ページの変更と順位履歴の書換えを拒否する。
  s('check-business-direction'),
  s('check-seo-rank-watch', ['--staged'], {
    // 入力: 観察の設定・台帳・順位履歴・根拠のレポート（config/・data/）、検査自身（scripts/）、観察中ページの本文、
    // 観察に影響する共有レイアウト（public/_redirects・src/app|components|styles）。記事 1 本の編集（観察対象外）では回さない
    touches: (ctx) => {
      const watched = JSON.parse(readFileSync(join(REPO_ROOT, SEO_WATCH_CONFIG), 'utf8')).watchwords.map((w) => w.contentPath);
      return touchesPrefix(ctx, ['config/', 'data/', 'scripts/', 'public/_redirects', 'src/app/', 'src/components/', 'src/styles/', SEO_WATCH_CONFIG, SEO_WATCH_LEDGER, SEO_WATCH_HISTORY, ...watched]);
    },
  }),
  // SNS 投稿（content/sns/**）の /docs/ リンクが本番に実在するか検証（404 投稿の再発防止）
  s('check-sns-urls'),
  // 退役アカウント/ハンドル（404 の note 旧名・凍結 X 旧アカ）への参照（2026-08-13。
  // SSOT の1行が死んだまま生成物32本が404リンクを吐いていた事故の再発防止）
  s('check-dead-handles'),
  // 運用記録の「今日」が UTC で出ていないか（JST 09:00 前に走らせると前日付になる事故の再発防止・
  // 2026-08-13 に coconala-blog の publishedAt と note-attachments の measuredAt で実発生）
  s('check-jst-date'),
  // 1級・2級土木の公式試験日SSOTと既知の誤日付を検証
  s('check-exam-calendar', []),
  // 資格の名前・並び順は qualification-registry.json だけ（設定の写し・コードの対応表の増加を止める）
  // 入力: registry・設定（CONFIG_DIRS）・コード（CODE_DIRS）。検査自身が走査する根をそのまま使う
  s('check-qualification-ssot', [], { touches: (ctx) => touchesPrefix(ctx, [...CONFIG_DIRS, ...CODE_DIRS].map((d) => `${d}/`)) }),
  // 設定（config/）・記録（data/）の全ファイルが台帳に宣言され、型のあるものは型に合う
  // 入力: 台帳の置き場（AREAS）・コード（scripts・tools・src・.claude）・ワークフローと package.json・参照先の記事の実在
  // （追加・削除・改名）。M だけの記事編集では回さない（全量走査で 2〜2.5 秒）
  s('check-datasets', [], {
    touches: (ctx) =>
      changesFileSet(ctx) ||
      touchesPrefix(ctx, [...Object.values(AREAS).map((a) => `${a.dir}/`), 'scripts/', 'tools/', 'src/', '.claude/', '.github/workflows/', 'package.json', 'config/', 'data/']),
  }),
  // X月間キャンペーン計画の日付・導線・URL・販売投稿間隔を検証
  s('check-x-campaign-plan', []),
  // スキル/エージェント/docs の .md 参照がリポジトリ内に実在するか検証（SSOT ポインタ破損の再発防止）
  s('check-doc-refs'),
  // .claude/plans/ の実装計画とbacklogカードの結線（存在・相互参照・1task=1plan・ID重複・孤児plan）
  s('check-task-plan-links', []),
  // backlog タグ行の語彙・[検証:] の実在・完了 prose の混入を検証（台帳が機械読取不能になるのを止める）
  s('check-backlog-schema'),
  // CLAUDE.md（毎ターン再送される核）が 150 行 / 20KB を超えて戻るのを止める。2026-09-13 のマージで 147→323 行に
  // 復活し develop の CI が 6 run 連続で赤のまま誰も読まなかった再発防止（CLAUDE.md か .claude/rules を stage したときだけ）
  {
    id: 'check-claude-md-size',
    script: 'scripts/check-claude-md-size.mjs',
    inProcess: true,
    args: [],
    when: (ctx) => hasStaged(ctx, /^(CLAUDE\.md|\.claude\/rules\/)/),
  },
  // エージェントの記憶（.claude/memory）の frontmatter・名前重複・索引の網羅と読み込み上限（200 行 / 25KB）。
  // 記憶だけの push は CI を走らせない（ci.yml の paths-ignore）ので、ここが記憶の唯一のゲート
  {
    id: 'check-memory',
    script: 'scripts/check-memory.mjs',
    inProcess: true,
    args: [],
    when: (ctx) => hasStaged(ctx, /^\.claude\/memory\//),
  },
  // AGENTS.md / .agents/skills / .codex/agents / .codex/hooks.json が正典（CLAUDE.md + .claude/rules / .claude/skills / .claude/agents / .claude/settings.json）の生成物と一致するか（第2SSOT再発防止・DN-0098）
  s('sync-codex-compat'),
  // agent の description が 300 code points を超えて増えないか（毎セッションの system prompt に全文載る。baseline ラチェット）
  s('check-agent-descriptions'),
  // スキル/エージェントの追加・削除・description 変更に台帳更新が伴うか検証（capability ドリフトの再発防止）
  s('check-doc-coupling'),
  // handoff の削除/退避で残タスクの backlog 抽出もれ・_archive 復活を検証（2026-07-14 退避事故の再発防止・SKIP_HANDOFF_EXTRACT=1 で回避）
  s('check-handoff-extraction'),
  // note の販売履歴（データセット note.sales）の productId が sales-recorder.md の mapping に文書化されているか検証（売上mapping陳腐化の再発防止）
  s('check-sales-mapping'),
  // ココナラ カタログ(coconala-services.ts)↔state(orders/kpi)↔sales.json の配線ドリフト検証（2026-07-16）
  s('check-coconala-wiring'),
  // ココナラ 受注スナップショット↔orders.json の突合（2026-08-05。オフライン検査・実体取得は npm run coconala-orders）
  s('check-coconala-orders', ['--staged', '--no-freshness'], { requireFile: true, failOnlyCode: 1 }),
  // ココナラブログ記事のハードゲート（2026-08-12。外部リンク1本でアカウント制限になりうるので commit 時点で止める）
  s('check-coconala-blog', ['--staged'], { requireFile: true, failOnlyCode: 1 }),
  // トップの資格カード(home-exam-cards.json)と categories.json の整合（公開済み新資格のトップ未掲載の再発防止）
  s('check-home-exam-coverage', []),
  // category-curriculum.json の slug 実在＋career タグ整合（カテゴリページ体系リストの slug 陳腐化・silent drop の再発防止）
  s('check-category-curriculum', []),
  // 分類語彙（領域×資格×記事型×タグ）の整合。staged MDX の group が許可外・未登録タグは赤、別名綴りと構造タグ不整合は警告
  // （全量のラチェットは quality-audit の check-content-taxonomy:ci）。規則は content-taxonomy.md
  s('check-content-taxonomy'),
  // 転職・キャリア記事が学習系ナビ一覧に混ざらないことを検証（career タグ ⇔ HIGH_INTENT/careerFeatured の整合）
  s('check-career-separation', []),
  // アフィリエイト A8 mat が SSOT 許可リスト(affiliate-mats.json)に存在するか検証（mat タイポ/未登録/失効の取りこぼし防止）
  s('check-affiliate-mats'),
  // affiliate-career-only 違反 prose（添削サービス/講座ブランド等の再提案）を検知（PR#272 取りこぼしの再発防止）
  // 2026-08-17 修正: node の直後に $? 判定が無く、間に check-affiliate-wiring の if 複合文が挟まっていたため、
  // 末尾の "if [ $? -ne 0 ]" は**複合文の終了ステータス（内側で exit しなければ常に 0）**を見ていた。
  // ＝ prose 違反で exit 1 しても commit が通る「壊れたゲート」だった。各 node の直後に判定を置く形へ揃える。
  s('check-affiliate-prose'),
  s('check-affiliate-wiring', ['--staged'], { requireFile: true, failMessage: '[pre-commit] アフィリ配線（3 ASP）に不整合。commit を中止しました。' }),
  // ポリシークラスタ（決定が複数文書に散在）の横展開もれリマインダ＋台帳 rot 検出（意味的ドリフトの再発防止）
  // クラスタ提示は advisory（exit 0）。台帳の files/anchor が実在しない場合のみ exit 1 でブロック。
  s('check-policy-anchors'),
  // ガイド記事（group: guide）の本文 3,000 字下限（薄い記事の再発防止、content-principles §25）
  s('check-guide-length'),
  // 本文フォールド内1枚目の図版は eager+fetchpriority=high（LCP 遅延の再発防止・EXP-005）
  s('check-lcp-image-hints'),
  // 定期ジョブが実行するファイルを実行対象外のブランチで変更していないか（WARN・非ブロッキング）
  // 「push 先 ≠ 実行ブランチ」の取り違え防止。検査の故障時のみ exit 1 なので判定は付ける。
  s('check-scheduled-exec-branch', ['--staged'], { requireFile: true }),
  // note 記事ハッシュタグは 90 個以上（発見性ゲート・staged の hashtags*.txt のみ）
  s('check-note-hashtags'),
  // 有料 note 記事の無料プレビュー内に「この記事でわかること」があるか（購入判断材料の欠落防止）
  s('check-note-intro-benefit'),
  // PDF 配布を約束している note 記事に、添付すべき PDF 実体があるか（購入者に届かない事故の source 側）
  s('check-note-attachments'),
  // note 有料記事の有料境界(paidBoundary)が解決可能か（全ロック/漏洩の温床＝RULE_GAP 再発防止）
  s('check-note-boundary'),
  // RCCM 問題III 模範論文の出題条件（1,200〜1,600 字・指定用語「」4 語以上・問題再現節なし）
  s('check-rccm-essay'),
  // コンクリート主任技士 小論文テーマ別教材の型と出題履歴ブロックの SSOT 一致
  s('check-cce-essay'),
  // frontmatter の重複キー（後勝ちで値が黙って入れ替わる）
  s('check-note-frontmatter-dup'),
  // ガイド OGP 主題フォントの下限（長い題が小さく出てカード間でばらつくのを防止、ogp-prompts.md）
  s('check-ogp-title-fit'),
  // note カバー(G2)の banner/hi/leadIn がフル1280幅を超えて画面外で切れる"真の溢れ"を検出（note-cover.md）
  s('check-note-cover-fit'),
  // 図版 SVG の固定キャンバス標準（figure-N.svg=4:5 400x500 / --wide=16:9 640x360）逸脱検出（figure-canvas-policy）
  s('check-figure-canvas'),
  // 孤立 figure（img/figure-*.svg が同記事の本文から未参照＝サイト非表示）検出（結線もれの再発防止）
  s('check-orphan-figures'),
  // 本文が指す「表N.M」のキャプションが実在するか（転記由来の宙に浮いた参照）
  s('check-table-references'),
  // MDX の <ArticleImage> width/height が SVG の実 viewBox と一致するか（キャンバス移行で埋込寸法が
  // 旧値のまま取り残される穴。check-figure-canvas は SVG 側しか見ない・2026-08-03 に 26 箇所を是正）
  s('check-figure-embed-dims'),
  // 太字が描画されるか（閉じ/開き ** が flanking を満たさないとアスタリスクが本文に出る）。
  // 規則を再実装せず remark で実パースし、text ノードに ** が残るかで判定する。
  s('check-bold-rendering'),
  // GFM テーブルが table になるか（ならないとパイプ区切りが生テキストで表示される）。
  // 2026-08-28: 改行の \r\r\n 破損で過去問18本、セル数不一致で r02-primary が該当した。
  // 原因ごとにルールを足さず、デリミタ行が text ノードに残る症状そのものを見る。
  s('check-table-rendering'),
  // MDX の BOM（U+FEFF）。先頭に付くと frontmatter の ^--- が外れ、Kindle ビルダが title を
  // 拾えず章名が article.mdx になり YAML が本文に印字される（2026-08-12・審査中の e-02 で発生）。
  // 目視できない事故なので機械で止める。EPUB 展開は重いので commit 時は --bom-only。
  s('check-kindle-epub-leak', ['--bom-only'], {}),
  // note→サイト送客リンクの UTM 規約（生URL単独行=カード化でUTM消失 / inline は utm_source=note 必須）。SKIP_NOTE_UTM=1 で回避
  s('check-note-site-utm'),
  // X→サイト送客リンクの UTM 規約（utm_source=x / utm_medium=social 必須・_archive は対象外）。SKIP_X_UTM=1 で回避
  s('check-x-utm'),
  // IG figure-pack 表紙のテンプレ準拠（2ピル/固定バッジ/doboku-note.com/試験dir配下）逸脱検出（表紙ドリフトの再発防止）
  s('check-ig-cover'),
  // IG figure-pack CTA のテンプレ準拠（見出し/誘導文/画像内ハッシュタグ禁止）逸脱検出（CTAドリフトの再発防止）
  s('check-ig-cta'),
];

/** touches が投げたら（設定が読めない等）走らせる側に倒す */
function touchesSafe(step, ctx) {
  try {
    return step.touches(ctx);
  } catch {
    return true;
  }
}

/**
 * 回す検査を、旧フックと同じ順・同じ条件で決める（純関数）。
 * @param {object} ctx
 * @param {string[]} ctx.staged            `git diff --cached --name-only`（削除を含む）
 * @param {{ status: string, path: string }[]} ctx.entries  `git diff --cached --name-status --no-renames`（改名は削除＋追加）
 * @param {string[]} ctx.stagedAny         同上（docs/ 判定用。pathspec の docs/ は削除も当たる）
 * @param {string[]} ctx.contentQualityFiles  staged の content/site/**\/*.mdx（ACMR）のうち published: true のもの
 * @param {Record<string,string|undefined>} ctx.env
 * @param {(script: string) => boolean} ctx.exists  script がツリーにあるか
 * @returns {{ step: object, argv: string[] }[]}
 */
export function planSteps(ctx, steps = STEPS) {
  const plan = [];
  for (const step of steps) {
    if (step.skipEnv) {
      const v = ctx.env[step.skipEnv.name];
      if (step.skipEnv.mode === 'eq1' ? v === '1' : v !== undefined && v !== '') continue;
    }
    if (step.requireFile && !ctx.exists(step.script)) continue;
    if (step.when && !step.when(ctx)) continue;
    if (step.touches && !touchesSafe(step, ctx)) continue;
    plan.push({ step, argv: typeof step.args === 'function' ? step.args(ctx) : step.args });
  }
  return plan;
}

/** 旧フックの `[ $? -ne 0 ]`（failOnlyCode があるものは `[ $? -eq 1 ]`）に当たるか */
export function isFailure(step, code) {
  if (step.failOnlyCode !== undefined) return code === step.failOnlyCode;
  return code !== 0;
}
