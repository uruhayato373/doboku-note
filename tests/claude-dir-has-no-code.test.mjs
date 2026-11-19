// .claude/ にコードを置かない。CI やテストが読むコードは scripts/ に置く（2026-11-19 に .claude/scripts/ とスキルの中のコードを移した）。
// .claude/ はエージェント運用（手順書・定義・ルール・設定・状態）の置き場で、ここへコードが戻るのを止める。
// 転送の 9 本を消すとき（DN-1249）に SHIMS を空にし、MOVED_PATHS の禁止ルートへ引き継ぐ。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { FONTS_REL, REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const OLD = '.claude/scripts';
// main のワークフローと Mac に導入済みの weekly-review.sh が旧パスで呼ぶ間だけ残す転送
const SHIMS = ['append-coverage-history', 'build-doc-meta-index', 'check-coverage-thresholds', 'check-daily-anomaly', 'check-data-integrity', 'inspect-url', 'inspection-cycle', 'list-sitemap-urls', 'snapshot-weekly-metrics']
  .map((n) => `${OLD}/${n}.mjs`);
// 旧パスの文字列を書いてよいファイル（理由つき）
const MENTION_OK = new Set([
  'tests/claude-dir-has-no-code.test.mjs', // この検査
  'knip.json', // 転送の 9 本を entry にしている（DN-1249 で消す）
  '.claude/todo/backlog.md', // DN-1249・DN-1016 の説明
  '.claude/memory/feedback_script_move_main_workflow_shim.md', // 集約の経緯の記録
  '.claude/knowledge/reference/information-architecture.md', // 廃止したことの記述
  'scripts/pdf-to-mdx/book-ocr/README.md', // Obsidian vault 側の .claude/scripts/ocr/
  'scripts/pdf-to-mdx/book-ocr/book_ocr_machine.py', // 同上
  'data/analysis/affiliate-opportunities/2026-09-08.json', // 過去の記録（書き換えない）
]);

const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const list = (out) => out.split('\0').filter(Boolean);

test('.claude/scripts/ にあるのは転送の 9 本だけで、中身は転送だけ', () => {
  const tracked = list(git('ls-files', '-z', OLD)).sort();
  assert.deepEqual(tracked, [...SHIMS].sort(), 'スクリプトは scripts/ に置く（.claude/scripts/ は廃止した置き場）');
  for (const f of tracked) {
    const src = readFileSync(join(REPO_ROOT, f), 'utf8');
    assert.ok(src.split('\n').length <= 12 && src.includes(`scripts/${f.slice(OLD.length + 1)}`), `${f} は scripts/ の同名を呼ぶ転送だけにする`);
  }
});

test('旧パス .claude/scripts を書いているファイルが無い', () => {
  const all = list(git('ls-files', '-z'));
  assert.ok(all.length > 1000, `追跡ファイルが ${all.length} 件＝検査不成立（git が読めていない）`);
  let hits = [];
  try {
    hits = list(git('grep', '-l', '-z', '-I', '-F', OLD, '--', '.'));
  } catch (e) {
    if (e.status !== 1) throw e; // 1 は該当なし
  }
  const bad = hits.filter((f) => !MENTION_OK.has(f));
  assert.deepEqual(bad, [], `旧パスが残っている（scripts/ に直す）: ${bad.join(', ')}`);
});

// スキルの scripts/ はそのスキルだけが使うもの。package.json・CI から呼ぶ事業の実装は scripts/ に置く（2026-11-19 に 22 本を移した）。
const SKILL_SHIMS = ['.claude/skills/ogp-create/scripts/ogp-create.mjs']; // main の ogp-supply.yml が旧パスで呼ぶ間だけ残す転送（DN-1249）

