import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { collectCandidates, judgePack, postState } from '../scripts/report-sns-archive-candidates.mjs';

const NOW = Date.parse('2026-11-18T00:00:00Z');
const CONFIG = { groups: [{ id: 'sns-archived-media', match: { pathRegex: '^content/sns/(instagram|youtube)/.+\\.(wav|mp4|m4a)$' } }] };

function put(root, rel, body, ageDays = 200) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body));
  const t = (NOW - ageDays * 86_400_000) / 1000;
  utimesSync(p, t, t);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'sns-arch-'));
  put(root, 'config/drive-vault.json', CONFIG);
  return root;
}

function pack(root, name, { sot = true, status = null, age = 200 } = {}) {
  const dir = `content/sns/instagram/q/${name}`;
  put(root, `${dir}/reels/a.wav`, 'wav', age);
  if (sot) { put(root, `${dir}/slide-data.json`, { slides: [1] }, age); put(root, `${dir}/reels/script.txt`, 's', age); }
  if (status) put(root, `${dir}/status.json`, status, age);
}

test('postState と judgePack の純関数', () => {
  assert.equal(postState({ carousel: { status: 'posted', posted_at: 'x' } }), 'posted');
  assert.equal(postState({ carousel: { status: 'scheduled', posted_at: null } }), 'scheduled');
  assert.equal(postState(null), 'none');
  assert.equal(judgePack({ problems: ['x'], state: 'posted', ageDays: 999 }).verdict, 'BLOCK');
  assert.equal(judgePack({ problems: [], state: 'none', ageDays: 10 }).verdict, 'KEEP_LOCAL');
});

test('SoT 無傷＋投稿済み＋古い → OFFLOAD / SoT 欠落 → BLOCK / 投稿予定 → ARCHIVE_KEEP / draft → KEEP_LOCAL', () => {
  const root = fixture();
  pack(root, 'done', { status: { carousel: { status: 'posted', posted_at: '2026-01-01' } } });
  pack(root, 'lost', { sot: false, status: { carousel: { status: 'posted', posted_at: '2026-01-01' } } });
  pack(root, 'soon', { status: { carousel: { status: 'scheduled', posted_at: null } } });
  pack(root, 'wip', { status: { carousel: { status: 'draft' } } });
  const { packs, error } = collectCandidates({ root, now: NOW });
  assert.equal(error, null);
  const v = Object.fromEntries(packs.map((p) => [p.pack.split('/').pop(), p.verdict]));
  assert.deepEqual(v, { done: 'OFFLOAD', lost: 'BLOCK', soon: 'ARCHIVE_KEEP', wip: 'KEEP_LOCAL' });
});

test('候補が 0 件は error なし（退避する物が無い）・group 定義が無ければ error', () => {
  const root = fixture();
  const r = collectCandidates({ root, now: NOW });
  assert.equal(r.packs.length, 0);
  assert.equal(r.error, null);
  const empty = mkdtempSync(join(tmpdir(), 'sns-arch-'));
  assert.ok(collectCandidates({ root: empty, now: NOW }).error);
});
