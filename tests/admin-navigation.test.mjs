import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * DN-0103 Phase 01: admin ナビの channel-registry 契約を固定する。
 *
 * channel-registry.ts は fs を import しない純粋モジュール（Nav.tsx が Client Component
 * から直接 import できることが前提）なので、tsx 経由で直接評価できる。
 * Nav.tsx 自体は 'use client' コンポーネントで React レンダリングテスト基盤が無いため、
 * ここではソース文字列で「発信」の残存とグループ構成を固定する。
 */

function tsx(code) {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  return execFileSync(process.execPath, [cli, '-e', code], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

test('channel id は重複しない', () => {
  const out = tsx(`
    import { ADMIN_CHANNELS } from './tools/admin-app/src/lib/channel-registry.ts';
    process.stdout.write(JSON.stringify(ADMIN_CHANNELS.map((c) => c.id)));
  `);
  const ids = JSON.parse(out);
  assert.deepEqual(ids, [...new Set(ids)]);
});

test('enabled channel の href は空欄でなく、href(+query) の複合key で重複しない', () => {
  const out = tsx(`
    import { enabledChannels } from './tools/admin-app/src/lib/channel-registry.ts';
    const tabs = enabledChannels().flatMap((c) => c.tabs);
    process.stdout.write(JSON.stringify(tabs.map((t) => ({
      href: t.href,
      key: t.href + '|' + JSON.stringify(t.query ?? {}),
    }))));
  `);
  const tabs = JSON.parse(out);
  for (const t of tabs) assert.ok(t.href && t.href.length > 0, 'href が空欄');
  const keys = tabs.map((t) => t.key);
  assert.deepEqual(keys, [...new Set(keys)], `href+query の複合key が重複: ${JSON.stringify(keys)}`);
});

test('brain channel は Phase 01 時点で disabled かつ tabs が空', () => {
  const out = tsx(`
    import { channelById } from './tools/admin-app/src/lib/channel-registry.ts';
    const brain = channelById('brain');
    process.stdout.write(JSON.stringify({ enabled: brain?.enabled, tabsLength: brain?.tabs.length }));
  `);
  assert.deepEqual(JSON.parse(out), { enabled: false, tabsLength: 0 });
});

test('X / Instagram の gallery/sns タブは query だけが異なり、pathname だけでは排他評価できる', () => {
  const out = tsx(`
    import { channelById } from './tools/admin-app/src/lib/channel-registry.ts';
    const x = channelById('x')!.tabs.find((t) => t.match === '/gallery/sns');
    const ig = channelById('instagram')!.tabs.find((t) => t.match === '/gallery/sns');
    process.stdout.write(JSON.stringify({ x: x?.query, ig: ig?.query }));
  `);
  const r = JSON.parse(out);
  assert.deepEqual(r.x, { ch: 'x' });
  assert.deepEqual(r.ig, { ch: 'instagram' });
  assert.notDeepEqual(r.x, r.ig);
});

test('contentSegmentLabel は sns/sources のような 1:1 でない物理セグメントもラベルを返す', () => {
  const out = tsx(`
    import { contentSegmentLabel } from './tools/admin-app/src/lib/channel-registry.ts';
    process.stdout.write(JSON.stringify({
      site: contentSegmentLabel('site'),
      note: contentSegmentLabel('note'),
      coconala: contentSegmentLabel('coconala'),
      kindle: contentSegmentLabel('kindle'),
      sns: contentSegmentLabel('sns'),
      sources: contentSegmentLabel('sources'),
      unknown: contentSegmentLabel('does-not-exist'),
    }));
  `);
  const r = JSON.parse(out);
  assert.equal(r.site, 'サイト');
  assert.equal(r.note, 'note');
  assert.equal(r.coconala, 'ココナラ');
  assert.equal(r.kindle, 'Kindle');
  assert.equal(r.sns, 'SNS');
  assert.equal(r.sources, '原典・入力資料');
  assert.equal(r.unknown, 'does-not-exist');
});

test('Nav.tsx に旧グループ名「発信」が残っていない', () => {
  const src = readFileSync(join(ROOT, 'tools/admin-app/src/components/Nav.tsx'), 'utf8');
  assert.ok(!src.includes('発信'), 'Nav.tsx に「発信」が残っている');
  assert.ok(src.includes("title: 'コンテンツ'"), 'Nav.tsx に「コンテンツ」グループが無い');
});

test('管理グループに /content が無く、コンテンツグループに /content が 1 つだけある', () => {
  const src = readFileSync(join(ROOT, 'tools/admin-app/src/components/Nav.tsx'), 'utf8');
  const adminGroupMatch = src.match(/title: '管理'[\s\S]*?entries: \[([\s\S]*?)\],\n {2}\},\n\];/);
  assert.ok(adminGroupMatch, '管理グループが見つからない');
  assert.ok(!adminGroupMatch[1].includes("href: '/content'"), '管理グループに /content が残っている');

  const contentGroupMatch = src.match(/title: 'コンテンツ'[\s\S]*?entries: \[([\s\S]*?)\n {4}\],\n {2}\},/);
  assert.ok(contentGroupMatch, 'コンテンツグループが見つからない');
  const occurrences = contentGroupMatch[1].match(/href: '\/content'/g) ?? [];
  assert.equal(occurrences.length, 1, `コンテンツグループの /content 件数が想定外: ${occurrences.length}`);
});
