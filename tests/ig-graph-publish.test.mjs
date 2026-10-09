// ig-graph-publish.test.mjs — Instagram Graph API 投稿ライブラリと CLI の回帰テスト。
// fake fetchImpl でネットワークを一切叩かず、children→container→status polling→publish の
// 呼び出し順序・Authorization ヘッダ経由の token 送信・エラー分類・既投稿ガードを検証する。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createIgPublisher, buildCarouselPayloads, buildReelPayload, buildStoryPayload, mapGraphError, GraphApiError,
} from '../scripts/lib/ig-graph-publish.mjs';
import { assertLedgerNotPosted, run } from '../scripts/ig-graph-publish.mjs';

// ─── 純関数 ─────────────────────────────────────────────
test('buildCarouselPayloads: 2-10 枚は通り、1 枚/11 枚は拒否する', () => {
  const ok = buildCarouselPayloads({ imageUrls: ['a', 'b'], caption: 'cap' });
  assert.equal(ok.children.length, 2);
  assert.deepEqual(ok.children[0], { image_url: 'a', is_carousel_item: true });
  assert.equal(ok.container.media_type, 'CAROUSEL');
  assert.throws(() => buildCarouselPayloads({ imageUrls: ['only-one'], caption: '' }), /IG_GRAPH_CAROUSEL_COUNT/);
  assert.throws(() => buildCarouselPayloads({ imageUrls: Array.from({ length: 11 }, (_, i) => `u${i}`), caption: '' }), /IG_GRAPH_CAROUSEL_COUNT/);
});

test('buildReelPayload / buildStoryPayload', () => {
  assert.deepEqual(buildReelPayload({ videoUrl: 'v', caption: 'c' }), { media_type: 'REELS', video_url: 'v', caption: 'c' });
  assert.equal(buildReelPayload({ videoUrl: 'v', caption: 'c', coverUrl: 'cov' }).cover_url, 'cov');
  assert.throws(() => buildReelPayload({ caption: 'c' }), /videoUrl/);
  assert.deepEqual(buildStoryPayload({ imageUrl: 'i' }), { media_type: 'STORIES', image_url: 'i' });
  assert.deepEqual(buildStoryPayload({ videoUrl: 'v' }), { media_type: 'STORIES', video_url: 'v' });
  assert.throws(() => buildStoryPayload({}), /imageUrl か videoUrl/);
  assert.throws(() => buildStoryPayload({ imageUrl: 'i', videoUrl: 'v' }), /imageUrl か videoUrl/);
});

test('mapGraphError: 190=AUTH, 4/17/32=RATE, 9007/2207xxx=MEDIA, 他=UNKNOWN', () => {
  assert.equal(mapGraphError({ code: 190 }), 'AUTH');
  assert.equal(mapGraphError({ code: 4 }), 'RATE');
  assert.equal(mapGraphError({ code: 17 }), 'RATE');
  assert.equal(mapGraphError({ code: 32 }), 'RATE');
  assert.equal(mapGraphError({ code: 9007 }), 'MEDIA');
  assert.equal(mapGraphError({ code: 2207001 }), 'MEDIA');
  assert.equal(mapGraphError({ code: 999 }), 'UNKNOWN');
  assert.equal(mapGraphError({}), 'UNKNOWN');
});

