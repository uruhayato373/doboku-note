// DN-0706: 技術士一次の直前パック専用の POP 画像が、冒頭・資格トップ・サイドバーだけに出ることを固定する。
// 本文中の案内（MagazineHeroCta・MagazineInlineCard）は EXP-053 の対象なので、画像の案は教材パック共通のまま変えない。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

test('直前パックの専用画像は surface=lead だけ。本文中の案内と他商品は変わらない', () => {
  const r = JSON.parse(execFileSync(process.execPath, [join(ROOT, 'node_modules/tsx/dist/cli.mjs'), '-e', `
    import { noteCtaImage } from './src/lib/note-cta-images.ts';
    const id = 'pe1-chokuzen-pack';
    process.stdout.write(JSON.stringify({
      leadBody: noteCtaImage(id, 'body', 'lead'), leadTile: noteCtaImage(id, 'tile', 'lead'),
      body: noteCtaImage(id, 'body'), tile: noteCtaImage(id, 'tile'),
      other: noteCtaImage('pe1-anki-note', 'body', 'lead'), otherPlain: noteCtaImage('pe1-anki-note', 'body'),
    }));
  `], { cwd: ROOT, encoding: 'utf8' }));
  assert.match(r.leadBody.src, /cta-lead-chokuzen-body-v1\.webp\?v=[a-f0-9]{12}$/);
  assert.match(r.leadTile.src, /cta-lead-chokuzen-tile-v1\.webp\?v=[a-f0-9]{12}$/);
  assert.equal(r.leadBody.width / r.leadBody.height, 2);
  assert.equal(r.leadTile.width / r.leadTile.height, 6 / 5);
  assert.match(r.body.src, /cta-pack-body-v1\.webp/);
  assert.doesNotMatch(r.tile.src, /cta-lead-chokuzen/);
  assert.equal(r.other.src, r.otherPlain.src);
  for (const f of ['MagazineHeroCta/MagazineHeroCta.tsx', 'MagazineInlineCard/MagazineInlineCard.tsx']) {
    assert.doesNotMatch(readFileSync(join(ROOT, 'src/components/ui', f), 'utf8'), /noteCtaImage\([^)]*'lead'/);
  }
});

test('記録した出力 SHA-256 が実ファイルと一致し、150KiB 以下', () => {
  const rec = JSON.parse(readFileSync(join(ROOT, 'content/site/pe-first-stage/_shared/pop-image.json'), 'utf8'));
  const lead = rec.leads['pe1-chokuzen-pack'];
  for (const f of ['body', 'tile']) {
    const out = lead[f].output;
    assert.ok(existsSync(join(ROOT, out.path)), out.path);
    const buf = readFileSync(join(ROOT, out.path));
    assert.equal(createHash('sha256').update(buf).digest('hex'), out.sha256);
    assert.ok(buf.length <= 150 * 1024);
    assert.ok(out.url.endsWith(`?v=${out.sha256.slice(0, 12)}`));
  }
});
