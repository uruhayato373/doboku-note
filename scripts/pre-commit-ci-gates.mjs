#!/usr/bin/env node
/**
 * pre-commit-ci-gates.mjs — CI の ci:true 検査のうち、develop 直 push で実際に赤を出してきた速いものを
 * staged の範囲で先に回す（pre-commit では scripts/pre-commit-mdx.mjs の先頭から runGates を呼ぶ）。
 *
 * コンテンツは PR を通らず develop へ直 push されるので、CI で初めて落ちると develop が赤いまま
 * 無関係な PR まで巻き込む（2026-09-30〜10-05 の develop push 200 回中 26 回が赤。
 * note-paid-cta 9 連続・katex-warnings 4 連続・x-review 1 回）。ここに置くのは手元で数秒の検査だけ。
 * products（商品の正本 config/products.json と、その写し・生成物）は 2026-10-06 に足した（記事の price を手で直すと正本とずれる）。
 * unit-tests（手元 286 秒）は CI に残す。generated-indexes（全量 62 秒・Windows では検査不成立）も全量は CI に残し、
 * ここでは note 記事カタログ（.claude/state/note-published.json・0.5 秒）だけを見る（2026-10-06 に note の題名変更と
 * 下書きの追加で作り直しを忘れ、develop を 2 回赤くした）。
 *
 * 検査の id は scripts/quality-audit.mjs の CHECKS と同じ名前にする（CI で同じものが全量で走る）。
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { datasetPath } from './lib/datasets.mjs';

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