// ─── createIgPublisher（fake fetch） ────────────────────
test('createCarousel: children→container→status polling(IN_PROGRESS→FINISHED)→publish の順で呼ばれ mediaId を返す', async () => {
  let statusPolls = 0;
  const seq = [];
  const manualFetch = async (url, init) => {
    const u = new URL(url);
    const body = init.body ? Object.fromEntries(new URLSearchParams(init.body.toString())) : undefined;
    seq.push({ method: init.method, path: u.pathname, headers: { ...init.headers }, body });
    assert.equal(init.headers.Authorization, 'Bearer TESTTOKEN');
    assert.equal(u.searchParams.get('access_token'), null); // token は URL に無い
    if (init.method === 'POST' && u.pathname.endsWith('/IGUSER/media') && body.is_carousel_item === 'true') {
      return { json: async () => ({ id: `CHILD_${seq.length}` }) };
    }
    if (init.method === 'POST' && u.pathname.endsWith('/IGUSER/media') && body.media_type === 'CAROUSEL') {
      return { json: async () => ({ id: 'CONTAINER1' }) };
    }
    if (init.method === 'GET' && u.pathname === '/v23.0/CONTAINER1') {
      statusPolls++;
      return { json: async () => ({ status_code: statusPolls === 1 ? 'IN_PROGRESS' : 'FINISHED' }) };
    }
    if (init.method === 'POST' && u.pathname.endsWith('/IGUSER/media_publish')) {
      assert.equal(body.creation_id, 'CONTAINER1');
      return { json: async () => ({ id: 'MEDIA1' }) };
    }
    throw new Error(`unhandled: ${init.method} ${u.pathname}`);
  };
  const publisher = createIgPublisher({
    token: 'TESTTOKEN', igUserId: 'IGUSER', fetchImpl: manualFetch, sleep: async () => {},
  });
  const result = await publisher.createCarousel({ imageUrls: ['https://x/1.png', 'https://x/2.png'], caption: 'cap' });
  assert.equal(result.mediaId, 'MEDIA1');
  assert.equal(result.containerId, 'CONTAINER1');
  assert.deepEqual(result.children, ['CHILD_1', 'CHILD_2']);
  assert.equal(statusPolls, 2); // IN_PROGRESS → FINISHED の2回
  // 順序: child, child, container, status×2, publish
  assert.deepEqual(seq.map((s) => s.method + ' ' + s.path), [
    'POST /v23.0/IGUSER/media',
    'POST /v23.0/IGUSER/media',
    'POST /v23.0/IGUSER/media',
    'GET /v23.0/CONTAINER1',
    'GET /v23.0/CONTAINER1',
    'POST /v23.0/IGUSER/media_publish',
  ]);
});

test('waitReady: status_code=ERROR は throw する', async () => {
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    if (init.method === 'GET' && u.pathname === '/v23.0/BADCONTAINER') return { json: async () => ({ status_code: 'ERROR' }) };
    throw new Error('unexpected');
  };
  const publisher = createIgPublisher({ token: 't', igUserId: 'u', fetchImpl, sleep: async () => {} });
  await assert.rejects(() => publisher.waitReady('BADCONTAINER'), /IG_GRAPH_MEDIA_ERROR/);
});

test('Graph API エラーレスポンスは GraphApiError として分類される', async () => {
  const fetchImpl = async () => ({ json: async () => ({ error: { code: 190, message: 'Invalid OAuth access token' } }) });
  const publisher = createIgPublisher({ token: 't', igUserId: 'u', fetchImpl });
  await assert.rejects(
    () => publisher.createReel({ videoUrl: 'https://x/v.mp4', caption: 'c' }),
    (err) => {
      assert.ok(err instanceof GraphApiError);
      assert.equal(err.kind, 'AUTH');
      assert.equal(err.code, 190);
      return true;
    },
  );
});

