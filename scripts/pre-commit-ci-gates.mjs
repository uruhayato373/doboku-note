#!/usr/bin/env node
/**
 * pre-commit-ci-gates.mjs — CI の ci:true 検査のうち、develop 直 push で実際に赤を出してきた速いものを
 * staged の範囲で先に回す（pre-commit では scripts/pre-commit-mdx.mjs の先頭から runGates を呼ぶ）。
 *
 * コンテンツは PR を通らず develop へ直 push されるので、CI で初めて落ちると develop が赤いまま
 * 無関係な PR まで巻き込む（2026-09-30〜10-05 の develop push 200 回中 26 回が赤。
 * note-paid-cta 9 連続・katex-warnings 4 連続・x-review 1 回）。ここに置くのは手元で数秒の検査だけ。
 * products（商品の正本 config/products.json と、その写し・生成物）は 2026-10-06 に足した（記事の price を手で直すと正本とずれる）。
 * unit-tests の全量（手元 286 秒）は CI に残し、ここでは staged に関係する速いテストだけを回す（UNIT_TEST_RULES・DN-0790）。generated-indexes（全量 62 秒・Windows では検査不成立）も全量は CI に残し、
 * ここでは note 記事カタログ（.claude/state/note-published.json・0.5 秒）だけを見る（2026-10-06 に note の題名変更と
 * 下書きの追加で作り直しを忘れ、develop を 2 回赤くした）。
 *
 * 検査の id は scripts/quality-audit.mjs の CHECKS と同じ名前にする（CI で同じものが全量で走る）。
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { datasetPath } from './lib/datasets.mjs';

/** スクリプト・ワークフロー・スキル・管理画面のコード（サイトの src/ は CI の全量に任せる） */
const CODE_FILE = /^(scripts|tools|\.claude\/(scripts|workflows|skills|hooks))\/.+\.(mjs|cjs|js|ts|tsx)$/;

/**
 * staged のパス → 先に回す unit-tests のファイル。CI の unit-tests の全量（手元 286 秒）は回さず、実データを読んで
 * コンテンツや台帳の追加で落ちるテストだけを拾う。各行の回数は 09-14〜10-20 に develop の CI で落ちた回数（DN-0790）。
 */
export const UNIT_TEST_RULES = [
  // スクリプトの書き方の規約（git の同期呼び出しの maxBuffer・パスを列挙する git の core.quotepath=false・読む環境変数の .env.example）。
  // 2026-10-10 に新しいスクリプトがこの 2 つのテストで CI で初めて落ちた（#951・#953）。全量の走査で手元 1 秒弱
  { match: (f) => CODE_FILE.test(f), tests: ['tests/git-exec-maxbuffer.test.mjs', 'tests/env-example.test.mjs'] },
  // 共通部品の写し・readJson の写しのラチェット（scripts・.claude・tools・tests を走査する）。tests の変更でも回す
  // （2026-10-21 の #1167 でテストの中の自前の escapeRegExp が CI で初めて落ちた・手元 1 秒）
  { match: (f) => CODE_FILE.test(f) || /^tests\/.+\.m?js$/.test(f), tests: ['tests/script-helpers-ratchet.test.mjs', 'tests/read-json-ratchet.test.mjs'] },
  // 公的基準の章を足すと、章の OGP の退避台帳と孤児判定が落ちる（31 回・手元 5 秒）
  { match: (f) => f.startsWith('content/site/standards-articles/') || f === datasetPath('config.asset-storage'), tests: ['tests/standards-ogp-guards.test.mjs'] },
  // note 記事を足すと、カバーの分類・テーマの分類・マガジンのラベルの分類が落ちる（12 回・12 回・7 回）
  { match: (f) => /^content\/note\/.+\/article(-[^/]+)?\.md$/i.test(f), tests: ['tests/note-cover-category.test.mjs', 'tests/content-theme.test.mjs', 'tests/magazine-membership.test.mjs'] },
  // サイト記事を足すと、転職記事の柱分類（10 回・10 回）と横断トピックの配線（7 回）が落ちる
  { match: (f) => /^content\/site\/.+\.mdx$/.test(f), tests: ['tests/career-funnel-report.test.mjs', 'tests/career-pathways.test.mjs'] },
  // 展開の判断材料・シリーズ企画の実データ（8 回・8 回）
  { match: (f) => ['config.market-scan', 'config.competitors', 'config.product-lineup', 'config.qualification-registry', 'note.sales', 'coconala.orders'].map((id) => datasetPath(id)).includes(f), tests: ['tests/qualification-market.test.mjs'] },
  { match: (f) => [datasetPath('config.content-series'), datasetPath('config.content-series-basis')].includes(f), tests: ['tests/content-series.test.mjs'] },
  // 通常動画の台本・メタデータ（8 回）
  { match: (f) => f.startsWith('content/sns/video-packs/') || f === datasetPath('config.youtube-production-disclosure'), tests: ['tests/youtube-authority-metadata.test.mjs'] },
  // 設定・記録の JSON の型の実データ（ココナラの返信期限・受注の写し・GSC の取得結果など 6〜5 回。手元 3 秒）
  { match: (f) => /^(config|data)\/.+\.json$/.test(f), tests: ['tests/dataset-schemas.test.mjs', 'tests/dataset-schemas-search.test.mjs'] },
  // docs の backlog 参照（30 回）。別セッションがカードを閉じて参照が切れる分は CI に残る（DN-0791）
  { match: (f) => /^docs\/.+\.md$/.test(f) || f === '.claude/todo/backlog.md', tests: ['tests/project-task-refs.test.mjs'] },
];

