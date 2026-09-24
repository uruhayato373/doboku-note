import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { isXCardPng, listScopedXCardPngs, parseLsFilesZ } from '../scripts/lib/x-card-render-scope.mjs';

test('isXCardPng: content/sns/x 配下の img/*.png だけを対象にし、_archive* は除く', () => {
  assert.equal(isXCardPng('content/sns/x/draft/073-a/img/tweet-01-card.png'), true);
  assert.equal(isXCardPng('content/sns/x/draft/073-a/cover.png'), false);
  assert.equal(isXCardPng('content/sns/x/draft/073-a/img/tweet-01.svg'), false);
  assert.equal(isXCardPng('content/sns/x/_archive-old-account/001/img/tweet-01.png'), false);
  assert.equal(isXCardPng('content/sns/instagram/001/img/slide-01.png'), false);
});

test('parseLsFilesZ: NUL 区切りを分割し、日本語パスもそのまま返す', () => {
  assert.deepEqual(parseLsFilesZ('a.png\0content/sns/x/日本語/img/b.png\0'), ['a.png', 'content/sns/x/日本語/img/b.png']);
  assert.deepEqual(parseLsFilesZ(''), []);
});

test('listScopedXCardPngs: git 列挙の失敗は ok:false（呼び出し側で検査不成立）', () => {
  const r = listScopedXCardPngs('/nowhere', () => { throw new Error('not a git repository'); });
  assert.equal(r.ok, false);
  assert.match(r.error, /not a git repository/);
});

test('listScopedXCardPngs: .gitignore 済み PNG はディスクにあっても対象にならない（DN-0259）', () => {
  const root = mkdtempSync(join(tmpdir(), 'dn-x-card-scope-'));
  // フック内から走っても親リポジトリを触らないよう GIT_DIR 等を外す。
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  const git = (...args) => execFileSync('git', args, { cwd: root, env, stdio: 'pipe' });
  try {
    git('init', '-q');
    const put = (rel) => { mkdirSync(join(root, rel, '..'), { recursive: true }); writeFileSync(join(root, rel), 'png'); };
    writeFileSync(join(root, '.gitignore'), 'content/sns/x/draft/*-diagrams/img/tweet-*.png\n');
    put('content/sns/x/draft/073-card/img/tweet-01-card.png'); // 追跡済み
    put('content/sns/x/draft/074-new/img/tweet-01-card.png'); // 未追跡だが ignore されていない
    put('content/sns/x/draft/098-cem-textbook-diagrams/img/tweet-01-a.png'); // ignore 済み
    put('content/sns/x/_archive-old/001/img/tweet-01.png'); // 旧アカウント保管
    git('add', '.gitignore', 'content/sns/x/draft/073-card/img/tweet-01-card.png');
    const r = listScopedXCardPngs(root, (args) => git(...args));
    assert.equal(r.ok, true);
    assert.deepEqual(r.pngs, [
      'content/sns/x/draft/073-card/img/tweet-01-card.png',
      'content/sns/x/draft/074-new/img/tweet-01-card.png',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
