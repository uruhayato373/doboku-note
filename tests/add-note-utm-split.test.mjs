// add-note-utm が分割原稿（article-II1.md など）のフォルダでも UTM と utm_term を付ける（DN-1060）。
// 以前は article.md だけを探していたので、check-note-site-utm の案内どおりに回すと「no note directory matches」で落ちた。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = resolve(import.meta.dirname, '..');
// スクリプトの置き場は content/note に固定なので、一意な名前のフォルダを作って最後に消す
const name = `zz-test-add-note-utm-${process.pid}`;
const dir = join(repo, 'content/note', name);

const article = (title) => `---
title: ${title}
utmCampaign: test-split
noteId: n0123456789ab
---

本文 https://doboku-note.com/exam/pe-construction を読む。
`;

test('分割原稿だけのフォルダで、すべての原稿に UTM と utm_term が付く', () => {
  mkdirSync(dir, { recursive: true });
  try {
    for (const f of ['article-II1.md', 'article-III.md']) writeFileSync(join(dir, f), article(f));
    const r = spawnSync(process.execPath, [join(repo, 'scripts/note/add-note-utm.mjs'), name], { cwd: repo, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    for (const f of ['article-II1.md', 'article-III.md']) {
      const body = readFileSync(join(dir, f), 'utf8');
      assert.match(body, /utm_source=note/, f);
      assert.match(body, /utm_campaign=test-split/, f);
      assert.match(body, /utm_term=n0123456789ab/, f);
      assert.match(r.stdout, new RegExp(`${name}/${f.replace('.', '\\.')}`));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
