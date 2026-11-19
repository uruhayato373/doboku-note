// .claude/ にコードを置かない。CI やテストが読むコードは scripts/ に置く（2026-11-19 に .claude の scripts ディレクトリとスキルの中のコードを移した）。
// .claude/ はエージェント運用（手順書・定義・ルール・設定・状態）の置き場で、ここへコードが戻るのを止める。
// 廃止した旧い置き場への新規ファイルと旧パスの文字列は check-information-architecture が止める（repository-paths.mjs の MOVED_PATHS）。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { FONTS_REL, REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const list = (out) => out.split('\0').filter(Boolean);

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
