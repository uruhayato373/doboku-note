import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { askCodexAboutImages, codexArgs, forgetCodexRun, generateWithCodex, generateWithCodexAsync } from '../scripts/lib/codex-image.mjs';

test('codexArgs: 作業フォルダ・モデル・指示文を渡す', () => {
  const a = codexArgs('/d', 'PROMPT', 'm1');
  assert.deepEqual(a.slice(0, 8), ['exec', '--json', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', '/d', '-m']);
  assert.ok(a.at(-1).includes('PROMPT'));
  assert.ok(!codexArgs('/d', 'P', null).includes('-m'));
});

const thread = (id) => `{"type":"thread.started","thread_id":"${id}"}\n`;

test('generateWithCodex: 自分の thread の画像だけを返す', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'codex-image-test-'));
  try {
    const imagesRoot = join(tmp, 'generated');
    mkdirSync(join(imagesRoot, 't1'), { recursive: true });
    writeFileSync(join(imagesRoot, 't1', 'a.png'), 'x');
    let seen;
    const ok = generateWithCodex('p', 'm', { tmp, imagesRoot, run: (args) => { seen = args; return thread('t1'); } });
    assert.ok(ok.endsWith('out.png') && existsSync(ok));
    assert.ok(seen.includes('m'));
    assert.equal(generateWithCodex('p', null, { tmp, imagesRoot, run: () => '' }), null, 'thread_id が無い');
    assert.equal(generateWithCodex('p', null, { tmp, imagesRoot, run: () => thread('none') }), null, '自分の画像が無い');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('generateWithCodexAsync: 並列でも別の実行の画像を取らない（DN-1036）', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'codex-image-test-'));
  try {
    const imagesRoot = join(tmp, 'generated');
    for (const id of ['t1', 't2', 't3']) {
      mkdirSync(join(imagesRoot, id), { recursive: true });
      writeFileSync(join(imagesRoot, id, `${id}.png`), id);
    }
    const outs = await Promise.all(['t1', 't2', 't3'].map((id) => generateWithCodexAsync('p', null, { tmp, imagesRoot, run: async () => thread(id) })));
    assert.deepEqual(outs.map((f) => readFileSync(f, 'utf8')), ['t1', 't2', 't3']);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('codexArgs: 添付の画像は -i で渡し、直後にフラグを置いて指示文を画像として読ませない', () => {
  const a = codexArgs('/d', 'PROMPT', null, ['/x/crop.png']);
  const i = a.indexOf('-i');
  assert.equal(a[i + 1], '/x/crop.png');
  assert.ok(a[i + 2].startsWith('--'), '-i の画像の直後はフラグ');
  assert.ok(a.at(-1).includes('PROMPT'), '指示文は最後');
  assert.ok(!codexArgs('/d', 'P', null).includes('-i'), '画像が無ければ -i を付けない');
});

test('Codex の利用上限の応答は「画像が出なかった」と分けて投げる（2026-11-11）', async () => {
  const { generateWithCodexAsync, usageLimitMessage } = await import('../scripts/lib/codex-image.mjs');
  const stdout = '{"type":"error","message":"You’ve hit your usage limit. Visit https://chatgpt.com/settings/usage to purchase more credits or try again at 9:27 PM."}';
  assert.match(usageLimitMessage(stdout), /usage limit/);
  assert.equal(usageLimitMessage('{"type":"thread.started","thread_id":"x"}'), null);
  await assert.rejects(generateWithCodexAsync('p', null, { run: async () => stdout }), /利用上限/);
});

// 後片付け（2026-11-12）: 1 回ごとに残る会話記録と元画像を、画像を取り出したあとに消す。他の実行のものには触らない。
function fakeCodexHome() {
  const home = mkdtempSync(join(tmpdir(), 'codex-home-'));
  const imagesRoot = join(home, 'generated_images');
  const sessionsRoot = join(home, 'sessions');
  const mine = '01a1c7ef-2773-79b3-9dbe-b3633d047f03';
  const other = '01a1c7ef-2773-79b3-baf9-e31f8d7d7fe5';
  for (const id of [mine, other]) {
    mkdirSync(join(imagesRoot, id), { recursive: true });
    writeFileSync(join(imagesRoot, id, 'exec-x.png'), id === mine ? 'mine' : 'other');
  }
  mkdirSync(join(sessionsRoot, '2026/11/12'), { recursive: true });
  writeFileSync(join(sessionsRoot, `2026/11/12/rollout-2026-11-12T10-00-00-${mine}.jsonl`), '{}');
  writeFileSync(join(sessionsRoot, `2026/11/12/rollout-2026-11-12T10-00-01-${other}.jsonl`), '{}');
  return { home, imagesRoot, sessionsRoot, mine, other, stdout: `{"type":"thread.started","thread_id":"${mine}"}` };
}

test('画像を取り出したあと、その実行の会話記録と元画像だけを消す', () => {
  const h = fakeCodexHome();
  const out = mkdtempSync(join(tmpdir(), 'codex-out-'));
  const image = generateWithCodex('p', null, { run: () => h.stdout, tmp: out, imagesRoot: h.imagesRoot, sessionsRoot: h.sessionsRoot });
  assert.ok(image && readFileSync(image, 'utf8') === 'mine', '画像は取り出せている');
  assert.ok(!existsSync(join(h.imagesRoot, h.mine)), '自分の元画像は消える');
  assert.ok(!readdirSync(join(h.sessionsRoot, '2026/11/12')).some((f) => f.includes(h.mine)), '自分の会話記録は消える');
  assert.ok(existsSync(join(h.imagesRoot, h.other, 'exec-x.png')), '他の実行の元画像は残る');
  assert.equal(readdirSync(join(h.sessionsRoot, '2026/11/12')).length, 1, '他の実行の会話記録は残る');
});

test('DOBOKU_CODEX_KEEP_RUNS 相当（keep）・thread_id が読めないときは何も消さない', () => {
  const h = fakeCodexHome();
  assert.equal(forgetCodexRun(h.stdout, { imagesRoot: h.imagesRoot, sessionsRoot: h.sessionsRoot, keep: true }), 0);
  assert.equal(forgetCodexRun('{"type":"error"}', { imagesRoot: h.imagesRoot, sessionsRoot: h.sessionsRoot }), 0);
  assert.equal(forgetCodexRun('{"thread_id":"../.."}', { imagesRoot: h.imagesRoot, sessionsRoot: h.sessionsRoot }), 0);
  assert.ok(existsSync(join(h.imagesRoot, h.mine)));
});

test('利用上限で止まった実行も記録を消してから止める', async () => {
  const h = fakeCodexHome();
  const stdout = `${h.stdout}\n{"type":"error","message":"You've hit your usage limit. Try again later."}`;
  await assert.rejects(generateWithCodexAsync('p', null, { run: async () => stdout, imagesRoot: h.imagesRoot, sessionsRoot: h.sessionsRoot }), /利用上限/);
  assert.ok(!existsSync(join(h.imagesRoot, h.mine)));
});

test('画像を作らない問い合わせは会話記録を残さない（--ephemeral）', async () => {
  let seen = [];
  await askCodexAboutImages('q', ['/i.png'], { run: async (args) => { seen = args; return ''; } });
  assert.ok(seen.includes('--ephemeral'));
});
