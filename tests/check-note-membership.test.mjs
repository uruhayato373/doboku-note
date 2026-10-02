import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 退役した会員（config/note-membership.json の retiredAt）の検査: 価格の写しを強制せず、SKIP と理由を出して緑にする。
// 「検査 0 件の緑」を OK と呼ばない（CLAUDE.md §9）。再開して retiredAt を消したらこのテストは不要になる（skip）。
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'config/note-membership.json'), 'utf8'));

test('退役済みの会員は mirrors を持たず、検査は SKIP と理由を出す（OK と呼ばない・--live も Playwright を起動しない）', { skip: !cfg.retiredAt }, () => {
  assert.deepEqual(cfg.mirrors, [], '退役した会員の価格を docs・コードへ強制し続けない');
  assert.ok(cfg.plans.length > 0 && cfg.plans.every((p) => p.published === false), '退役済みなのに公開中のプランがある');
  for (const args of [[], ['--live']]) {
    const out = execFileSync(process.execPath, [join(ROOT, 'scripts/check-note-membership.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 20_000 });
    assert.match(out, /SKIP: 退役済み（retiredAt=\d{4}-\d{2}-\d{2}）/);
    assert.doesNotMatch(out, /\] OK/, '検査 0 件を OK と報告している');
  }
});
