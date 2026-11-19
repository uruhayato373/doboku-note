// .claude/scripts/ は 2026-11-19 に scripts/ へ集約した置き場。ここへ戻らないことを止める。
// 転送の 9 本を消すとき（DN-1249）に SHIMS を空にし、MOVED_PATHS の禁止ルートへ引き継ぐ。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const OLD = '.claude/scripts';
// main のワークフローと Mac に導入済みの weekly-review.sh が旧パスで呼ぶ間だけ残す転送
const SHIMS = ['append-coverage-history', 'build-doc-meta-index', 'check-coverage-thresholds', 'check-daily-anomaly', 'check-data-integrity', 'inspect-url', 'inspection-cycle', 'list-sitemap-urls', 'snapshot-weekly-metrics']
  .map((n) => `${OLD}/${n}.mjs`);
// 旧パスの文字列を書いてよいファイル（理由つき）
const MENTION_OK = new Set([
  'tests/claude-scripts-retired.test.mjs', // この検査
  'knip.json', // 転送の 9 本を entry にしている（DN-1249 で消す）
  '.claude/todo/backlog.md', // DN-1249・DN-1016 の説明
  '.claude/memory/feedback_script_move_main_workflow_shim.md', // 集約の経緯の記録
  '.claude/knowledge/reference/information-architecture.md', // 廃止したことの記述
  '.claude/skills/pdf-to-mdx/scripts/book-ocr/README.md', // Obsidian vault 側の .claude/scripts/ocr/
  '.claude/skills/pdf-to-mdx/scripts/book-ocr/book_ocr_machine.py', // 同上
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