/** staged のファイルに当たるテスト（重複なし・規則の順） */
export function unitTestsFor(files) {
  return [...new Set(UNIT_TEST_RULES.filter((r) => files.some((f) => r.match(f))).flatMap((r) => r.tests))];
}

export const GATES = [
  {
    id: 'katex-warnings',
    match: (f) => /^content\/site\/.+\.mdx$/.test(f),
    // 1 ファイル 1 秒弱。staged の MDX だけを渡す
    cmd: (files) => ['node', 'scripts/audit-katex-warnings.mjs', '--strict', ...files],
  },
  {
    id: 'note-paid-cta',
    match: (f) => f.startsWith('content/note/') || f === datasetPath('config.note-funnel'),
    // ファイル指定が無いので全量（手元 6 秒）
    cmd: () => ['node', 'scripts/wire-note-paid-cta.mjs', '--check'],
  },
  {
    id: 'search-improvements',
    // 検索改善の実験とカードの結び付き（実験台帳・backlog・dispatch-log・検索キーワード戦略の設定）。全量で 1 秒
    match: (f) => [datasetPath('business.experiments'), datasetPath('config.search-strategy'), datasetPath('state.dispatch-log'), '.claude/todo/backlog.md'].includes(f),
    cmd: () => ['node', 'scripts/check-search-improvements.mjs'],
  },
  {
    id: 'x-review',
    match: (f) => f.startsWith('content/sns/x/'),
    cmd: () => ['node', 'scripts/check-x-review.mjs'],
  },
  {
    id: 'products',
    // 商品の正本（全チャネル・記事の単品価格）と、その写し・生成物（記事の price・掲載文・note-magazines.ts・coconala-services.ts・Kindle の catalog.json）
    match: (f) =>
      f === datasetPath('config.products') ||
      /^content\/note\/.+\/(article(-[^/]+)?\.md|note掲載文\.txt)$/.test(f) ||
      ['src/lib/note-magazines.ts', 'src/lib/coconala-services.ts', 'scripts/kindle-published/catalog.json'].includes(f),
    // ファイル指定が無いので全量（手元 7 秒）
    cmd: () => ['node', 'scripts/check-products.mjs'],
  },
  {
    id: 'affiliate-placements',
    // 転職アフィリエイトの配置ルールと、それが突き合わせる正本（案件・広告リンク・面の語彙・カテゴリ・実験・素材・MDX の手書きカード）
    match: (f) =>
      [
        datasetPath('config.affiliate-placements'),
        datasetPath('config.affiliate-mats'),
        datasetPath('config.cta-placements'),
        datasetPath('affiliate.catalog'),
        datasetPath('business.experiments'),
        'src/config/categories.json',
        'src/config/affiliate-creatives.ts',
      ].includes(f) || /^content\/site\/.+\.mdx$/.test(f),
    // ファイル指定が無いので全量（手元 1 秒・MDX 1,350 件の走査込み）。MDX は手書きの <CareerAffiliate> がルールに覆われているかを見る
    cmd: () => ['node', 'scripts/check-affiliate-placements.mjs'],
  },
  {
    id: 'image-assets',
    // 記事の画像（図の SVG・写真）のサイズ上限と危険なファイル名。2026-10-09 に書籍の網羅の展開で、10KB を超えた図 2 枚が CI で初めて落ち develop を赤くした
    match: (f) => /^content\/site\/.+\/img\/[^/]+\.(svg|png|jpe?g|webp)$/i.test(f),
    // 全量（手元 1 秒）。新規の超過と増えた超過だけを止める（既存は baseline）
    cmd: () => ['node', 'scripts/check-image-assets.mjs', '--ci'],
  },
  {
    id: 'keiken-answer-split',
    // 1級・2級の経験記述の解答欄の割り振り。2026-10-09 に書籍の網羅の展開で足した 1 文が CI で初めて落ち develop を赤くした（DN-0615）
    match: (f) => /^content\/(site\/civil-construction-[12]\/.+\.mdx|note\/.+\/article(-[^/]+)?\.md|kindle\/.+\.md)$/.test(f),
    // 全量（手元 3 秒）
    cmd: () => ['node', 'scripts/check-keiken-answer-split.mjs'],
  },
  {
    id: 'unit-tests',
    // CI の unit-tests のうち、staged に関係する速いテストだけ（全テストは CI）。何を回すかは UNIT_TEST_RULES
    match: (f) => UNIT_TEST_RULES.some((r) => r.match(f)),
    cmd: (files) => ['node', '--test', ...unitTestsFor(files)],
  },
  {
    id: 'knip-ratchet',
    // 使われていないファイル・export の増加。2026-10-10 に .claude/workflows/ の 2 本が CI で初めて落ちた（#953）。手元 4 秒
    match: (f) => CODE_FILE.test(f),
    cmd: () => ['node', 'scripts/check-knip-ratchet.mjs'],
  },
  // ---- 2026-10-20 に足した台帳・配線の整合（DN-0790）。09-14〜10-20 に develop の CI を赤くした回数（失敗した実行の数）を
  // 添える。どれも全量で手元 1 秒前後なので、ファイル指定なしで回す。
  {
    id: 'content-series',
    // シリーズ企画の台帳と骨子・記事の実在（8 回）
    match: (f) => [datasetPath('config.content-series'), datasetPath('config.content-series-basis')].includes(f) || f.startsWith('content/sources/series/') || /^content\/site\/.+\.mdx$/.test(f),
    cmd: () => ['node', 'scripts/check-content-series.mjs'],
  },
  {
    id: 'content-registry',
    // コンテンツ台帳 R01〜R13（8 回）。比較元（--base）が無いときは遷移の比較を飛ばして形と参照だけを見る
    match: (f) => f.startsWith('content/registry/'),
    cmd: () => ['node', 'scripts/check-content-registry.mjs'],
  },
  {
    id: 'qualification-market',
    // 展開の判断材料（市場スキャン・競合・売上と受注の資格への分類）（8 回）
    match: (f) => ['config.market-scan', 'config.competitors', 'config.product-lineup', 'config.qualification-registry', 'note.sales', 'coconala.orders'].map((id) => datasetPath(id)).includes(f),
    cmd: () => ['node', 'scripts/check-qualification-market.mjs'],
  },
  {
    id: 'topic-wiring',
    // 横断トピックの記事の配線（7 回）
    match: (f) => /^content\/site\/.+\.mdx$/.test(f) || f === 'src/config/topics.json',
    cmd: () => ['node', 'scripts/check-topic-wiring.mjs'],
  },
  {
    id: 'review-wiring',
    // 週次・月次レビューのスキルが実行するコマンドと配線の正本（6 回）
    match: (f) => f === '.claude/config/review-wiring.json' || /^\.claude\/skills\/management\/(weekly|monthly)-review\//.test(f) || f === 'package.json',
    cmd: () => ['node', 'scripts/check-review-wiring.mjs'],
  },
  {
    id: 'gate-parity',
    // check-* の npm script が quality-audit か pre-commit のどちらかに結ばれているか（5 回）
    match: (f) => ['package.json', 'scripts/quality-audit.mjs', 'scripts/lib/pre-commit-steps.mjs', '.claude/config/gate-parity-baseline.json'].includes(f),
    cmd: () => ['node', 'scripts/check-gate-parity.mjs', '--ci'],
  },
  {
    id: 'domains',
    // 領域の正本と、スキル・エージェントの domain・文書の割り当て・管理画面の画面（4 回）
    match: (f) => [datasetPath('config.domains'), datasetPath('config.annual-roadmap')].includes(f) || /^\.claude\/(skills\/.+\/SKILL|agents\/[^/]+|knowledge\/reference\/[^/]+)\.md$/.test(f) || /^docs\/.+\.md$/.test(f) || /^tools\/admin-app\/src\/app\/.+\/page\.tsx$/.test(f),
    cmd: () => ['node', 'scripts/check-domains.mjs'],
  },
  {
    id: 'orphan-ogp',
    // 公的基準の章を消したのに OGP の退避台帳に残る（34 回・10/16 の章の削除 1 件で 30 回）。全量で手元 1 秒弱
    match: (f) => f.startsWith('content/site/standards-articles/') || f === datasetPath('config.asset-storage'),
    cmd: () => ['node', 'scripts/check-orphan-ogp.mjs'],
  },
  {
    id: 'youtube-shorts',
    // 動画パックの Shorts の本数・公開枠の重複・1 日の上限（8 回）。全量で手元 1 秒弱
    match: (f) => f.startsWith('content/sns/video-packs/') || f.startsWith('content/registry/'),
    cmd: () => ['node', 'scripts/check-youtube-video-pack-shorts.mjs'],
  },
  {
    id: 'generated-indexes',
    // note 記事カタログの入力（記事の frontmatter・マガジンの正本の生成物・収録の期待値）。カタログ以外の生成物は CI の全量に任せる
    match: (f) =>
      /^content\/note\/.+\/article(-[^/]+)?\.md$/i.test(f) ||
      f === 'src/lib/note-magazines.ts' ||
      f === datasetPath('config.note-magazine-membership'),
    cmd: () => ['node', '.claude/scripts/build-note-published-index.mjs', '--check', '--staged'],
  },
];

