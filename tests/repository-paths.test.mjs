import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  REPO_ROOT, SITE_CONTENT_ROOT, DOCS_ROOT, MIGRATION_MAP, LEGACY_ROOTS,
  NOTE_CONTENT_ROOT, SNS_CONTENT_ROOT, COCONALA_BLOG_ROOT, KINDLE_CONTENT_ROOT, TEXTBOOK_SOURCES_ROOT,
} from '../scripts/lib/repository-paths.mjs';
import { inventory, findDualSsot } from '../scripts/audit-content-layout.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// 動的 import はパス文字列でなく file:// URL を渡す。Windows の絶対パスは `C:\...` で、
// ESM ローダーが `c:` をプロトコルと解釈して ERR_UNSUPPORTED_ESM_URL_SCHEME になる（OS 固有の偽赤）。
const PATHS_MODULE_URL = pathToFileURL(join(ROOT, 'scripts/lib/repository-paths.mjs')).href;

/**
 * 情報アーキテクチャ移行のパス基盤を固定する。
 *
 * 守りたい事故:
 *   - CWD 依存でルートが変わり、admin app や worktree から実行すると別の場所を見る
 *   - sha256 が非決定的で、移動前後の比較が意味をなさない
 *   - 新旧の両方に同じ相対パスが残る（二重 SSOT）のを見逃す
 *   - 移行先が未作成なのを「空＝移行済み」と誤読する
 */

test('パスは絶対で、リポジトリルート配下に閉じる', () => {
  assert.ok(isAbsolute(REPO_ROOT));
  for (const p of [DOCS_ROOT, SITE_CONTENT_ROOT]) {
    assert.ok(isAbsolute(p), `${p} が絶対パスでない`);
    assert.ok(p.startsWith(REPO_ROOT), `${p} が REPO_ROOT の外`);
  }
  assert.equal(REPO_ROOT, ROOT);
});

test('CWD がリポジトリルート以外でも解決結果が変わらない', () => {
  const code = "import('" + PATHS_MODULE_URL + "').then(m=>process.stdout.write(m.REPO_ROOT+'|'+m.SITE_CONTENT_ROOT))";
  const here = execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: ROOT, encoding: 'utf8' });
  const elsewhere = execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(here, elsewhere, 'CWD で解決結果が変わっている');
});

test('環境変数でルートを上書きできない（テスト都合で本番経路を変えない）', () => {
  const code = "import('" + PATHS_MODULE_URL + "').then(m=>process.stdout.write(m.REPO_ROOT))";
  const withEnv = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, REPO_ROOT: '/tmp/x', CONTENT_ROOT: '/tmp/y' },
  });
  assert.equal(withEnv, REPO_ROOT);
});

test('MIGRATION_MAP は新旧が重ならず、id が一意', () => {
  const ids = MIGRATION_MAP.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, 'id が重複');
  for (const m of MIGRATION_MAP) {
    assert.notEqual(m.legacy, m.target, `${m.id} の新旧が同一パス`);
    assert.ok(m.target.startsWith(REPO_ROOT) && m.legacy.startsWith(REPO_ROOT));
  }
});

// --- inventory の決定性と二重 SSOT 検出 ----------------------------------

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ia-audit-'));
  mkdirSync(join(dir, 'legacy', 'sub'), { recursive: true });
  mkdirSync(join(dir, 'target'), { recursive: true });
  writeFileSync(join(dir, 'legacy', 'a.md'), 'A');
  writeFileSync(join(dir, 'legacy', 'sub', 'b.png'), Buffer.from([1, 2, 3]));
  return dir;
}

