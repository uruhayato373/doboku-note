import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { MAX_CHARS, extractDescription, inspectAgent, ratchet } from '../scripts/check-agent-descriptions.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('extractDescription: 同一行と > 折り返しの両方を 1 行に畳む', () => {
  assert.equal(extractDescription('---\nname: a\ndescription: Plain one.\nmodel: sonnet\n---\n# body'), 'Plain one.');
  assert.equal(extractDescription('---\nname: a\ndescription: >\n  Folded line one.\n  Line two.\nmodel: sonnet\n---\n'), 'Folded line one. Line two.');
  assert.equal(extractDescription('---\r\nname: a\r\ndescription: CRLF ok.\r\n---\r\n'), 'CRLF ok.');
  assert.equal(extractDescription('no frontmatter'), null);
});

test('inspectAgent / ratchet: 新規超過と悪化だけが赤、baseline 内の据置と返済は緑', () => {
  const long = 'x'.repeat(MAX_CHARS + 50);
  const base = { over: inspectAgent('over-kept', `---\nname: over-kept\ndescription: ${long}\n---\n`) };
  const worse = inspectAgent('over-worse', `---\nname: over-worse\ndescription: ${long}y\n---\n`);
  const fresh = inspectAgent('fresh', `---\nname: fresh\ndescription: ${long}\n---\n`);
  const fine = inspectAgent('fine', '---\nname: fine\ndescription: Short. Use when user asks to [x].\n---\n');
  const repaid = inspectAgent('repaid', '---\nname: repaid\ndescription: Now short.\n---\n');
  const r = ratchet([base.over, worse, fresh, fine, repaid], { 'over-kept': MAX_CHARS + 50, 'over-worse': MAX_CHARS + 50, repaid: 400 });
  assert.deepEqual(r.newOver, [`fresh（${MAX_CHARS + 50}）`]);
  assert.deepEqual(r.worsened, [`over-worse（${MAX_CHARS + 50} → ${MAX_CHARS + 51}）`]);
  assert.deepEqual(r.repaid, ['repaid']);
  assert.ok(r.missingUseWhen.includes('fresh') && !r.missingUseWhen.includes('fine'));
  assert.equal(fine.useWhen, true);
});

test('CLI: 実 repo で baseline から増加なし（exit 0）と検査数を出力', () => {
  const out = execFileSync(process.execPath, [join(REPO, 'scripts', 'check-agent-descriptions.mjs')], { cwd: REPO, encoding: 'utf8' });
  assert.match(out, /全件 \d+ agent を実検査/);
  assert.match(out, /新規超過 0 \/ 悪化 0/);
});
