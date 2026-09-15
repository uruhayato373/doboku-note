import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * note.com へのリンクだけ referrer を渡す（note ダッシュボード「記事の流入元」で
 * doboku-note.com を計測するため）。それ以外の外部リンクは従来どおり noreferrer。
 */
function tsx(code) {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  return execFileSync(process.execPath, [cli, '-e', code], { cwd: ROOT, encoding: 'utf8' });
}

test('externalLinkRel: note.com は noopener のみ、他は noopener noreferrer', () => {
  const out = tsx(`
    import { externalLinkRel, isNoteUrl } from './src/lib/external-link-rel.ts';
    process.stdout.write(JSON.stringify({
      mag: externalLinkRel('https://note.com/dobokunote/m/m0123456789ab?utm_source=doboku-note'),
      note: externalLinkRel('https://note.com/dobokunote/n/n0123456789ab'),
      www: externalLinkRel('https://www.note.com/dobokunote'),
      root: externalLinkRel('https://note.com'),
      coconala: externalLinkRel('https://coconala.com/services/1'),
      lookalike: externalLinkRel('https://note.com.example.org/x'),
      http: externalLinkRel('http://note.com/dobokunote'),
      isNote: isNoteUrl('https://note.com/dobokunote'),
    }));
  `);
  const r = JSON.parse(out);
  assert.equal(r.mag, 'noopener');
  assert.equal(r.note, 'noopener');
  assert.equal(r.www, 'noopener');
  assert.equal(r.root, 'noopener');
  assert.equal(r.coconala, 'noopener noreferrer');
  assert.equal(r.lookalike, 'noopener noreferrer');
  assert.equal(r.http, 'noopener noreferrer');
  assert.equal(r.isNote, true);
});