test('sha256 が決定的（同じ内容なら 2 回とも同じ）', () => {
  const dir = fixture();
  try {
    const a = inventory(join(dir, 'legacy'));
    const b = inventory(join(dir, 'legacy'));
    assert.deepEqual(a.sha256, b.sha256);
    assert.equal(a.files, 2);
    assert.equal(a.bytes, 4);
    assert.deepEqual(a.byExt, { '.md': 1, '.png': 1 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('新旧に同じ相対パスがあれば二重 SSOT として検出する', () => {
  const dir = fixture();
  try {
    writeFileSync(join(dir, 'target', 'a.md'), 'A');
    const dual = findDualSsot(inventory(join(dir, 'legacy')), inventory(join(dir, 'target')));
    assert.deepEqual(dual, ['a.md']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('不在ディレクトリを空と混同せず exists:false で返す', () => {
  const missing = inventory(join(tmpdir(), 'no-such-dir-ia-test'));
  assert.equal(missing.exists, false);
  assert.equal(missing.files, 0);
  // 空だが存在するディレクトリとは区別される
  const dir = mkdtempSync(join(tmpdir(), 'ia-empty-'));
  try {
    const empty = inventory(dir);
    assert.equal(empty.exists, true);
    assert.equal(empty.files, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// 移行中は「移行元が観測でき、二重 SSOT が無い」ことを見ていた。全チャネルの移動が
// 終わったので契約を反転させる: **MIGRATION_MAP は空**で、旧配置が復活していないこと。
// 空を無検査で通さないため、移行先が実在して中身があることを別途数える。
test('移行は完了している — MIGRATION_MAP は空で、旧配置が復活していない', () => {
  const dual = MIGRATION_MAP.flatMap((m) => findDualSsot(inventory(m.legacy), inventory(m.target)));
  assert.deepEqual(dual, [], `二重 SSOT: ${dual.slice(0, 5).join(', ')}`);
  assert.deepEqual(MIGRATION_MAP, [], '未完了の移行が残っている（あるなら該当 Phase を完了させる）');
  assert.deepEqual(LEGACY_ROOTS, {}, '旧ルート定義が残っている（移行が済んだら定数ごと消す）');

  for (const legacy of ['docs/project', 'docs/ui', 'docs/note', 'docs/sns', 'docs/textbook', 'docs/coconala-blog', '.claude/content', '.local/r2/posts']) {
    assert.equal(inventory(join(REPO_ROOT, legacy)).exists, false, `旧配置が復活している: ${legacy}`);
  }
});

test('content/ の各チャネルに実体がある（空を PASS と呼ばない）', () => {
  const roots = {
    site: SITE_CONTENT_ROOT, note: NOTE_CONTENT_ROOT, sns: SNS_CONTENT_ROOT,
    'coconala/blog': COCONALA_BLOG_ROOT, kindle: KINDLE_CONTENT_ROOT, 'sources/textbook': TEXTBOOK_SOURCES_ROOT,
  };
  const counts = Object.fromEntries(Object.entries(roots).map(([k, v]) => [k, inventory(v).files]));
  for (const [name, n] of Object.entries(counts)) {
    assert.ok(n > 0, `content/${name} が空（移行に取りこぼしがある）: ${JSON.stringify(counts)}`);
  }
  // 規模の桁を固定して「1 ファイルだけ残った」を緑にしない
  assert.ok(counts.site > 4000, `content/site が少なすぎる: ${counts.site}`);
  assert.ok(counts.note > 4000, `content/note が少なすぎる: ${counts.note}`);
  assert.ok(counts.sns > 3000, `content/sns が少なすぎる: ${counts.sns}`);
});

test('content/kindle は Web 配信対象に含まれない（非公開原稿）', async () => {
  const { execFileSync } = await import('node:child_process');
  // Next の配信対象は src/ と public/。src からの参照は「コメント内の SSOT 案内」だけで、
  // ファイルを読み込んで配信する経路が無いことを固定する（Kindle 原稿は KDP 専用）。
  const hits = execFileSync(
    'git',
    ['-c', 'core.quotepath=false', 'grep', '-n', '-e', 'content/kindle', '--', 'src', 'public', 'next.config.mjs', 'next.config.js'],
    { encoding: 'utf8', cwd: ROOT, maxBuffer: 32 * 1024 * 1024 },
  ).split('\n').filter(Boolean);
  const nonComment = hits.filter((l) => !/:\s*(\/\/|\/\*|\*)/.test(l.replace(/^[^:]*:\d+:/, ':')));
  assert.deepEqual(nonComment, [], `Web 配信側から content/kindle を読んでいる: ${nonComment.join(' / ')}`);
});