test('package.json と workflow は .claude/skills/ のコードを呼ばない', () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  const entries = Object.entries(pkg.scripts ?? {});
  const workflows = list(git('ls-files', '-z', '.github/workflows')).filter((f) => /\.ya?ml$/.test(f));
  assert.ok(entries.length > 100 && workflows.length > 5, `npm script ${entries.length} 件・workflow ${workflows.length} 本＝検査不成立`);
  const bad = [
    ...entries.filter(([, cmd]) => cmd.includes('.claude/skills/')).map(([name]) => `package.json: ${name}`),
    ...workflows.filter((f) => readFileSync(join(REPO_ROOT, f), 'utf8').includes('.claude/skills/')),
  ];
  assert.deepEqual(bad, [], `事業の実装は scripts/ に置く: ${bad.join(', ')}`);
  for (const f of SKILL_SHIMS) {
    const src = readFileSync(join(REPO_ROOT, f), 'utf8');
    assert.ok(src.split('\n').length <= 12 && src.includes('spawnSync'), `${f} は転送だけにする`);
  }
});

// .claude/ に置いてよいコードは、理由のあるこの一覧だけ（増やすときは理由を書く）。
// 実行しない保存物（check-shadcn-parity が比べる shadcn/ui 公式の写し）は基準のデータなので数えない
const REFERENCE_DATA = '.claude/config/shadcn-reference/';
const CODE_OK = [
  // 保存済みワークフローの置き場はハーネスが決めている
  '.claude/workflows/book-coverage-expand.js',
  '.claude/workflows/book-coverage-photos.js',
  '.claude/workflows/series-chapter.js',
  '.claude/workflows/video-factory.js',
  // Obsidian vault が正本の配布物（3 プロジェクト共通・手編集しない）
  '.claude/shared-policy/check-local-data.mjs',
  '.claude/shared-policy/sync.mjs',
  // main のワークフローが旧パスで呼ぶ間だけ残す転送（DN-1249 で消す）
  ...SHIMS,
  ...SKILL_SHIMS,
];

test('.claude/ の下にコードを置かない（理由のある一覧だけ）', () => {
  const tracked = list(git('ls-files', '-z', '.claude'));
  assert.ok(tracked.length > 500, `.claude の追跡ファイルが ${tracked.length} 件＝検査不成立（git が読めていない）`);
  const code = tracked.filter((f) => /\.(?:mjs|cjs|js|jsx|ts|tsx|mts|py|sh|ps1)$/.test(f) && !f.startsWith(REFERENCE_DATA)).sort();
  assert.deepEqual(code, [...CODE_OK].sort(), 'コードは scripts/ に置く（スキルのスクリプトは scripts/<スキル名>/）。.claude/ に置くのは手順書・定義・設定・状態だけ');
});

// 生成する画像が共用するフォントは scripts/assets/fonts/ の 1 か所（2026-11-19 に ogp-create スキルの下から移した）。
// 場所は repository-paths.mjs の FONTS_ROOT / FONTS_REL から引き、各スクリプトが文字列で持たない。
test('フォントは scripts/assets/fonts/ だけに置き、場所を文字列で持つのは repository-paths だけ', () => {
  const fonts = list(git('ls-files', '-z')).filter((f) => /\.(?:ttf|otf|woff2?)$/i.test(f));
  assert.ok(fonts.length >= 2, `追跡しているフォントが ${fonts.length} 本＝検査不成立`);
  assert.deepEqual(fonts.filter((f) => !f.startsWith(`${FONTS_REL}/`)), [], 'フォントは scripts/assets/fonts/ に置く');
  let hits = [];
  try {
    hits = list(git('grep', '-l', '-z', '-I', '-F', '-e', FONTS_REL, '-e', 'ogp-create/assets', '--', 'scripts', 'tests', 'tools', 'src'));
  } catch (e) {
    if (e.status !== 1) throw e; // 1 は該当なし
  }
  const OK = new Set(['scripts/lib/repository-paths.mjs', 'tests/git-binary-policy.test.mjs', 'tests/claude-dir-has-no-code.test.mjs']); // 定義・バイナリ方針の免除の検査・この検査
  assert.deepEqual(hits.filter((f) => !OK.has(f)), [], 'フォントの場所は FONTS_ROOT / FONTS_REL から引く');
});