// ─── CLI run()（posted.json 既存 url は exit 2） ─────────
test('run(): posted.json に既に該当フォーマットの url があれば投稿せず exit 2', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ig-graph-publish-test-'));
  try {
    const carouselImgDir = join(dir, 'carousel', 'img');
    mkdirSync(carouselImgDir, { recursive: true });
    writeFileSync(join(carouselImgDir, '01.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(carouselImgDir, '02.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(dir, 'carousel', 'caption.txt'), 'キャプション本文');
    writeFileSync(join(dir, 'posted.json'), JSON.stringify({ carousel: { at: '2026-09-01', url: 'https://www.instagram.com/p/ALREADY/' }, reels: null, stories: null }));

    let stageCalled = false;
    const errors = [];
    const code = await run({
      argv: ['--pack', dir, '--format', 'carousel', '--commit'],
      env: { IG_GRAPH_ACCESS_TOKEN: 't', IG_BUSINESS_ACCOUNT_ID: 'u' },
      stage: async () => { stageCalled = true; return { files: [] }; },
      cleanup: async () => ({ deleted: 0 }),
      log: () => {},
      errorLog: (m) => errors.push(m),
    });
    assert.equal(code, 2);
    assert.equal(stageCalled, false);
    assert.ok(errors.some((m) => /IG_GRAPH_ALREADY_POSTED/.test(m)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('run(): --commit 無しは plan のみで exit 0・ステージングも投稿もしない', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ig-graph-publish-test-'));
  try {
    const carouselImgDir = join(dir, 'carousel', 'img');
    mkdirSync(carouselImgDir, { recursive: true });
    writeFileSync(join(carouselImgDir, '01.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(carouselImgDir, '02.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(dir, 'carousel', 'caption.txt'), 'キャプション本文');

    let stageCalled = false;
    const logs = [];
    const code = await run({
      argv: ['--pack', dir, '--format', 'carousel'],
      env: {},
      stage: async () => { stageCalled = true; return { files: [] }; },
      log: (m) => logs.push(m),
      errorLog: () => {},
    });
    assert.equal(code, 0);
    assert.equal(stageCalled, false);
    assert.ok(logs.some((m) => /plan/.test(m)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── 台帳への記録（DN-0611） ─────────────────────────────
test('run(): 公開したら recordLedger に permalink と投稿 ID を渡す。台帳が書けなければ exit 1（黙って成功にしない）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ig-graph-publish-test-'));
  try {
    mkdirSync(join(dir, 'carousel', 'img'), { recursive: true });
    for (const n of ['01.png', '02.png']) writeFileSync(join(dir, 'carousel', 'img', n), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(dir, 'carousel', 'caption.txt'), 'キャプション本文');
    const base = {
      argv: ['--pack', dir, '--format', 'carousel', '--commit'],
      env: { IG_GRAPH_ACCESS_TOKEN: 't', IG_BUSINESS_ACCOUNT_ID: 'u' },
      stage: async () => ({ files: [{ url: 'u1', file: '01.png' }, { url: 'u2', file: '02.png' }] }),
      cleanup: async () => ({ deleted: 0 }),
      createPublisher: () => ({
        createCarousel: async () => ({ mediaId: 'M123' }),
        getPermalink: async () => ({ permalink: 'https://www.instagram.com/p/ABC/' }),
      }),
      log: () => {},
      errorLog: () => {},
    };
    const calls = [];
    const ok = await run({ ...base, recordLedger: async (...a) => { calls.push(a.slice(1, 4)); } });
    assert.equal(ok, 0);
    assert.deepEqual(calls, [['carousel', 'https://www.instagram.com/p/ABC/', 'M123']]);
    rmSync(join(dir, 'posted.json'), { force: true });
    const ng = await run({ ...base, recordLedger: async () => { throw new Error('台帳に書けない'); } });
    assert.equal(ng, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── 台帳による二重投稿の防止・書き込み失敗時の後片付け（DN-0611） ──
test('assertLedgerNotPosted: published / scheduled は exit 2。行なし・approved は通る', () => {
  for (const status of ['published', 'scheduled']) {
    assert.throws(() => assertLedgerNotPosted({ id: 'x', status }, 'carousel'), (e) => e.exitCode === 2 && /IG_GRAPH_ALREADY_POSTED/.test(e.message));
  }
  assert.doesNotThrow(() => assertLedgerNotPosted(null, 'carousel'));
  assert.doesNotThrow(() => assertLedgerNotPosted({ id: 'x', status: 'approved' }, 'carousel'));
});

test('run(): 台帳が scheduled なら投稿せず exit 2。台帳書き込み失敗でも cleanup は走り復旧コマンドを出す', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ig-graph-publish-test-'));
  try {
    mkdirSync(join(dir, 'carousel', 'img'), { recursive: true });
    for (const n of ['01.png', '02.png']) writeFileSync(join(dir, 'carousel', 'img', n), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    writeFileSync(join(dir, 'carousel', 'caption.txt'), 'キャプション本文');
    let cleaned = 0;
    let staged = 0;
    const errors = [];
    const base = {
      argv: ['--pack', dir, '--format', 'carousel', '--commit'],
      env: { IG_GRAPH_ACCESS_TOKEN: 't', IG_BUSINESS_ACCOUNT_ID: 'u' },
      stage: async () => { staged++; return { files: [{ url: 'u1', file: '01.png' }, { url: 'u2', file: '02.png' }] }; },
      cleanup: async () => { cleaned++; return { deleted: 0 }; },
      createPublisher: () => ({
        createCarousel: async () => ({ mediaId: 'M123' }),
        getPermalink: async () => ({ permalink: 'https://www.instagram.com/p/ABC/' }),
      }),
      log: () => {},
      errorLog: (m) => errors.push(m),
    };
    const blocked = await run({ ...base, readLedger: async () => ({ id: 'x', status: 'scheduled' }) });
    assert.equal(blocked, 2);
    assert.equal(staged, 0);
    const ng = await run({ ...base, readLedger: async () => null, recordLedger: async () => { throw new Error('台帳に書けない'); } });
    assert.equal(ng, 1);
    assert.equal(cleaned, 1);
    assert.ok(errors.some((m) => /公開は済んだ・台帳は未更新/.test(m) && /ig-status\.mjs mark .* --url=https:\/\/www\.instagram\.com\/p\/ABC\//.test(m)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