/** staged のファイル一覧から、回す検査とその対象ファイルを決める */
export function planGates(stagedFiles) {
  return GATES.map((g) => ({ ...g, files: stagedFiles.filter(g.match) })).filter((g) => g.files.length > 0);
}

function stagedFiles() {
  const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\0').filter(Boolean);
}

/**
 * staged に応じた検査を回し、落ちた検査の id を返す。
 * pre-commit からは scripts/pre-commit-mdx.mjs が呼ぶ（フック本体を変えると共有フックの入れ直しが
 * 全ワークツリー・Mac に要るので、毎回呼ばれている既存スクリプトに相乗りする）。
 */
export function runGates(staged = stagedFiles()) {
  const plan = planGates(staged);
  const failed = [];
  for (const g of plan) {
    const [bin, ...args] = g.cmd(g.files);
    const r = spawnSync(bin, args, { encoding: 'utf8', shell: false });
    if (r.status !== 0) {
      failed.push(g.id);
      process.stdout.write(`${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-25).join('\n') + '\n');
    }
  }
  if (plan.length > 0) {
    const ran = plan.map((g) => `${g.id}(${g.files.length})`).join(' ');
    console.log(`[pre-commit-ci-gates] staged ${staged.length} ファイル / 実行 ${plan.length} 検査: ${ran} / 失敗 ${failed.length}`);
  }
  if (failed.length) {
    console.log(`[pre-commit-ci-gates] CI（quality:audit:ci）で落ちる違反がある: ${failed.join(', ')}。直してから commit する`);
  }
  return failed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const staged = stagedFiles();
  const failed = runGates(staged);
  if (planGates(staged).length === 0) console.log(`[pre-commit-ci-gates] staged ${staged.length} ファイル / 該当する検査なし`);
  process.exitCode = failed.length ? 1 : 0;
}
