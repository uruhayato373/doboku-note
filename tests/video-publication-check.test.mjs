// tests/video-publication-check.test.mjs
//
// check-video-publication（DN-0110 Phase 3 の最終ゲート）が
// 「照合していないのに published のまま」を確実に赤くするかを固定する。
//
// 一番危険なのは、公開済みなのに一度も実査しておらず、それでも緑が出続ける状態。
// state を差し替えたミニ環境で CLI を実行し、exit code と検出コードを検証する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * scripts/ と .claude/config を持つ最小環境を作り、state と record を差し替えて CLI を走らせる。
 * （CLI は自分の場所からリポジトリルートを決めるので、scripts をコピーした先が root になる）
 */
function runCheck({ state, record }) {
  const root = mkdtempSync(join(tmpdir(), 'vp-'));
  try {
    mkdirSync(join(root, 'scripts', 'lib'), { recursive: true });
    mkdirSync(join(root, '.claude', 'config'), { recursive: true });
    mkdirSync(join(root, '.claude', 'state'), { recursive: true });
    cpSync(join(ROOT, 'scripts', 'check-video-publication.mjs'), join(root, 'scripts', 'check-video-publication.mjs'));
    for (const lib of ['video-content-check.mjs', 'content-lifecycle.mjs']) {
      cpSync(join(ROOT, 'scripts', 'lib', lib), join(root, 'scripts', 'lib', lib));
    }
    cpSync(join(ROOT, '.claude', 'config', 'video-content.json'), join(root, '.claude', 'config', 'video-content.json'));
    writeFileSync(join(root, '.claude', 'state', 'video-content-status.json'), JSON.stringify(state));
    if (record) {
      writeFileSync(join(root, '.claude', 'state', 'video-publication-verify.json'), JSON.stringify(record));
    }
    let status = 0;
    let stdout = '';
    try {
      stdout = execFileSync(process.execPath, [join(root, 'scripts', 'check-video-publication.mjs'), '--json'], {
        encoding: 'utf8',
      });
    } catch (e) {
      status = e.status ?? 1;
      stdout = e.stdout ?? '';
    }
    return { status, result: JSON.parse(stdout) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const publishedState = {
  schemaVersion: 1,
  packs: {
    'demo-pack': {
      derivatives: {
        longform: { status: 'published', videoId: 'VID1', approvedBy: 'user' },
        shorts: [{ status: 'published', videoId: 'VID2', relatedVideoId: 'VID1', approvedBy: 'user' }],
      },
    },
  },
};

test('公開前（対象0件）は PASS だが、対象数を明示する', () => {
  const { status, result } = runCheck({
    state: { schemaVersion: 1, packs: { p: { derivatives: { longform: { status: 'draft' } } } } },
  });
  assert.equal(status, 0);
  assert.equal(result.targets, 0);
  assert.deepEqual(result.issues, []);
});

test('公開済みなのに照合記録が無い → V01 で FAIL（最も危険な偽の緑を止める）', () => {
  const { status, result } = runCheck({ state: publishedState });
  assert.equal(status, 1);
  assert.equal(result.targets, 2);
  assert.ok(result.issues.some((i) => i.code === 'V01'), JSON.stringify(result.issues));
});

test('記録が対象を網羅していない → V02', () => {
  const { status, result } = runCheck({
    state: publishedState,
    record: {
      schemaVersion: 1,
      verifiedAt: new Date().toISOString(),
      checked: 1,
      findings: [],
      entries: { 'demo-pack/longform': { ok: true, problems: [] } },
    },
  });
  assert.equal(status, 1);
  assert.ok(result.issues.some((i) => i.code === 'V02' && i.message.includes('shorts')));
});

test('記録が古い → V03（実査が止まっているのを surface する）', () => {
  const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { status, result } = runCheck({
    state: publishedState,
    record: {
      schemaVersion: 1,
      verifiedAt: old,
      checked: 2,
      findings: [],
      entries: {
        'demo-pack/longform': { ok: true, problems: [] },
        'demo-pack/shorts[0]': { ok: true, problems: [] },
      },
    },
  });
  assert.equal(status, 1);
  assert.ok(result.issues.some((i) => i.code === 'V03'));
  assert.ok(result.ageDays >= 29);
});

test('記録の孤児 → V04 / 実査のドリフト → V05', () => {
  const { status, result } = runCheck({
    state: publishedState,
    record: {
      schemaVersion: 1,
      verifiedAt: new Date().toISOString(),
      checked: 3,
      findings: [{ id: 'demo-pack/longform', code: 'cta_utm_missing', message: '概要欄に utm_campaign が無い' }],
      entries: {
        'demo-pack/longform': { ok: false, problems: [] },
        'demo-pack/shorts[0]': { ok: true, problems: [] },
        'gone-pack/longform': { ok: true, problems: [] },
      },
    },
  });
  assert.equal(status, 1);
  assert.ok(result.issues.some((i) => i.code === 'V04' && i.message.includes('gone-pack')));
  assert.ok(result.issues.some((i) => i.code === 'V05' && i.message.includes('cta_utm_missing')));
});

test('全て照合済み・新鮮・ドリフト無し → PASS', () => {
  const { status, result } = runCheck({
    state: publishedState,
    record: {
      schemaVersion: 1,
      verifiedAt: new Date().toISOString(),
      checked: 2,
      findings: [],
      entries: {
        'demo-pack/longform': { ok: true, problems: [] },
        'demo-pack/shorts[0]': { ok: true, problems: [] },
      },
    },
  });
  assert.equal(status, 0);
  assert.deepEqual(result.issues, []);
  assert.equal(result.recorded, 2);
});
